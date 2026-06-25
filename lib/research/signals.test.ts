import { describe, it, expect } from "vitest";
import { deriveTrackSignal } from "./signals";

describe("deriveTrackSignal (code-derived, ADR-G003 weights)", () => {
  it("strong verifiable evidence → pass", () => {
    // 4 + 3 + 2 = 9 ≥ 8
    const r = deriveTrackSignal("supplier_identity", ["government_registration", "domain_age_5_plus", "address_verifiable"]);
    expect(r.signal).toBe("pass");
    expect(r.score_0_15).toBe(9);
  });
  it("partial evidence → infer (4–7)", () => {
    const r = deriveTrackSignal("supplier_identity", ["domain_age_2_5", "linkedin_company"]); // 2+2=4
    expect(r.signal).toBe("infer");
  });
  it("weak/negative evidence → flag", () => {
    const r = deriveTrackSignal("supplier_identity", ["phone_verifiable", "negative_reputation"]); // 1-3 → 0
    expect(r.signal).toBe("flag");
  });
  it("no recognized evidence → soft_fail (absence, not fraud)", () => {
    expect(deriveTrackSignal("supplier_identity", []).signal).toBe("soft_fail");
    expect(deriveTrackSignal("supplier_identity", ["unknown_tag"]).signal).toBe("soft_fail");
  });
  it("affirmative fraud → hard_fail regardless of other points", () => {
    const r = deriveTrackSignal("supplier_identity", ["government_registration", "registration_fabricated"]);
    expect(r.signal).toBe("hard_fail");
  });
  it("is deterministic and order-independent", () => {
    const a = deriveTrackSignal("brand_risk_assessment", ["reseller_friendly", "no_enforcement_found"]);
    const b = deriveTrackSignal("brand_risk_assessment", ["no_enforcement_found", "reseller_friendly"]);
    expect(a.signal).toBe(b.signal);
    expect(a.score_0_15).toBe(b.score_0_15);
  });
});
