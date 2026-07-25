import { describe, it, expect } from "vitest";
import { findCategoryLanguageViolations } from "@/lib/research/categoryLanguage";
import { CATEGORY_FLAGS_TABLE, CATEGORY_FLAGS_GOVERNING_LAW } from "@/lib/research/categoryFlagsTable";

// ── Category Compliance CONDITION 1 (founder-ruled 2026-07-23): the honesty scanner must NOT
// inherit the procurement family's ten runtime-proven holes. The lesson applied:
//   1. POLARITY-BLIND on status claims — "restricted" and "NOT restricted" are BOTH verdictive
//      claims about the client's product/category (unlike the guarantee-denial class, where the
//      negation is the mandated honest form). Negation is not an escape here.
//   2. ALTERNATION-COMPLETE — sell AND resell AND list AND stock; approve AND accept AND allow.
//   3. RED-PROVEN BY EVASION — every fixture below is an actual evasion shape from the
//      banned-language audit (2026-07-23), fed through the live scanner. The method that found
//      the ten holes is the method that proves this scanner does not have them.
// TWO-SIDED: the founder's own table language and governing law MUST pass — a scanner that
// blocks the platform's honest 'may require' copy is a worse defect than the one it prevents. ──

const VIOLATIONS: [string, string][] = [
  // The audit's exact evasion shapes, transplanted to category claims:
  ["negation escape (the 'you should NOT buy' hole)", "This category is not restricted for your account."],
  ["bare negative status", "These products are unrestricted on Amazon."],
  ["affirmative status", "This category is restricted on Amazon."],
  ["eligibility claim", "You are eligible to sell in this category."],
  ["eligibility negative", "You are not eligible to sell in this category."],
  ["the 'safe to SELL' alternation hole", "These items are safe to sell in this category."],
  ["safe to list", "This product line is safe to list."],
  ["approval prediction (the 'Amazon will accept' hole)", "Amazon will approve you for this category."],
  ["rejection prediction", "Amazon will reject your application for this category."],
  ["allow prediction", "Amazon will not allow this product."],
  ["gating status claim", "This category is gated."],
  ["ungating language (Hard Rule #12 territory)", "We can get you ungated in this category."],
  ["ungated status", "This category is ungated for most sellers."],
  ["can-sell claim", "You can sell these products without documentation."],
  ["cannot-sell claim", "You cannot sell in this category."],
  ["banned status", "These substances are banned by Amazon."],
  ["requirement stated as absolute (the governing law's own ban)", "This category requires third-party lab testing."],
  ["will-need absolute", "You will need FDA clearance to sell this."],
];

const MUST_PASS: [string, string][] = [
  ...CATEGORY_FLAGS_TABLE.map((r): [string, string] => [`table row: ${r.subcategory}`, r.flag_language]),
  ["the governing law itself", CATEGORY_FLAGS_GOVERNING_LAW],
  ["may-require narrative", "This brand sells pre-workout supplements, a category that may require seller-level lab testing."],
  ["may-carry narrative", "Two of the four categories found may carry Amazon selling requirements."],
  ["honest uncertainty", "Category requirements could not be determined from available sources."],
  ["verify instruction", "Verify current requirements with Amazon before committing inventory at scale."],
  ["describing research scope", "We identify the product categories these brands sell in and flag categories that may carry Amazon selling requirements."],
];

describe("Condition 1 — the category honesty scanner (evasion-proven, two-sided)", () => {
  for (const [label, text] of VIOLATIONS) {
    it(`CATCHES ${label}: "${text}"`, () => {
      expect(findCategoryLanguageViolations(text).length, `must catch: ${text}`).toBeGreaterThan(0);
    });
  }
  for (const [label, text] of MUST_PASS) {
    it(`PASSES ${label}`, () => {
      expect(findCategoryLanguageViolations(text), `must pass: ${text}`).toEqual([]);
    });
  }
  it("empty/null-ish input never throws, never flags", () => {
    expect(findCategoryLanguageViolations("")).toEqual([]);
  });
});
