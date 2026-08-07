// ── VERIFIED / ASSESSED (2026-08-07) — the ruled two-value derivation, locked. ──
import { describe, it, expect } from "vitest";
import { deriveClientCertainty } from "./certainty";

describe("deriveClientCertainty — Verified iff any evidence item is LLM-certainty 'verified'", () => {
  it("one verified item among many → verified", () => {
    expect(deriveClientCertainty([
      { certainty: "inferred" }, { certainty: "unknown" }, { certainty: "verified" },
    ])).toBe("verified");
  });

  it("only inferred/unknown items → assessed (never 'unconfirmed', never doubt)", () => {
    expect(deriveClientCertainty([{ certainty: "inferred" }, { certainty: "unknown" }])).toBe("assessed");
  });

  it("ABSENCE RULE: no evidence at all → assessed, never a negative", () => {
    expect(deriveClientCertainty([])).toBe("assessed");
    expect(deriveClientCertainty(null)).toBe("assessed");
    expect(deriveClientCertainty(undefined)).toBe("assessed");
  });

  it("the band collision cannot happen here: the function has no confidence_band input at all", () => {
    // Structural: the signature accepts evidence items only. A band named "verified" can never
    // flow in — the fabricated-confidence failure has no path through this derivation.
    expect(deriveClientCertainty([{ certainty: "high" as never }])).toBe("assessed");
  });

  it("only the exact LLM value 'verified' counts — forged/adjacent strings do not", () => {
    for (const s of ["Verified", "VERIFIED", "verify", "true"]) {
      expect(deriveClientCertainty([{ certainty: s }]), s).toBe("assessed");
    }
  });
});
