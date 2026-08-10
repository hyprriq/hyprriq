import { describe, it, expect } from "vitest";
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
