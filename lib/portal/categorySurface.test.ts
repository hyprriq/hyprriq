import { describe, it, expect } from "vitest";
import { projectFindingJsonForClient, projectCategoryComplianceForClient, attentionLabelFor } from "./clientReport";
import { isAssessmentArea, ASSESSMENT_AREA_KEYS } from "@/lib/constants/tracks";
import { scanCategoryAtDelivery } from "@/lib/research/categoryLanguage";

// ── §2 TRACK 6 CLIENT SURFACE. Fixtures are TIER-GENERAL AND CASE-FREE BY CONSTRUCTION: the
// corpus contains exactly ONE Track 6 case and ZERO $99/$149 cases, so a corpus-only fixture set
// would design this surface from a single case — the failure the standing rule names. Every shape
// below is derived from the CONTRACT (CategoryComplianceAssessment) and the plan registry, and
// every empty state is included whether or not any stored case happens to exhibit it today.

const flag = (risk: string) => ({ subcategory: "Supplements", flag_language: "This product may require seller-level lab testing.", risk_level: risk, matched_via: "category_research" });
const full = {
  contract_version: "cf-1.0.0", scope: "brand_level", category_verdict: "requirements_identified",
  category_verdict_basis: "code-templated", audits: [{ field: "x", reason: "y" }],
  per_brand: [{
    brand: "Stacker 2", brand_category_note: "Sold as a dietary supplement.",
    categories_found: [{ category: "Dietary supplements", subcategory: "Energy", confidence: "high", evidence_ids: ["EV-001", "EV-004"], flags: [flag("HIGH")] }],
  }],
};

describe("§2 — the projector BRANCH: internal machinery must never cross", () => {
  const out = projectFindingJsonForClient({ summary: "s", category_compliance: full }, "category_compliance");
  const json = JSON.stringify(out);

  it("crosses the ruled fields", () => {
    const cc = out.category_compliance as { per_brand: { categories_found: { category: string; evidence_count: number; flags: { flag_language: string }[] }[] }[] };
    expect(cc.per_brand[0].categories_found[0].category).toBe("Dietary supplements");
    expect(cc.per_brand[0].categories_found[0].flags[0].flag_language).toBe("This product may require seller-level lab testing.");
  });

  it("⛔ matched_via NEVER crosses — it is METHOD vocabulary, the exact thing the derivation scanner stops", () => {
    expect(json).not.toContain("matched_via");
    expect(json).not.toContain("category_research");
  });

  it("⛔ evidence_ids never cross — the COUNT does", () => {
    expect(json).not.toContain("EV-001");
    expect(json).not.toContain("evidence_ids");
    const cc = out.category_compliance as { per_brand: { categories_found: { evidence_count: number }[] }[] };
    expect(cc.per_brand[0].categories_found[0].evidence_count).toBe(2);
  });

  it("⛔ audits, scope and contract_version never cross", () => {
    for (const k of ["audits", "scope", "contract_version", "category_verdict_basis"]) expect(json).not.toContain(k);
  });
});

describe("§2 — risk_level NEVER reaches a client as HIGH", () => {
  it("HIGH becomes the attention label, not the word", () => {
    const out = projectFindingJsonForClient({ category_compliance: full }, "category_compliance");
    const json = JSON.stringify(out);
    expect(json).not.toContain("HIGH");
    expect(json).not.toContain("risk_level");
    expect(json).toContain("Flagged for closer attention than the other categories on this case.");
  });

  it("MODERATE reads as standard attention", () => {
    expect(attentionLabelFor("MODERATE")).toBe("Standard attention for this category.");
  });

  it("an UNKNOWN or missing level takes the SAFE side, never a reassuring one", () => {
    // The shape the author did not have in mind: a level the table grows later.
    expect(attentionLabelFor("CATASTROPHIC")).toContain("Flagged for closer attention");
    expect(attentionLabelFor(undefined)).toContain("Flagged for closer attention");
    expect(attentionLabelFor(null)).toContain("Flagged for closer attention");
  });
});

describe("§2 — empty states the component must survive (none of these exist in the corpus today)", () => {
  it("a brand with NO categories_found still projects, so the renderer can say so", () => {
    const cc = projectCategoryComplianceForClient({ per_brand: [{ brand: "Black Jax", categories_found: [], brand_category_note: null }] })!;
    expect(cc.per_brand[0].categories_found).toEqual([]);
    expect(cc.per_brand[0].brand_category_note).toBeNull();
  });

  it("a category with NO flags projects with an empty flag list", () => {
    const cc = projectCategoryComplianceForClient({ per_brand: [{ brand: "B", categories_found: [{ category: "C", evidence_ids: [], flags: [] }] }] })!;
    expect(cc.per_brand[0].categories_found[0].flags).toEqual([]);
    expect(cc.per_brand[0].categories_found[0].evidence_count).toBe(0);
  });

  it("an ABSENT or empty assessment emits NO key at all — never an empty block on a paid report", () => {
    expect(projectFindingJsonForClient({ summary: "s" }, "category_compliance").category_compliance).toBeUndefined();
    expect(projectFindingJsonForClient({ summary: "s", category_compliance: { per_brand: [] } }, "category_compliance").category_compliance).toBeUndefined();
    expect(projectFindingJsonForClient({ summary: "s", category_compliance: null }, "category_compliance").category_compliance).toBeUndefined();
  });
});

// ── THE COUNT. Checked at ALL FOUR TIERS, from the product definition rather than case data.
describe("§2 — the area count derives from the registry, at every tier", () => {
  it("category_compliance is NOT a sold assessment area; the five are", () => {
    expect(isAssessmentArea("category_compliance")).toBe(false);
    expect(ASSESSMENT_AREA_KEYS).toHaveLength(5);
    for (const k of ASSESSMENT_AREA_KEYS) expect(isAssessmentArea(k)).toBe(true);
  });

  const tierRows: Record<string, string[]> = {
    // $99 gates to 3 finding tracks (TRACK_CONFIG single_99 = [0,1,3,5]).
    single_99: ["supplier_identity", "brand_risk_assessment", "sourcing_logic"],
    growth_279: ["supplier_identity", "supply_chain_relationship", "brand_risk_assessment", "documentation_review", "sourcing_logic"],
    single_149: ["supplier_identity", "supply_chain_relationship", "brand_risk_assessment", "documentation_review", "sourcing_logic", "category_compliance"],
    scale_499: ["supplier_identity", "supply_chain_relationship", "brand_risk_assessment", "documentation_review", "sourcing_logic", "category_compliance"],
  };

  it.each([
    ["single_99", 3, 0],
    ["growth_279", 5, 0],
    ["single_149", 5, 1],
    ["scale_499", 5, 1],
  ])("%s → %i counted areas, %i advisory rows", (tier, counted, advisory) => {
    const rows = tierRows[tier as keyof typeof tierRows];
    expect(rows.filter(isAssessmentArea)).toHaveLength(counted);
    expect(rows.filter((k) => !isAssessmentArea(k))).toHaveLength(advisory);
  });

  it("⚠ THE BUG THIS REPLACES: a raw row count says SIX at Scale, and we sell five", () => {
    expect(tierRows.scale_499).toHaveLength(6);
    expect(tierRows.scale_499.filter(isAssessmentArea)).toHaveLength(5);
  });
});

describe("§2 — findCategoryLanguageViolations joins the DELIVERY composition", () => {
  const row = (cc: unknown) => [{ track_key: "category_compliance", compiled_findings_json: { category_compliance: cc } }];

  it("catches a banned claim in the LLM-written brand_category_note at delivery", () => {
    const v = scanCategoryAtDelivery(row({ per_brand: [{ brand: "B", brand_category_note: "This is safe to sell on Amazon.", categories_found: [] }] }));
    expect(v.join(" ")).toContain("safe-to-sell class");
  });

  it("catches it in the LLM-written category name too", () => {
    const v = scanCategoryAtDelivery(row({ per_brand: [{ brand: "B", categories_found: [{ category: "Ungating services", flags: [] }] }] }));
    expect(v.join(" ")).toContain("ungating language");
  });

  it("⛔ does NOT scan flag_language — founder copy, code-injected, legitimately says 'may require'", () => {
    const v = scanCategoryAtDelivery(row({ per_brand: [{ brand: "B", categories_found: [{ category: "Supplements", flags: [flag("HIGH")] }] }] }));
    expect(v).toEqual([]);
  });

  it("clean content passes, and non-Track-6 rows are ignored entirely", () => {
    expect(scanCategoryAtDelivery(row({ per_brand: [{ brand: "B", brand_category_note: "Sold as a dietary supplement.", categories_found: [] }] }))).toEqual([]);
    expect(scanCategoryAtDelivery([{ track_key: "supplier_identity", compiled_findings_json: { summary: "This is safe to sell." } }])).toEqual([]);
  });
});
