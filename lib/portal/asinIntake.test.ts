// ── ASIN intake guard (tracker §1.3) + KEEPA GATING (founder-ruled 2026-08-07): while
// KEEPA_LIVE is false, NO plan collects ASINs — the form cannot quietly collect a field
// nothing consumes. The eligibility map + guard rules are tested so the day the flag flips,
// behavior is already proven. ──
import { describe, it, expect } from "vitest";
import { validateBrandAsins, normalizeAsin, planCollectsAsins, brandCapMessage, PLAN_ASIN_ELIGIBLE, ASIN_RE } from "./asinIntake";
import { KEEPA_LIVE, PLAN_BRAND_CAPS } from "@/lib/constants/plans";

const BRANDS = ["Acme", "Bolt"];

describe("KEEPA gating (2026-08-07) — flag first, plan second", () => {
  it("KEEPA_LIVE is FALSE today — Keepa is scheduled, not integrated", () => {
    expect(KEEPA_LIVE).toBe(false);
  });

  it("while the flag is false, NO plan collects ASINs — including the eligible ones", () => {
    expect(planCollectsAsins("scale_499")).toBe(false);
    expect(planCollectsAsins("single_149")).toBe(false);
    expect(planCollectsAsins("growth_279")).toBe(false);
    expect(planCollectsAsins("single_99")).toBe(false);
    expect(planCollectsAsins(null)).toBe(false);
  });

  it("the ELIGIBILITY map is ready for the flip: single_149 + scale_499 only", () => {
    expect(PLAN_ASIN_ELIGIBLE).toEqual({
      single_99: false, single_149: true, growth_279: false, scale_499: true,
    });
  });

  it("guard: with the flag off, providing ASINs on ANY plan is refused gracefully (fail closed)", () => {
    for (const plan of ["scale_499", "single_149", "growth_279", "single_99"] as const) {
      const r = validateBrandAsins(plan, BRANDS, { Acme: "B0ABC12345" });
      expect(r.ok, plan).toBe(false);
      if (!r.ok) expect(r.error).toBe("asin_not_available");
    }
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
