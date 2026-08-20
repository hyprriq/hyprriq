import { describe, it, expect } from "vitest";
import { parseTrack3Output, buildTrack3Prompt } from "@/lib/research/track3.prompt";
import { TRACK3_OUTPUT_SCHEMA } from "@/lib/research/schemas/track3.schema";
import { brandsDiffer, type ReportContent } from "@/lib/pdf/reportTemplate";

// ── RESOLVED BRAND NAMES (founder-ruled 2026-08-20): "nitendo" on a $499 cover reads as OUR
// sloppiness, and the resolved name is what was actually researched. The chain: Track 3 emits
// { submitted, resolved } per token → cases.brands_confirmed → the PDF cover, with the submitted
// spellings visible as "Submitted as: …" whenever any differ.

const base = {
  evidence_items: [
    { evidence_id: "E001", brand: "Nintendo", statement: "s", proposed_weight_key: "no_enforcement_found", supporting_source_ids: [], mapping_justification: "m", counter_evidence: "None found", certainty: "inferred", confidence: "low" },
  ],
  brand_risk_finding: "f",
  analyst_reading: { most_likely: "m", alternative: "a", confidence: "low", what_would_change_my_mind: "w" },
  questions_to_ask: [],
  reasoning_notes: "r",
  client_summary: "c",
  unknowns: [],
};

describe("the CONTRACT lock — prompt, parser and schema move together (the client_summary lesson)", () => {
  it("the schema PERMITS and REQUIRES resolved_brands — a ban with no permission is not a contract", () => {
    const props = TRACK3_OUTPUT_SCHEMA.properties as Record<string, unknown>;
    expect(props.resolved_brands).toBeDefined();
    expect(TRACK3_OUTPUT_SCHEMA.required as readonly string[]).toContain("resolved_brands");
  });
  it("the prompt instructs the field and names the misspelling rule", () => {
    const { system } = buildTrack3Prompt({ vendor_name: "V", brands: ["nitendo"] }, []);
    expect(system).toContain("RESOLVED_BRANDS");
    expect(system).toContain("resolved_brands: [{ submitted, resolved }]");
    expect(system).toMatch(/never guess a brand/i);
  });
});

describe("the parser — shapes the field was not designed around", () => {
  it("reads well-formed entries", () => {
    const p = parseTrack3Output({ ...base, resolved_brands: [{ submitted: "nitendo", resolved: "Nintendo" }] });
    expect(p.resolved_brands).toEqual([{ submitted: "nitendo", resolved: "Nintendo" }]);
  });
  it("legacy output with NO field parses to [] — absence never breaks parsing", () => {
    expect(parseTrack3Output(base).resolved_brands).toEqual([]);
  });
  it("junk entries are skipped, never a crash: non-objects, missing halves, non-strings, whitespace", () => {
    const p = parseTrack3Output({
      ...base,
      resolved_brands: [
        "just a string",
        { submitted: "sony" },
        { resolved: "Sony" },
        { submitted: 7, resolved: "Sony" },
        { submitted: "  ", resolved: "Sony" },
        { submitted: "sony", resolved: "  Sony  " },
      ],
    });
    expect(p.resolved_brands).toEqual([{ submitted: "sony", resolved: "Sony" }]); // trimmed
  });
  it("a whole-field wrong shape (object, not array) parses to []", () => {
    expect(parseTrack3Output({ ...base, resolved_brands: { nitendo: "Nintendo" } }).resolved_brands).toEqual([]);
  });
});

describe("the cover decision — brandsDiffer", () => {
  const content = (brands: string[], submitted?: string[]): ReportContent => ({
    caseNumber: "X", vendor: "V", brands, brandsSubmitted: submitted,
    clientName: "C", deliveredAt: "d", verdict: "verify_before_purchase",
    report: { headline: "", the_real_risk: "", leading_interpretation: "", what_to_monitor: [], questions: [] } as unknown as ReportContent["report"],
    findings: [],
  });

  it("a real respelling differs → the Submitted-as line renders", () => {
    expect(brandsDiffer(content(["Nintendo", "Sony"], ["nitendo", "sony"]))).toBe(true);
  });
  it("⚠ CASE-ONLY differences do NOT differ — 'sony' → 'Sony' needs no disclaimer line", () => {
    expect(brandsDiffer(content(["Sony", "PlayStation"], ["sony", "playstation"]))).toBe(false);
  });
  it("no submitted list (legacy content) → never differs", () => {
    expect(brandsDiffer(content(["Sony"]))).toBe(false);
  });
  it("a count mismatch differs — a dropped or added brand must be visible", () => {
    expect(brandsDiffer(content(["Sony"], ["sony", "playstation"]))).toBe(true);
  });
});
