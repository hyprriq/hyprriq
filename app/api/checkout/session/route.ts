import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { priceIdForPlan, topupPriceId, type TopupId } from "@/lib/stripe/plans";
import { PLAN_CATEGORY, PLAN_TYPES, type PlanType } from "@/lib/constants/plans";
import { checkoutStateError, checkoutSaleError } from "@/lib/billing/checkoutGuard";

// Creates a Stripe Checkout Session for a plan purchase or a credit top-up and
// returns its URL for the browser to redirect to. SCAFFOLDING: fully wired except
// the Stripe Price IDs, which arrive via env (lib/stripe/plans.ts). Until the
// price env + STRIPE_SECRET_KEY are set, returns 503 — never a broken redirect.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "stripe_not_configured", message: "Checkout isn't available yet." }, { status: 503 });
  }

  let body: { plan?: string; topup?: string; redirect?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  // Onboarding checkout returns to onboarding (so the flow can resume at the plan
  // step); everything else returns to dashboard/billing.
  const toOnboarding = body.redirect === "onboarding";

  const isTopup = !!body.topup;
  const plan = body.plan as PlanType | undefined;
  if (!isTopup && (!plan || !PLAN_TYPES.includes(plan))) {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  }

  // ── SALE GATE FIRST (founder-locked 2026-08-22): the page hiding a button is not a control —
  // THIS is. Coming-soon tiers and off-sale top-ups are refused before any Stripe call, for
  // every caller, whatever the UI showed. Rule + fixtures: lib/billing/checkoutGuard. ──
  const offSale = checkoutSaleError(isTopup ? { kind: "topup" } : { kind: "plan", plan: plan as PlanType });
  if (offSale) {
    return NextResponse.json({ error: offSale.error, message: offSale.message }, { status: offSale.status });
  }

  const price = isTopup
    ? topupPriceId(body.topup as TopupId)
    : priceIdForPlan(plan as PlanType);
  if (!price) {
    return NextResponse.json(
      { error: "price_not_configured", message: "This item isn't available for purchase yet." },
      { status: 503 },
    );
  }

  // Reuse an existing Stripe customer if the client already has one.
  const supa = createServerClient();
  const { data: client } = await supa
    .from("clients")
    .select("email, stripe_customer_id, plan_category, billing_status")
    .eq("id", userId)
    .maybeSingle();

  // ── STATE GUARD (gap-close 2026-08-10) — fail closed BEFORE Stripe: an active subscriber
  // POSTing directly must never create a second subscription or clobber plan_type with a
  // one-time purchase; top-ups are a subscription feature. Rule + tests: lib/billing/checkoutGuard. ──
  const blocked = checkoutStateError({
    kind: isTopup ? "topup" : "plan",
    planCategory: (client?.plan_category as "one_time" | "subscription" | null) ?? null,
    billingStatus: (client?.billing_status as string | null) ?? null,
  });
  if (blocked) {
    return NextResponse.json({ error: blocked.error, message: blocked.message }, { status: blocked.status });
  }

  const origin = new URL(req.url).origin;
  // Subscriptions for the monthly plans; one-time payment for Single Report + top-ups.
  const mode: "subscription" | "payment" =
    !isTopup && plan && PLAN_CATEGORY[plan] === "subscription" ? "subscription" : "payment";

  try {
    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price, quantity: 1 }],
      client_reference_id: userId,
      ...(client?.stripe_customer_id
        ? { customer: client.stripe_customer_id }
        : { customer_email: client?.email ?? undefined }),
      // The webhook is the source of truth; metadata lets it attribute the event.
      metadata: { client_id: userId, kind: isTopup ? `topup:${body.topup}` : `plan:${plan}` },
      ...(mode === "subscription"
        ? { subscription_data: { metadata: { client_id: userId } } }
        // One-time payments don't create an Invoice by default; enable it so
        // top-ups + Single Report show in Billing's Invoice History (which reads
        // invoices.list).
        : { invoice_creation: { enabled: true } }),
      success_url: `${origin}/portal/${toOnboarding ? "onboarding" : "dashboard"}?checkout=success`,
      cancel_url: `${origin}/portal/${toOnboarding ? "onboarding" : "billing"}?checkout=cancelled`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "stripe_error" }, { status: 500 });
  }
}
