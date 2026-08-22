import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { creditsForPaidTopup, planForPaidPrice, planForPaidKind, PLAN_PRICE_ENV } from "./plans";

// ── THE B2 LAW, FIXTURE-ENFORCED (founder-locked 2026-08-22, item 3c): "a paid top-up that
// fails to land must fail loud" was a comment; these fixtures make it a fact. On every PAID
// path, a lookup miss THROWS — never a zero, never a null, never a skip. The webhook imports
// these helpers and nothing else resolves paid lookups; the throw lands in stripe_events.error
// and Stripe retries, visible like every other money failure.

const ENV_KEYS = [...Object.values(PLAN_PRICE_ENV)];
let saved: Record<string, string | undefined>;
beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
  process.env.STRIPE_PRICE_GROWTH_279 = "price_growth_test";
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("creditsForPaidTopup — the ?? 0 that kept the money is dead", () => {
  it("known packs resolve to their real credit counts", () => {
    expect(creditsForPaidTopup("growth_topup")).toBe(3);
    expect(creditsForPaidTopup("scale_topup")).toBe(6);
  });
  it("THE FOUNDER'S CASE: an unrecognized id on a PAID session throws — never a silent zero", () => {
    expect(() => creditsForPaidTopup("mega_topup")).toThrow(/B2: unrecognized top-up id/);
    expect(() => creditsForPaidTopup("")).toThrow(/B2/);
    // Prototype-pollution shape: an id that exists on Object.prototype must not resolve.
    expect(() => creditsForPaidTopup("constructor")).toThrow(/B2/);
  });
});

describe("planForPaidPrice — a paid subscription/renewal must provision or scream", () => {
  it("a mapped price resolves", () => {
    expect(planForPaidPrice("price_growth_test")).toBe("growth_279");
  });
  it("an unmapped or empty price throws with the env pointer — money accepted, nothing would provision", () => {
    expect(() => planForPaidPrice("price_from_the_dashboard")).toThrow(/B2: no plan maps to price/);
    expect(() => planForPaidPrice("")).toThrow(/STRIPE_PRICE_\* env mapping/);
  });
  it("an UNSET env var never matches an empty-string price (the absent-env trap)", () => {
    // With every env deleted except growth, "" must not accidentally equal an undefined env read.
    expect(() => planForPaidPrice("")).toThrow(/B2/);
  });
});

describe("planForPaidKind — an unattributable paid one-time session is a failure, not an ACK", () => {
  it("every registered plan round-trips through its metadata kind", () => {
    for (const p of Object.keys(PLAN_PRICE_ENV)) {
      expect(planForPaidKind(`plan:${p}`)).toBe(p);
    }
  });
  it("garbage, absent, truncated, and fabricated kinds all throw", () => {
    for (const kind of ["", "plan:", "plan:mega_999", "topup", "PLAN:single_99", "plan:single_99 "]) {
      expect(() => planForPaidKind(kind), JSON.stringify(kind)).toThrow(/B2: unattributable PAID checkout/);
    }
  });
  it("a plan name that is an Object.prototype key must not resolve", () => {
    expect(() => planForPaidKind("plan:toString")).toThrow(/B2/);
  });
});
