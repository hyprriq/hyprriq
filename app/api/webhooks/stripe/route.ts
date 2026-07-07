import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { planForPriceId, TOPUP, type TopupId } from "@/lib/stripe/plans";
import { PLAN_CATEGORY, PLAN_CREDITS_PER_CYCLE, type PlanType } from "@/lib/constants/plans";
import { addClientCredits, rolloverClientCredits } from "@/lib/data/credits";

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

// Item 5: append a Billing History row on every plan-state change. Idempotent by
// construction — duplicate Stripe events are rejected at the stripe_events gate
// above, so each event reaches this handler (and writes here) at most once.
type BillingEvent = "upgrade" | "downgrade" | "cancel" | "resume" | "new_subscription" | "one_time_purchase";
async function recordBillingEvent(clientId: string, e: {
  event: BillingEvent;
  oldPlan?: string | null;
  newPlan?: string | null;
  stripeEventId?: string | null;
  notes?: string | null;
}) {
  await supabaseAdmin.from("billing_audit").insert({
    client_id: clientId,
    old_plan: e.oldPlan ?? null,
    new_plan: e.newPlan ?? null,
    event: e.event,
    stripe_event_id: e.stripeEventId ?? null,
    source: "stripe",
    notes: e.notes ?? null,
  });
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

  // Idempotency: the UNIQUE constraint on stripe_event_id rejects replays — but ONLY a replay of a
  // COMPLETED event is ACKed (B3). A duplicate whose first attempt error'd before processed=true is
  // REPROCESSED (handlers are idempotent-by-upsert; the credit RPCs have a one-statement residual
  // window documented in the H6 plan — billing_audit keeps it auditable).
  const { error: dupeErr } = await supabaseAdmin
    .from("stripe_events")
    .insert({ stripe_event_id: event.id, event_type: event.type, payload_json: event as unknown as object });
  if (dupeErr) {
    const { data: prior } = await supabaseAdmin
      .from("stripe_events").select("processed").eq("stripe_event_id", event.id).maybeSingle();
    if (prior?.processed) return NextResponse.json({ received: true, duplicate: true });
    // fall through: prior attempt never completed — process it now.
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
          const topupId = kind.slice("topup:".length) as TopupId;
          const credits = TOPUP[topupId]?.credits ?? 0;
          if (credits > 0) {
            const { error: creditErr } = await addClientCredits(clientId, credits);
            // B2 — a paid top-up that fails to land must FAIL LOUD: throw → stripe_events.error is
            // written below → Stripe retries → the unprocessed-duplicate path reprocesses (B3 fix).
            if (creditErr) throw new Error(`top-up credit grant failed: ${creditErr}`);
          }
          if (customerId) await supabaseAdmin.from("clients").update({ stripe_customer_id: customerId }).eq("id", clientId);
          await recordBillingEvent(clientId, { event: "one_time_purchase", stripeEventId: event.id, notes: `Top-up: ${credits} credit${credits === 1 ? "" : "s"}` });
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
            await recordBillingEvent(clientId, { event: "new_subscription", newPlan: plan, stripeEventId: event.id });
          }
        } else {
          // one-time (Single Report)
          const plan = kind.startsWith("plan:") ? (kind.slice(5) as PlanType) : null;
          if (plan) {
            await activatePlan(clientId, plan, { customerId, email });
            await recordBillingEvent(clientId, { event: "one_time_purchase", newPlan: plan, stripeEventId: event.id });
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const live = sub.status === "active" || sub.status === "trialing";
        // cancel_at_period_end on a still-live sub = "cancelling": access stays
        // until period end, but it won't renew. Distinct from a hard 'cancelled'.
        const status = live
          ? sub.cancel_at_period_end
            ? "cancelling"
            : "active"
          : sub.status === "past_due" || sub.status === "unpaid"
            ? "past_due"
            : "cancelled";
        // Read prior state first so we only log a Billing History row on an actual
        // transition (subscription.updated fires for many non-status changes).
        const { data: prior } = await supabaseAdmin
          .from("clients")
          .select("id, billing_status, plan_type")
          .eq("stripe_subscription_id", sub.id)
          .maybeSingle();
        await supabaseAdmin
          .from("clients")
          .update({ billing_status: status, renewal_date: iso((sub as unknown as { current_period_end: number }).current_period_end) })
          .eq("stripe_subscription_id", sub.id);
        if (prior && prior.billing_status !== status) {
          if (status === "cancelling") {
            await recordBillingEvent(prior.id, { event: "cancel", oldPlan: prior.plan_type, newPlan: prior.plan_type, stripeEventId: event.id, notes: "Scheduled cancellation at period end" });
          } else if (status === "active" && prior.billing_status === "cancelling") {
            await recordBillingEvent(prior.id, { event: "resume", oldPlan: prior.plan_type, newPlan: prior.plan_type, stripeEventId: event.id, notes: "Cancellation reversed" });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const { data: prior } = await supabaseAdmin
          .from("clients")
          .select("id, plan_type")
          .eq("stripe_subscription_id", sub.id)
          .maybeSingle();
        await supabaseAdmin.from("clients").update({ billing_status: "cancelled" }).eq("stripe_subscription_id", sub.id);
        if (prior) {
          await recordBillingEvent(prior.id, { event: "cancel", oldPlan: prior.plan_type, stripeEventId: event.id, notes: "Subscription ended" });
        }
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
          // Capped rollover (decision 2026-06-20), now ATOMIC (N6): unused credits carry over up
          // to the plan's cap, then the cycle's allotment lands on top — one SQL statement, no
          // read-modify-write window against a concurrent submit deduction.
          const { error: rolloverErr } = await rolloverClientCredits(customerId, plan);
          if (rolloverErr) throw new Error(`renewal rollover failed: ${rolloverErr}`);
          await supabaseAdmin.from("clients").update({ billing_status: "active" }).eq("stripe_customer_id", customerId);
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
