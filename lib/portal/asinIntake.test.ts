// ── ASIN intake guard (tracker §1.3) + KEEPA GATING (founder-ruled 2026-08-07; flag FLIPPED
// 2026-09-08 with the stage-1 integration landing): eligible plans collect, ineligible plans
// fail closed, and the roster lock below binds eligibility to categoryStep's CATEGORY_PLANS. ──
import { describe, it, expect } from "vitest";
import { validateBrandAsins, normalizeAsin, planCollectsAsins, brandCapMessage, asinEligiblePlanNames, PLAN_ASIN_ELIGIBLE, ASIN_RE } from "./asinIntake";
import { KEEPA_LIVE, PLAN_BRAND_CAPS, PLAN_TYPES } from "@/lib/constants/plans";
import { CATEGORY_PLANS } from "@/lib/research/categoryStep";

const BRANDS = ["Acme", "Bolt"];

describe("KEEPA gating — flag first, plan second (flag FLIPPED 2026-09-08)", () => {
  it("KEEPA_LIVE is TRUE — the integration landed 2026-09-08 (stage-1 marketplace history, proven on AWI-2609-047) and the founder ordered collection", () => {
    expect(KEEPA_LIVE).toBe(true);
  });

  it("with the flag on, exactly the ELIGIBLE plans collect ASINs", () => {
    expect(planCollectsAsins("scale_499")).toBe(true);
    expect(planCollectsAsins("single_149")).toBe(true);
    expect(planCollectsAsins("growth_279")).toBe(false);
    expect(planCollectsAsins("single_99")).toBe(false);
    expect(planCollectsAsins(null)).toBe(false);
  });

  it("the ELIGIBILITY map: single_149 + scale_499 only", () => {
    expect(PLAN_ASIN_ELIGIBLE).toEqual({
      single_99: false, single_149: true, growth_279: false, scale_499: true,
    });
  });

  it("guard: ineligible plans providing ASINs are refused gracefully (fail closed)", () => {
    for (const plan of ["growth_279", "single_99"] as const) {
      const r = validateBrandAsins(plan, BRANDS, { Acme: "B0ABC12345" });
      expect(r.ok, plan).toBe(false);
      if (!r.ok) expect(r.error).toBe("asin_not_available");
    }
  });

  it("eligible plans with a valid ASIN pass — one per brand, normalized", () => {
    const r = validateBrandAsins("single_149", BRANDS, { Acme: " b0abc12345 " });
    expect(r).toEqual({ ok: true, clean: { Acme: "B0ABC12345" } });
  });

  it("nothing provided → ok with clean=null regardless of flag (the column stays null)", () => {
    expect(validateBrandAsins("scale_499", BRANDS, null)).toEqual({ ok: true, clean: null });
    expect(validateBrandAsins("scale_499", BRANDS, { Acme: "  " })).toEqual({ ok: true, clean: null });
  });
});

describe("the pure pieces stay proven for the flip day", () => {
  it("normalizeAsin trims + uppercases; ASIN_RE is 10 alnum", () => {
    expect(normalizeAsin(" b0abc12345 ")).toBe("B0ABC12345");
    expect(ASIN_RE.test("B0ABC12345")).toBe(true);
    for (const bad of ["B0SHORT", "B0ABC123456", "B0ABC1234!"]) expect(ASIN_RE.test(bad), bad).toBe(false);
  });

  it("brandCapMessage reads the ruled ladder (2026-08-07): singles 3, subscriptions 5", () => {
    expect(PLAN_BRAND_CAPS.single_99).toBe(3);
    expect(PLAN_BRAND_CAPS.single_149).toBe(3);
    expect(brandCapMessage("single_99")).toContain("up to 3 brands");
    expect(brandCapMessage("growth_279")).toContain("up to 5 brands");
  });
});

// ── THE ROSTER LOCK (founder-ordered 2026-09-08, with the derived-message fix): the client-
// importable eligibility map and the research-side CATEGORY_PLANS are the SAME ruling stated in
// two boundary-separated files. This lock is why they can never drift — and why the refusal
// message may derive from PLAN_ASIN_ELIGIBLE without retyping the tier list. ──
describe("PLAN_ASIN_ELIGIBLE ≡ CATEGORY_PLANS (both directions) and the derived message", () => {
  it("the eligible set equals categoryStep's CATEGORY_PLANS exactly", () => {
    const eligible = PLAN_TYPES.filter((p) => PLAN_ASIN_ELIGIBLE[p]).sort();
    expect(eligible).toEqual([...CATEGORY_PLANS].sort());
  });

  it("the refusal message names EVERY eligible tier — the old string said Scale only while single_149 was eligible", () => {
    const names = asinEligiblePlanNames();
    expect(names).toContain("Single Deep Report");
    expect(names).toContain("Scale");
    const check = validateBrandAsins("single_99", BRANDS, { Acme: "B0ABC12345" });
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.message).toContain(names);
  });
});
