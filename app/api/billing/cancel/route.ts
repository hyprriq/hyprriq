import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

// Cancel-at-period-end (or resume) the current client's subscription. Never an
// immediate cancel — access continues until renewal_date, then it lapses to the
// 'expired' state via customer.subscription.deleted. The webhook is the source
// of truth; we also set billing_status optimistically so the UI updates now.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  let resume = false;
  try {
    const body = await req.json();
    resume = body?.resume === true;
  } catch {
    /* default: cancel */
  }

  const supa = createServerClient();
  const { data: client } = await supa
    .from("clients")
    .select("plan_category, stripe_subscription_id, billing_status")
    .eq("id", userId)
    .maybeSingle();

  if (!client?.stripe_subscription_id || client.plan_category !== "subscription") {
    return NextResponse.json(
      { error: "no_subscription", message: "No active subscription to change." },
      { status: 400 },
    );
  }

  try {
    await stripe.subscriptions.update(client.stripe_subscription_id, {
      cancel_at_period_end: !resume,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "stripe_error" }, { status: 500 });
  }

  // Optimistic local mirror (webhook will confirm). Only flip between the two
  // live states; never downgrade a past_due/cancelled row here.
  await supa
    .from("clients")
    .update({ billing_status: resume ? "active" : "cancelling" })
    .eq("id", userId)
    .in("billing_status", ["active", "cancelling"]);

  return NextResponse.json({ ok: true, cancelling: !resume });
}
