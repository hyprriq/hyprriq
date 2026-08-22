import { describe, it, expect } from "vitest";
import { checkoutSaleError } from "./checkoutGuard";

// ── SALE GATE (founder-locked 2026-08-22): sellability precedes state — refused for everyone,
// whatever the UI showed. The route applies this before checkoutStateError.
describe("checkoutSaleError — the route is the control, not the page", () => {
  it("coming-soon tiers are refused with the honest message", () => {
    for (const plan of ["single_149", "scale_499"] as const) {
      const r = checkoutSaleError({ kind: "plan", plan });
      expect(r).toMatchObject({ error: "plan_not_on_sale", status: 403 });
      expect(r?.message).toBe("This plan isn't available for purchase yet — it's coming soon.");
    }
  });

  it("on-sale tiers pass", () => {
    for (const plan of ["single_99", "growth_279"] as const) {
      expect(checkoutSaleError({ kind: "plan", plan })).toBeNull();
    }
  });

  it("top-ups are refused while off sale — for every client, including active subscribers", () => {
    const r = checkoutSaleError({ kind: "topup" });
    expect(r).toMatchObject({ error: "topup_not_on_sale", status: 403 });
    expect(r?.message).toBe("Top-up packs aren't available right now.");
  });
});
import { checkoutStateError } from "./checkoutGuard";

describe("checkoutStateError — the /api/checkout/session state guard (gap-close 2026-08-10)", () => {
  it("active subscriber buying ANY plan → 409 already_subscribed (second-subscription trap)", () => {
    const r = checkoutStateError({ kind: "plan", planCategory: "subscription", billingStatus: "active" });
    expect(r).toMatchObject({ error: "already_subscribed", status: 409 });
  });

  it("active subscriber buying a ONE-TIME plan → 409 (the plan_type clobber trap)", () => {
    const r = checkoutStateError({ kind: "plan", planCategory: "subscription", billingStatus: "active" });
    expect(r).not.toBeNull();
  });

  it("cancelling subscriber (access until period end) is still blocked from a second plan", () => {
    const r = checkoutStateError({ kind: "plan", planCategory: "subscription", billingStatus: "cancelling" });
    expect(r).toMatchObject({ error: "already_subscribed", status: 409 });
  });

  it("past_due subscriber is blocked — the fix is Stripe, not a second checkout", () => {
    const r = checkoutStateError({ kind: "plan", planCategory: "subscription", billingStatus: "past_due" });
    expect(r).toMatchObject({ error: "already_subscribed", status: 409 });
  });

  it("CANCELLED subscriber may buy a plan again (reactivation path stays open)", () => {
    expect(checkoutStateError({ kind: "plan", planCategory: "subscription", billingStatus: "cancelled" })).toBeNull();
  });

  it("one-time client may buy a plan (rebuy / upgrade-to-subscription)", () => {
    expect(checkoutStateError({ kind: "plan", planCategory: "one_time", billingStatus: "active" })).toBeNull();
  });

  it("fresh client with no plan may buy a plan", () => {
    expect(checkoutStateError({ kind: "plan", planCategory: null, billingStatus: null })).toBeNull();
  });

  it("top-up requires an active subscription — one-time client blocked (server rule, not UI hiding)", () => {
    const r = checkoutStateError({ kind: "topup", planCategory: "one_time", billingStatus: "active" });
    expect(r).toMatchObject({ error: "topup_requires_subscription", status: 409 });
  });

  it("top-up blocked for a cancelled subscriber (cycle over)", () => {
    const r = checkoutStateError({ kind: "topup", planCategory: "subscription", billingStatus: "cancelled" });
    expect(r).toMatchObject({ error: "topup_requires_subscription", status: 409 });
  });

  it("top-up allowed for an active subscriber", () => {
    expect(checkoutStateError({ kind: "topup", planCategory: "subscription", billingStatus: "active" })).toBeNull();
  });
});
