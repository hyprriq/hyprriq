import { describe, it, expect } from "vitest";
import { weightKeyExistsInAnyTrack, weightFor, RUBRIC_VERSION, weightKeysForTrack } from "./weights";

// Track 3 (SO-4, founder-signed 2026-07-10): b2b_only_confirmed was the ONLY hard-fail key with
// non-zero points (−5 + veto = a double count — the drag only ever affected the confidence score
// of an already-vetoed track; no decision value, "a trap for whoever touches this next").
// Normalized to the pure-veto convention. Rubric versioned — "H1's discipline applied to scoring":
// stored rubric_version keeps historical results reproducible.
describe("SO-4 — hard-fail keys are pure vetoes (rubric g003-1.1.0)", () => {
  it("pins the rubric version (bump deliberately on any weight change)", () => {
    // REPINNED g003-1.1.0 → g003-1.2.0 with manufacturer_direct (founder-ruled 2026-08-21).
    expect(RUBRIC_VERSION).toBe("g003-1.2.0");
  });
  it("b2b_only_confirmed is a 0-point pure veto", () => {
    expect(weightFor("brand_risk_assessment", "b2b_only_confirmed")).toEqual({ points: 0, hard_fail: true });
  });
  it("EVERY hard-fail key across all tracks is a pure veto — the convention, locked", () => {
    for (const track of ["supplier_identity", "supply_chain_relationship", "brand_risk_assessment", "documentation_review"] as const) {
      for (const key of weightKeysForTrack(track)) {
        const w = weightFor(track, key);
        if (w?.hard_fail) expect(w.points, `${track}.${key} must be a 0-point pure veto`).toBe(0);
      }
    }
  });
});

describe("weightKeyExistsInAnyTrack", () => {
  it("is true for a key in any track's registry", () => {
    expect(weightKeyExistsInAnyTrack("government_registration")).toBe(true); // supplier_identity
    expect(weightKeyExistsInAnyTrack("dealer_page_listed")).toBe(true);      // supply_chain_relationship
  });
  it("is false for a key in no registry", () => {
    expect(weightKeyExistsInAnyTrack("totally_made_up_key")).toBe(false);
  });
});
