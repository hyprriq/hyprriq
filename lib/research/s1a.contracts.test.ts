import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import {
  BRAND_EVIDENCE_STATUS_STATES,
  DIMENSION_RUN_CAUSES,
  DOUBT_LEVELS,
  M4C_READER_CONTRACT_VERSION,
  SOURCING_CONTRADICTION_CONTRACT_VERSION,
  type ClaimAttribution,
  type SynthesisAssertion,
  type HypothesisSet,
  type RiskGap,
  type DoubtCalibration,
  type WidenedM1Record,
  type M1RecordExtension,
  type RejectedWithGate,
  type BrandEvidenceStatusEntry,
  type DimensionRunEntry,
  type SchemaFallbackRecord,
  type SynthesisOutput,
  type DecisionSnapshot,
  type NormalizedEvidenceItem,
} from "@/lib/research/contracts";

// ── S-1a — THE NINE CONTRACT TYPES ONLY (founder-ruled sitting, 2026-07-17). Shape locks, zero
// logic. These locks freeze the ruled B2 contracts BEFORE any sitting consumes them: the renamed
// M2 fields (naming law), M3 brand (A8), m4c-1.1.0 reader, both ruled siblings, R2's per-call
// schema-fallback record, and the Q3 beside-the-hash separation on the widened M1 record.
// SynthesisOutput's legacy module fields stay UNTOUCHED (S-0's frozen lock test constructs them
// loosely — narrowing them would force edits to a frozen file); the engine's typed contracts
// assign INTO them one-way. ──

const contractsSource = readFileSync(join(__dirname, "contracts.ts"), "utf8");
const blockOf = (name: string): string => {
  const start = contractsSource.indexOf(`export interface ${name} {`);
  expect(start, `interface ${name} exists in contracts.ts`).toBeGreaterThan(-1);
  const end = contractsSource.indexOf("\n}", start);
  return contractsSource.slice(start, end);
};

describe("S-1a contracts — ruled enums are exact (runtime locks)", () => {
  it("brand_evidence_status has exactly the TWO ruled states (three-state ruling corrected 2026-07-17; absence never clearance)", () => {
    expect(BRAND_EVIDENCE_STATUS_STATES).toEqual(["adverse_findings_attributed", "no_adverse_findings_attributed"]);
  });

  it("dimension_run_record carries exactly the FIVE stored causes (verified from source; nothing_to_review's third-sentence status preserved)", () => {
    expect(DIMENSION_RUN_CAUSES).toEqual(["plan_excluded", "acquisition_failed", "llm_failed", "nothing_to_review", "not_implemented"]);
  });

  it("doubt levels match the d7-1.0.0 matrix output enum exactly", () => {
    expect(DOUBT_LEVELS).toEqual(["minimal", "targeted", "elevated", "broad"]);
  });

  it("m4c versions: Track 5 writer stays 1.0.0, the reader is 1.1.0", () => {
    expect(SOURCING_CONTRADICTION_CONTRACT_VERSION).toBe("m4c-1.0.0");
    expect(M4C_READER_CONTRACT_VERSION).toBe("m4c-1.1.0");
  });
});

describe("S-1a contracts — the M2 naming law (source-scan lock)", () => {
  it("ClaimAttribution uses claim_attributed_to / attributed_party_benefits and NEVER the M1 provenance-class names", () => {
    const block = blockOf("ClaimAttribution");
    expect(block).toContain("claim_attributed_to");
    expect(block).toContain("attributed_party_benefits");
    // The naming law (founder, 2026-07-17): M1's claimant/claimant_benefits are per-track
    // PROVENANCE CLASS; M2's per-claim attribution takes DISTINCT names. Same name in this
    // block = the `elevated` collision rebuilt on a verdict-adjacent field.
    expect(block).not.toMatch(/\bclaimant\b/);
    expect(block).not.toMatch(/\bclaimant_benefits\b/);
  });

  it("SynthesisAssertion carries the A8 brand scope field", () => {
    expect(blockOf("SynthesisAssertion")).toMatch(/\bbrand: string/);
  });
});

describe("S-1a contracts — shapes compile and carry the ruled fields (satisfies locks)", () => {
  it("ClaimAttribution / SynthesisAssertion / HypothesisSet / RiskGap / DoubtCalibration sample shapes", () => {
    const attribution = {
      evidence_id: "e1",
      claim: "vendor states authorized distribution",
      claim_attributed_to: "vendor",
      attributed_party_benefits: true,
      corroboration: "none_found",
      weight: "low_until_corroborated",
    } satisfies ClaimAttribution;
    expect(attribution.weight).toBe("low_until_corroborated");

    const assertion = {
      assertion_id: "a1",
      assertion: "the vendor operates a real wholesale business",
      brand: "",
      status: "supported",
      supporting_evidence: ["e1"],
      contradicting_evidence: [],
      confidence: "high",
    } satisfies SynthesisAssertion;
    expect(assertion.brand).toBe("");

    const hypotheses = {
      hypotheses: [{
        label: "authorized-distributor",
        interpretation: "…",
        supporting_evidence: ["e1"],
        contradicting_evidence: [],
        likelihood: "leading",
      }],
      what_would_change_the_leader: "…",
    } satisfies HypothesisSet;
    expect(hypotheses.hypotheses[0].likelihood).toBe("leading");

    const gap = { gap_id: "g1", unknown: "…", why_it_matters: "…", is_material: false, resolvable_by_client: true } satisfies RiskGap;
    expect(gap.is_material).toBe(false);

    // M7 stage output: doubt_level is the NARROW enum; the truthful-label axis marker and the
    // chosen levels ride the record (fallback ruling + skeleton: inputs + cell are auditable).
    const doubt = {
      doubt_level: "targeted",
      doubt_focus: "…",
      rationale: "…",
      gap_inputs: { axis: "llm_derived", unresolved_assertions: 1, stored_unknowns: 4, gap_level: "narrow" },
      cost_inputs: { enforcement_posture_signals: [], veto_grade_keys_present: [], brands_at_issue: 1, cost_level: "significant" },
    } satisfies DoubtCalibration;
    // One-way assignability: the stage output must fit the STORED module_7 slot (string stays wide
    // there — the frozen S-0 rebuild constructs doubt_level: "" and is byte-identical).
    const stored: SynthesisOutput["module_7_doubt_calibration"] = doubt;
    expect(stored.doubt_level).toBe("targeted");
  });

  it("the widened M1 record separates the hash anchor from the extension (the Q3 law, encoded)", () => {
    const item: NormalizedEvidenceItem = {
      evidence_id: "e1", statement: "…", certainty: "verified", source_type: "third_party",
      source_url: "https://example.com", claimant: "independent_registry", claimant_benefits: false,
      supports: "supplier_identity", source_track: "supplier_identity",
    };
    const rejected = {
      evidence_id: "e2", proposed_weight_key: "dealer_page_listed", gate: "provenance",
      rejection_reason: "provenance", validation_version: "1.7.0", source_track: "supply_chain_relationship",
    } satisfies RejectedWithGate;
    const extension = {
      rejected_with_gate: [rejected],
      unknowns: [{ source_track: "supplier_identity", unknown: "…", why_unresolvable: "…", resolvable_by_client: true }],
      advisory_metadata: { b2b_only_detected: false, b2b_only_brands: [] },
      identity_audit: null,
      consensus_records: [{ source_track: "supplier_identity", checked: [], dropped: [], second_call_failed: false }],
      diversity_records: [{ source_track: "supplier_identity", signal: "pass", capped: false, cap_reason: null, distinct_sources: 3 }],
    } satisfies M1RecordExtension;
    const record = {
      accepted: { items: [item], evidence_hash: "abc123" },
      extension,
    } satisfies WidenedM1Record;
    // The hash anchor lives ONLY on the accepted side; the extension rides BESIDE it (Q3:
    // computeEvidenceHash's input projection stays byte-identical — nothing widened feeds it).
    expect(Object.keys(record.extension)).not.toContain("evidence_hash");
    expect(record.accepted.evidence_hash).toBe("abc123");
  });

  it("a corroboration-rejected item can carry the A1 tag; others omit it", () => {
    const tagged = {
      evidence_id: "e3", proposed_weight_key: "scam_reports_corroborated", gate: "corroboration",
      rejection_reason: "corroboration", validation_version: "1.7.0", source_track: "supplier_identity",
      tag: "asserted_but_unverifiable",
    } satisfies RejectedWithGate;
    expect(tagged.tag).toBe("asserted_but_unverifiable");
  });

  it("brand_evidence_status entries carry the honest attribution label; dimension_run_record pairs state with a verbatim cause", () => {
    const adverse = { brand: "Bosch", status: "adverse_findings_attributed", driving: true, attribution: "llm_attributed" } satisfies BrandEvidenceStatusEntry;
    const absent = { brand: "Knipex", status: "no_adverse_findings_attributed", driving: false, attribution: "llm_attributed" } satisfies BrandEvidenceStatusEntry;
    expect(adverse.attribution).toBe("llm_attributed");
    expect(absent.status).toBe("no_adverse_findings_attributed");

    const ran = { dimension: "supplier_identity", state: "assessed", cause: null } satisfies DimensionRunEntry;
    const excluded = { dimension: "documentation_review", state: "not_assessed", cause: "plan_excluded" } satisfies DimensionRunEntry;
    const failed = { dimension: "brand_risk_assessment", state: "not_assessed", cause: "llm_failed" } satisfies DimensionRunEntry;
    expect([ran.cause, excluded.cause, failed.cause]).toEqual([null, "plan_excluded", "llm_failed"]);
  });

  it("R2: the schema-fallback record covers exactly the four ruled calls", () => {
    const record = { call_a: false, call_b: false, call_b_refuter: true, call_c: false } satisfies SchemaFallbackRecord;
    expect(Object.keys(record).sort()).toEqual(["call_a", "call_b", "call_b_refuter", "call_c"]);
  });
});

describe("S-1a contracts — storage compatibility (frozen surfaces byte-identical)", () => {
  it("SynthesisOutput still accepts the legacy stub shape — every new sibling is optional/additive", () => {
    const legacy = {
      module_1_normalized_evidence: [],
      module_2_claim_attributions: [],
      module_3_assertions: [],
      module_4_contradictions: [],
      module_5_hypotheses: { hypotheses: [], what_would_change_the_leader: "" },
      module_6_risk_gaps: [],
      module_7_doubt_calibration: { doubt_level: "minimal", doubt_focus: "", rationale: "stub" },
      module_8_vendor_questions: [],
      module_9_decision_snapshot: { headline: "", leading_interpretation: "", the_real_risk: "", what_to_verify: [], what_to_monitor: [] },
    } satisfies SynthesisOutput;
    expect(legacy.module_8_vendor_questions).toEqual([]);

    const withSiblings = {
      ...legacy,
      brand_evidence_status: [{ brand: "Bosch", status: "adverse_findings_attributed", driving: true, attribution: "llm_attributed" }],
      dimension_run_record: [{ dimension: "supplier_identity", state: "assessed", cause: null }],
      module_1_extension: {
        rejected_with_gate: [], unknowns: [], advisory_metadata: { b2b_only_detected: false, b2b_only_brands: [] },
        identity_audit: null, consensus_records: [], diversity_records: [],
      },
      schema_fallbacks: { call_a: false, call_b: false, call_b_refuter: false, call_c: false },
    } satisfies SynthesisOutput;
    expect(withSiblings.brand_evidence_status?.[0].brand).toBe("Bosch");
  });

  it("DecisionSnapshot keeps its exact five fields (OQ-S2: what_to_verify retained)", () => {
    const snapshot = {
      headline: "", leading_interpretation: "", the_real_risk: "", what_to_verify: [], what_to_monitor: [],
    } satisfies DecisionSnapshot;
    expect(Object.keys(snapshot).sort()).toEqual(["headline", "leading_interpretation", "the_real_risk", "what_to_monitor", "what_to_verify"]);
  });
});
