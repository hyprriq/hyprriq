// ── GAP-CLOSE (2026-08-10): the /api/checkout/session STATE GUARD. The UI hides invalid
// purchases, but hiding is not enforcement — an active subscriber POSTing directly could create
// a SECOND Stripe subscription, or clobber their plan_type with a one-time purchase (activatePlan
// writes whatever plan checkout completes). FAIL CLOSED here, pre-Stripe:
//   · plan purchase while a subscription exists in any non-cancelled state → 409 (plan changes
//     and payment problems both live in the Stripe portal, where the existing subscription is).
//   · billing_status "cancelled" = the subscription is gone → plan purchase is the legitimate
//     reactivation path and stays open.
//   · top-ups are a subscription feature (mirrors TOPUPS_FOR_PLAN on the billing page) — a
//     one-time client or a cancelled subscriber gets a clear 409, never silent credits.
// Pure function so the rule is unit-tested without mocking Stripe/auth. ──
//
// ── SALE GATE (founder-locked 2026-08-22, money-surfaces ruling): sellability is checked
// BEFORE client state — an item that is not for sale is not for sale for anyone. Reads the ONE
// on-sale registry (lib/constants/plans.ts); the route applies this first, so no Stripe session
// can ever be created for a coming-soon tier or an off-sale top-up. ──

import { planOnSale, TOPUPS_ON_SALE, type PlanType } from "@/lib/constants/plans";

export type CheckoutSaleInput = { kind: "plan"; plan: PlanType } | { kind: "topup" };

export function checkoutSaleError(c: CheckoutSaleInput): CheckoutStateBlock | null {
  if (c.kind === "topup" && !TOPUPS_ON_SALE) {
    return {
      error: "topup_not_on_sale",
      status: 403,
      message: "Top-up packs aren't available right now.",
    };
  }
  if (c.kind === "plan" && !planOnSale(c.plan)) {
    return {
      error: "plan_not_on_sale",
      status: 403,
      message: "This plan isn't available for purchase yet — it's coming soon.",
    };
  }
  return null;
}

export type CheckoutStateInput = {
  kind: "plan" | "topup";
  planCategory: "one_time" | "subscription" | null;
  billingStatus: string | null;
};

export type CheckoutStateBlock = { error: string; message: string; status: number };

export function checkoutStateError(c: CheckoutStateInput): CheckoutStateBlock | null {
  const hasLiveSubscription = c.planCategory === "subscription" && c.billingStatus !== "cancelled";
  if (c.kind === "plan" && hasLiveSubscription) {
    return {
      error: "already_subscribed",
      status: 409,
      message:
        "You already have a subscription. Plan changes and payment updates are handled in Stripe — use Manage subscription on the Billing page.",
    };
  }
  if (c.kind === "topup" && !hasLiveSubscription) {
    return {
      error: "topup_requires_subscription",
      status: 409,
      message: "Top-up packs are part of the subscription plans. On a one-time plan, buy another report instead.",
    };
  }
  return null;
}
