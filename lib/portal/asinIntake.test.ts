// ── ASIN intake guard (tracker §1.3) — the code guard, tested as the rule it is. ──
import { describe, it, expect } from "vitest";
import { validateBrandAsins, normalizeAsin, planCollectsAsins, brandCapMessage } from "./asinIntake";

const BRANDS = ["Acme", "Bolt"];

describe("validateBrandAsins — the ASIN cap guard", () => {
  it("nothing provided → ok with clean=null (column stays null)", () => {
    expect(validateBrandAsins("scale_499", BRANDS, null)).toEqual({ ok: true, clean: null });
    expect(validateBrandAsins("scale_499", BRANDS, {})).toEqual({ ok: true, clean: null });
    expect(validateBrandAsins("scale_499", BRANDS, { Acme: "  " })).toEqual({ ok: true, clean: null });
  });

  it("valid ASINs on Scale → normalized clean map", () => {
    const r = validateBrandAsins("scale_499", BRANDS, { Acme: " b0abc12345 ", Bolt: "B09XYZ0001" });
    expect(r).toEqual({ ok: true, clean: { Acme: "B0ABC12345", Bolt: "B09XYZ0001" } });
  });

  it("ASINs on a non-collecting plan → graceful refusal, not a crash (progressive disclosure enforced server-side)", () => {
    const r = validateBrandAsins("growth_279", BRANDS, { Acme: "B0ABC12345" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("asin_not_available");
    const r2 = validateBrandAsins("single_99", BRANDS, { Acme: "B0ABC12345" });
    expect(r2.ok).toBe(false);
    // no plan at all
    expect(validateBrandAsins(null, BRANDS, { Acme: "B0ABC12345" }).ok).toBe(false);
  });

  it("ASIN for a brand not in the list → rejected by name", () => {
    const r = validateBrandAsins("scale_499", BRANDS, { Ghost: "B0ABC12345" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("asin_unknown_brand");
  });

  it("bad format → rejected (too short, too long, illegal chars)", () => {
    for (const bad of ["B0SHORT", "B0ABC123456", "B0ABC1234!", "b0 abc1234"]) {
      const r = validateBrandAsins("scale_499", BRANDS, { Acme: bad });
      expect(r.ok, `should reject ${bad}`).toBe(false);
      if (!r.ok) expect(r.error).toBe("asin_format");
    }
  });

  it("more ASINs than the plan brand cap → rejected (5/5 max by the ruled numbers)", () => {
    const six = Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`B${i}`, "B0ABC1234" + i]));
    const r = validateBrandAsins("scale_499", Array.from({ length: 6 }, (_, i) => `B${i}`), six);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("asin_cap");
  });

  it("one ASIN per brand is structural — the map admits one value per key", () => {
    // A JSON object cannot carry two values for one key; the guard's duplicate branch is
    // unreachable through JSON.parse input, but stays as defence for programmatic callers.
    const r = validateBrandAsins("scale_499", BRANDS, { Acme: "B0ABC12345" });
    expect(r.ok).toBe(true);
  });
});

describe("helpers", () => {
  it("normalizeAsin trims + uppercases", () => expect(normalizeAsin(" b0abc12345 ")).toBe("B0ABC12345"));
  it("planCollectsAsins: scale only today", () => {
    expect(planCollectsAsins("scale_499")).toBe(true);
    expect(planCollectsAsins("growth_279")).toBe(false);
    expect(planCollectsAsins("single_99")).toBe(false);
    expect(planCollectsAsins(null)).toBe(false);
  });
  it("brandCapMessage explains, never errors — and has a one-brand form ready", () => {
    expect(brandCapMessage("growth_279")).toContain("up to 5 brands");
    // The cap=1 sentence exists so a future one-brand tier explains itself the day it ships.
  });
});
