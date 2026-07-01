import { describe, it, expect } from "vitest";
import { containsProcurementLanguage, findProcurementLanguage } from "./procurementLanguage";

describe("procurement-language detector (Track 2 brand_relationship_finding guard)", () => {
  it("flags explicit purchase recommendations", () => {
    for (const s of [
      "This supplier is safe to purchase from.",
      "We recommend purchasing from this vendor.",
      "You can buy from this distributor with confidence.",
      "Go ahead and buy — the relationship is confirmed.",
      "Buy with confidence.",
      "The client should purchase this brand here.",
    ]) {
      expect(containsProcurementLanguage(s)).toBe(true);
    }
  });
  it("flags negative purchase directives too (don't buy / avoid)", () => {
    for (const s of ["Do not buy from this supplier.", "Don't purchase this brand here.", "Avoid buying from this vendor."]) {
      expect(containsProcurementLanguage(s)).toBe(true);
    }
  });
  it("does NOT flag neutral relationship language or the verification framing", () => {
    for (const s of [
      "Confirmed authorized distributor relationship for Lenovo.",
      "No verified Clorox authorization relationship could be established for this supplier.",
      "While the supplier appears to be a legitimate wholesale business, legitimacy alone should not be interpreted as authorization to resell this brand.",
      "Additional brand-specific verification is required before purchasing inventory.", // neutral — must NOT flag
      "Purchase orders in the pack corroborate the distributor relationship.",           // 'purchase' as evidence, not a recommendation
    ]) {
      expect(containsProcurementLanguage(s)).toBe(false);
    }
  });
  it("findProcurementLanguage returns the offending phrase(s)", () => {
    expect(findProcurementLanguage("It is safe to purchase here.").length).toBeGreaterThan(0);
    expect(findProcurementLanguage("Confirmed distributor relationship.")).toEqual([]);
  });
});
