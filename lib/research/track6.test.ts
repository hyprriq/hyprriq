import { describe, it, expect, vi } from "vitest";
import { runTrack6, type Track6Deps } from "@/lib/research/track6";
import { CATEGORY_FLAGS_TABLE, BRAND_KEYED_SUBCATEGORY } from "@/lib/research/categoryFlagsTable";
import type { TrackContext } from "@/lib/research/contracts";

// ── Category Compliance V1 (spec 2026-07-23, founder-APPROVED) — the two-hop track.
// Hop 1: brand → categories (research; LLM PROPOSES categories + subcategory candidates).
// Hop 2: categories → flags (CODE DECIDES: closed-key validation, verbatim injection from the
// table, matched_via provenance). Electronics row fires brand-keyed IN CODE, no hop.
// Non-voting, zero evidence items to the pipeline (the §5 trap ruling) — the engine never sees it. ──

const ctx = (over: Partial<TrackContext> = {}): TrackContext => ({
  case_id: "case-1", vendor_name: "Acme Wholesale", vendor_website: "https://acme.example",
  brands_submitted: ["Optimum Nutrition"], marketplace: "amazon_us", plan_type: "scale_499", attempt_number: 1, ...over,
});

const source = (i: number) => ({
  url: `https://example.com/s${i}`, title: `source ${i}`, snippet: `snippet ${i}`,
  provenance: {
    provider: "Serper", provider_version: "v1", plugin: "serper", acquisition_method: "serper",
    source_profile: "web_general", source_type: "third_party", authority_score: 2,
    freshness_days: null, collected_at: "2026-07-23T00:00:00Z", expires_at: "2027-07-23T00:00:00Z",
    refresh_required: false,
  },
});

const deps = (over: Partial<Track6Deps> = {}): Track6Deps => ({
  gather: vi.fn().mockResolvedValue({
    pack: { schema_version: "1.1.0", case_id: "case-1", track_key: "category_compliance", sources: [source(0), source(1)] },
    metrics: [],
  }),
  model: vi.fn().mockResolvedValue({
    json: {
      per_brand: [{
        brand: "Optimum Nutrition",
        categories_found: [
          { category: "protein powders and sports supplements", evidence_ids: ["src_0"], confidence: "high", subcategory: "General supplements / vitamins" },
          { category: "pre-workout and energy formulas", evidence_ids: ["src_1"], confidence: "medium", subcategory: "Energy / stimulant supplements" },
          { category: "made-up nonsense", evidence_ids: ["src_0"], confidence: "low", subcategory: "Not A Real Subcategory" },
          { category: "apparel and shaker bottles", evidence_ids: ["src_1"], confidence: "medium", subcategory: null },
        ],
        brand_category_note: "Brand spans supplements and accessories.",
      }],
    },
    cost_usd: 0.01,
  }),
  ...over,
});

describe("Track 6 — the two-hop derivation (LLM proposes, code decides)", () => {
  it("valid subcategory proposals become flags with the table's VERBATIM language + risk level; invalid keys are DROPPED with an audit; unflagged categories stay named", async () => {
    const out = await runTrack6(ctx(), deps());
    const cc = out.category_compliance!;
    const brand = cc.per_brand[0];
    // All four researched categories are named (multi-category is the V1 feature)…
    expect(brand.categories_found).toHaveLength(4);
    // …the two valid subcategory matches carry flags injected from the table:
    const flagged = brand.categories_found.filter((c) => c.flags.length > 0);
    expect(flagged).toHaveLength(2);
    const energyRow = CATEGORY_FLAGS_TABLE.find((r) => r.subcategory === "Energy / stimulant supplements")!;
    const energyFlag = brand.categories_found.find((c) => c.category.includes("pre-workout"))!.flags[0];
    expect(energyFlag.flag_language).toBe(energyRow.flag_language); // byte-identical injection
    expect(energyFlag.risk_level).toBe("HIGH");
    expect(energyFlag.matched_via).toBe("category_research");
    // The invalid key never becomes a flag, and the drop is audited:
    expect(cc.audits.some((a) => a.reason.includes("Not A Real Subcategory"))).toBe(true);
  });

  it("the category verdict is CODE-DERIVED — flags present ⇒ requirements_identified; the model cannot set it", async () => {
    const d = deps();
    (d.model as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: {
        category_verdict: "no_known_requirements", // the model trying to author the verdict — ignored
        per_brand: [{ brand: "Optimum Nutrition", categories_found: [{ category: "supplements", evidence_ids: ["src_0"], confidence: "high", subcategory: "General supplements / vitamins" }], brand_category_note: null }],
      },
      cost_usd: 0.01,
    });
    const out = await runTrack6(ctx(), d);
    expect(out.category_compliance!.category_verdict).toBe("requirements_identified");
    expect(out.category_compliance!.category_verdict_basis).toMatch(/\d/); // code-templated counts
  });

  it("BRAND-KEYED (the electronics row): fires deterministically from brands_submitted, no research hop — even when acquisition returns NOTHING", async () => {
    const d = deps({ gather: vi.fn().mockResolvedValue({ pack: { schema_version: "1.1.0", case_id: "case-1", track_key: "category_compliance", sources: [] }, metrics: [] }) });
    const out = await runTrack6(ctx({ brands_submitted: ["Lenovo"] }), d);
    const cc = out.category_compliance!;
    const hit = cc.per_brand[0].categories_found.find((c) => c.flags.some((f) => f.matched_via === "brand_keyed"));
    expect(hit, "the brand-keyed electronics flag must fire without research").toBeTruthy();
    expect(hit!.flags[0].subcategory).toBe(BRAND_KEYED_SUBCATEGORY);
    expect(cc.category_verdict).toBe("requirements_identified"); // a flag exists — never could_not_determine
  });

  it("could_not_determine: empty acquisition + no brand-keyed hit ⇒ the honest state, never clearance", async () => {
    const d = deps({ gather: vi.fn().mockResolvedValue({ pack: { schema_version: "1.1.0", case_id: "case-1", track_key: "category_compliance", sources: [] }, metrics: [] }) });
    const out = await runTrack6(ctx(), d);
    expect(out.category_compliance!.category_verdict).toBe("could_not_determine");
    expect(out.category_compliance!.per_brand[0].categories_found).toEqual([]);
  });

  it("CONDITION 1 — the honesty scanner scrubs LLM narrative: a verdictive note is nulled and audited, never delivered", async () => {
    const d = deps();
    (d.model as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: {
        per_brand: [{
          brand: "Optimum Nutrition",
          categories_found: [{ category: "supplements", evidence_ids: ["src_0"], confidence: "high", subcategory: "General supplements / vitamins" }],
          brand_category_note: "This category is not restricted for your account.",
        }],
      },
      cost_usd: 0.01,
    });
    const out = await runTrack6(ctx(), d);
    expect(out.category_compliance!.per_brand[0].brand_category_note).toBeNull();
    expect(out.category_compliance!.audits.some((a) => a.field === "brand_category_note")).toBe(true);
  });

  it("NON-VOTING SHAPE (the §5 trap ruling): zero evidence items, zero unknowns, non_voting true — nothing can reach M1 or any signal", async () => {
    const out = await runTrack6(ctx(), deps());
    expect(out.track_key).toBe("category_compliance");
    expect(out.evidence_items).toEqual([]);
    expect(out.unknowns).toEqual([]);
    expect(out.non_voting).toBe(true);
    expect(out.category_compliance!.scope).toBe("brand_level");
    expect(out.category_compliance!.contract_version).toBe("cc-1.0.0");
  });

  it("roster lock: a per_brand entry for a brand NOT in brands_submitted is dropped with an audit", async () => {
    const d = deps();
    (d.model as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: {
        per_brand: [
          { brand: "Optimum Nutrition", categories_found: [], brand_category_note: null },
          { brand: "SomeOtherBrand", categories_found: [{ category: "toys", evidence_ids: [], confidence: "low", subcategory: "Children's toys" }], brand_category_note: null },
        ],
      },
      cost_usd: 0.01,
    });
    const out = await runTrack6(ctx(), d);
    expect(out.category_compliance!.per_brand.map((b) => b.brand)).toEqual(["Optimum Nutrition"]);
    expect(out.category_compliance!.audits.some((a) => a.reason.includes("SomeOtherBrand"))).toBe(true);
  });

  it("DELIVERY-GATE COMPATIBILITY: the full assessment payload walks CLEAN through the HARD banned-language scan — a category block must never block its own case's delivery", async () => {
    const { scanFindingsForBannedLanguage } = await import("@/lib/utils/banned-language");
    const out = await runTrack6(ctx(), deps());
    expect(scanFindingsForBannedLanguage(out.category_compliance)).toEqual([]);
  });
});
