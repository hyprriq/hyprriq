import { describe, it, expect } from "vitest";
import { isLiveStripeKey, liveKeyPermitted, assertStripeKeyMatchesEnvironment } from "@/lib/billing/envGuard";

describe("live-key detection — key shapes beyond the obvious one", () => {
  it("sk_live_ and rk_live_ (restricted live keys) are both live", () => {
    expect(isLiveStripeKey("sk_live_abc123")).toBe(true);
    expect(isLiveStripeKey("rk_live_abc123")).toBe(true);
  });
  it("test keys, empty, and absent are not live", () => {
    expect(isLiveStripeKey("sk_test_abc123")).toBe(false);
    expect(isLiveStripeKey("rk_test_abc123")).toBe(false);
    expect(isLiveStripeKey("")).toBe(false);
    expect(isLiveStripeKey(null)).toBe(false);
    expect(isLiveStripeKey(undefined)).toBe(false);
  });
  it("a key merely CONTAINING sk_live_ mid-string is not live — the prefix is the contract", () => {
    expect(isLiveStripeKey("test_sk_live_lookalike")).toBe(false);
  });
});

describe("the rule: live keys run ONLY in Vercel Production", () => {
  it("live + production → permitted", () => {
    expect(liveKeyPermitted({ key: "sk_live_x", vercelEnv: "production" })).toBe(true);
    expect(() => assertStripeKeyMatchesEnvironment({ key: "sk_live_x", vercelEnv: "production" })).not.toThrow();
  });
  it("live + preview → REFUSED (the deploy that motivated the tracker's 'business-ending risk')", () => {
    expect(liveKeyPermitted({ key: "sk_live_x", vercelEnv: "preview" })).toBe(false);
    expect(() => assertStripeKeyMatchesEnvironment({ key: "sk_live_x", vercelEnv: "preview" })).toThrow(/live-mode key/i);
  });
  it("live + local (VERCEL_ENV undefined) → REFUSED — a laptop can charge real cards too", () => {
    expect(liveKeyPermitted({ key: "sk_live_x", vercelEnv: undefined })).toBe(false);
    expect(() => assertStripeKeyMatchesEnvironment({ key: "sk_live_x", vercelEnv: undefined })).toThrow(/local/);
  });
  it("live + development env → REFUSED", () => {
    expect(liveKeyPermitted({ key: "sk_live_x", vercelEnv: "development" })).toBe(false);
  });
  it("⚠ NODE_ENV must play no part: previews build with NODE_ENV=production — only VERCEL_ENV decides", () => {
    // The guard's input carries no NODE_ENV at all; this pins that a preview (VERCEL_ENV=preview)
    // refuses regardless of what NODE_ENV would have said.
    expect(liveKeyPermitted({ key: "sk_live_x", vercelEnv: "preview" })).toBe(false);
  });
  it("test keys are permitted everywhere, including production (pre-live-cutover state)", () => {
    for (const env of ["production", "preview", "development", undefined]) {
      expect(liveKeyPermitted({ key: "sk_test_x", vercelEnv: env })).toBe(true);
    }
  });
  it("no key is permitted everywhere — the key-safe lazy design stays intact", () => {
    expect(liveKeyPermitted({ key: null, vercelEnv: undefined })).toBe(true);
  });
});
