import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { planForPriceId, topupForPriceId } from "@/lib/stripe/plans";
import { PLAN_CATEGORY, PLAN_CREDITS_PER_CYCLE, PLAN_ROLLOVER_LIMIT, type PlanType } from "@/lib/constants/plans";

// Stripe webhook — the source of truth for plan/credit state. SCAFFOLDING:
// signature verification, idempotency (stripe_events.stripe_event_id UNIQUE), and
// the core lifecycle events are wired. Inert until STRIPE_SECRET_KEY +
// STRIPE_WEBHOOK_SECRET + Price IDs are configured. Raw body is required for
// signature verification, so we read req.text() (no JSON parsing).

function iso(unixSeconds: number | null | undefined): string | null {
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;
}

async function activatePlan(clientId: string, plan: PlanType, opts: {
  customerId?: string | null;
  subscriptionId?: string | null;
  renewalDate?: string | null;
  email?: string | null;
}) {
  const fields = {
    plan_type: plan,
    plan_category: PLAN_CATEGORY[plan],
    credits_available: PLAN_CREDITS_PER_CYCLE[plan],
    billing_status: "active" as const,
    ...(opts.customerId ? { stripe_customer_id: opts.customerId } : {}),
    ...(opts.subscriptionId ? { stripe_subscription_id: opts.subscriptionId } : {}),
    ...(opts.renewalDate ? { renewal_date: opts.renewalDate } : {}),
  };
  const { data: updated } = await supabaseAdmin
    .from("clients")
    .update(fields)
    .eq("id", clientId)
    .select("id");
  // Row may not exist yet if the user paid before their first portal load (lazy
  // provisioning hasn't run). Create it so payment is never lost.
  if (!updated || updated.length === 0) {
    await supabaseAdmin.from("clients").insert({ id: clientId, email: opts.email ?? "", ...fields });
  }
}

async function addCredits(clientId: string, credits: number) {
  const { data } = await supabaseAdmin.from("clients").select("credits_available").eq("id", clientId).maybeSingle();
  const current = data?.credits_available ?? 0;
  await supabaseAdmin.from("clients").update({ credits_available: current + credits }).eq("id", clientId);
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event: Stripe.Event;
  try {
  event = stripe.webhooks.constructEvent(
    raw,
    sig ?? "",
    secret
  );
} catch (e) {
  console.error("WEBHOOK SIGNATURE ERROR:", e);

  return NextResponse.json(
    {
      error: e instanceof Error ? e.message : "invalid"
    },
    { status: 400 }
  );
}

  // Idempotency: the UNIQUE constraint on stripe_event_id rejects replays.
  const { error: dupeErr } = await supabaseAdmin
    .from("stripe_events")
    .insert({ stripe_event_id: event.id, event_type: event.type, payload_json: event as unknown as object });
  if (dupeErr) {
    // 23505 = unique violation = already processed → ack so Stripe stops retrying.
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const clientId = s.client_reference_id || (s.metadata?.client_id ?? null);
        if (!clientId) break;
        const customerId = typeof s.customer === "string" ? s.customer : s.customer?.id ?? null;
        const email = s.customer_details?.email ?? s.customer_email ?? null;
        const kind = s.metadata?.kind ?? "";

        if (kind.startsWith("topup:")) {
          const credits = Number(s.metadata?.credits ?? 0) || topupCreditsFromSession(s);
          if (credits > 0) await addCredits(clientId, credits);
          if (customerId) await supabaseAdmin.from("clients").update({ stripe_customer_id: customerId }).eq("id", clientId);
        } else if (s.mode === "subscription" && s.subscription) {
          const subId = typeof s.subscription === "string" ? s.subscription : s.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          const priceId = sub.items.data[0]?.price.id ?? "";
          const plan = planForPriceId(priceId);
          if (plan) {
            await activatePlan(clientId, plan, {
              customerId,
              subscriptionId: subId,
              renewalDate: iso((sub as unknown as { current_period_end: number }).current_period_end),
              email,
            });
          }
        } else {
          // one-time (Single Report)
          const plan = kind.startsWith("plan:") ? (kind.slice(5) as PlanType) : null;
          if (plan) await activatePlan(clientId, plan, { customerId, email });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const status = sub.status === "active" || sub.status === "trialing"
          ? "active"
          : sub.status === "past_due" || sub.status === "unpaid"
            ? "past_due"
            : "cancelled";
        await supabaseAdmin
          .from("clients")
          .update({ billing_status: status, renewal_date: iso((sub as unknown as { current_period_end: number }).current_period_end) })
          .eq("stripe_subscription_id", sub.id);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await supabaseAdmin.from("clients").update({ billing_status: "cancelled" }).eq("stripe_subscription_id", sub.id);
        break;
      }

      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice;
        // Only RENEWAL invoices roll credits over. The first invoice
        // (billing_reason 'subscription_create') is already handled by
        // checkout.session.completed — applying rollover here too would double-count.
        if (inv.billing_reason !== "subscription_cycle") break;

        const priceRef = inv.lines?.data?.[0]?.pricing?.price_details?.price;
        const priceId = typeof priceRef === "string" ? priceRef : priceRef?.id ?? "";
        const plan = priceId ? planForPriceId(priceId) : null;
        const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id ?? null;
        if (plan && customerId) {
          // Capped rollover (decision 2026-06-20): unused credits carry over up to
          // the plan's cap, then the new cycle's allotment is added on top.
          const { data } = await supabaseAdmin
            .from("clients")
            .select("credits_available")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();
          const unused = data?.credits_available ?? 0;
          const newBalance = Math.min(unused, PLAN_ROLLOVER_LIMIT[plan]) + PLAN_CREDITS_PER_CYCLE[plan];
          await supabaseAdmin
            .from("clients")
            .update({ credits_available: newBalance, credits_used_this_cycle: 0, billing_status: "active" })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id ?? null;
        if (customerId) await supabaseAdmin.from("clients").update({ billing_status: "past_due" }).eq("stripe_customer_id", customerId);
        break;
      }
    }

    await supabaseAdmin
      .from("stripe_events")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("stripe_event_id", event.id);

    return NextResponse.json({ received: true });
  } catch (e) {
    await supabaseAdmin
      .from("stripe_events")
      .update({ error: e instanceof Error ? e.message : "handler_error" })
      .eq("stripe_event_id", event.id);
    return NextResponse.json({ error: "handler_error" }, { status: 500 });
  }
}

// Top-up credit count resolved from the line item's price when metadata is absent.
function topupCreditsFromSession(s: Stripe.Checkout.Session): number {
  const priceId = (s.metadata?.price_id as string) || "";
  const t = priceId ? topupForPriceId(priceId) : null;
  return t?.credits ?? 0;
}
