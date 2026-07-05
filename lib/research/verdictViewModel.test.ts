import { describe, it, expect } from "vitest";
import { buildVerdictViewModel } from "./verdictViewModel";
import { computeVerdict } from "./verdictEngine";
import type { SynthesisOutput, TrackSignal } from "@/lib/research/contracts";
import type { TrackResultRow } from "@/lib/data/track-results";

const synth = (over: Partial<SynthesisOutput> = {}): SynthesisOutput => ({
  module_1_normalized_evidence: [], module_2_claim_attributions: [], module_3_assertions: [],
  module_4_contradictions: [], module_5_hypotheses: { hypotheses: [], what_would_change_the_leader: "" },
  module_6_risk_gaps: [], module_7_doubt_calibration: { doubt_level: "minimal", doubt_focus: "", rationale: "" },
  module_8_vendor_questions: ["Where did you source these?"],
  module_9_decision_snapshot: {
    headline: "Vendor unverifiable", leading_interpretation: "Likely reseller",
    the_real_risk: "No paper trail", what_to_verify: ["ignored — UI uses Module 8"],
    what_to_monitor: ["Listing changes"],
  },
  ...over,
});

const trackRow = (n: number, key: string, signal: TrackSignal | null): TrackResultRow => ({
  id: `t${n}`, case_id: "c1", track: `track_${n}`, track_key: key, track_number: n,
  source_mode: "ai_generated", compiled_findings_json: null, confidence_score: 6,
  confidence_band: "moderate", finding_certainty: "inferred", founder_review_status: "approved",
  manual_review_required: false, manual_review_reason: null, manual_notes: null,
  evidence_items: [], reasoning_notes: `notes ${n}`, unknowns: [],
  evidence_weights_applied: [], track_verdict_signal: signal, suggested_signal: signal,
  attempt_number: 1,
});

const rows: TrackResultRow[] = [
  trackRow(0, "intake_scope_guard", "n_a"),
  trackRow(1, "supplier_identity", "pass"),
  trackRow(3, "brand_risk_assessment", "pass"),
];

describe("buildVerdictViewModel — ADR-T2-002 fields", () => {
  it("surfaces brand_relationship_finding + boundary notes from compiled_findings_json", () => {
    const t2 = trackRow(2, "supply_chain_relationship", "infer");
    t2.compiled_findings_json = {
      summary: "old conflated narrative",
      brand_relationship_finding: "Lenovo: confirmed authorized distributor.",
      identity_scope_note: "id", authorization_scope_note: "auth", marketplace_eligibility_disclaimer: "mkt",
    };
    const vm = buildVerdictViewModel({ trackRows: [trackRow(1, "supplier_identity", "pass"), t2], synthesis: null, ios: null });
    const track2 = vm.tracks.find((t) => t.track_number === 2)!;
    expect(track2.brand_relationship_finding).toContain("Lenovo");
    expect(track2.boundary_notes.map((n) => n.label)).toEqual(["Identity scope", "Authorization scope", "Marketplace eligibility"]);
    const track1 = vm.tracks.find((t) => t.track_number === 1)!;
    expect(track1.brand_relationship_finding).toBeNull();
    expect(track1.boundary_notes).toEqual([]);
  });
});

describe("buildVerdictViewModel", () => {
  it("recomputed verdict matches computeVerdict on the same persisted signals (determinism)", () => {
    const vm = buildVerdictViewModel({ trackRows: rows, synthesis: synth(), ios: null });
    const expected = computeVerdict(
      { supplier_identity: "pass", brand_risk_assessment: "pass" },
      synth(),
    );
    expect(vm.verdict).toEqual(expected);
    expect(vm.verdict?.verdict).toBe("source_clear");
  });

  it("excludes track_0 from the finding tracks list", () => {
    const vm = buildVerdictViewModel({ trackRows: rows, synthesis: synth(), ios: null });
    expect(vm.tracks.map((t) => t.track_number)).toEqual([1, 3]);
    expect(vm.tracks[0].dimension).toBe("Supplier Identity");
  });

  it("maps What to Verify to Module 8 vendor_questions, not snapshot.what_to_verify", () => {
    const vm = buildVerdictViewModel({ trackRows: rows, synthesis: synth(), ios: null });
    expect(vm.executiveSummary?.what_to_verify).toEqual(["Where did you source these?"]);
    expect(vm.executiveSummary?.what_to_monitor).toEqual(["Listing changes"]);
  });

  it("surfaces cross-track contradictions, hypotheses, doubt calibration", () => {
    const vm = buildVerdictViewModel({
      trackRows: rows,
      synthesis: synth({ module_4_contradictions: [{ is_load_bearing: true, risk_level: "high" }] }),
      ios: null,
    });
    expect(vm.crossTrack?.contradictions).toHaveLength(1);
    expect(vm.crossTrack?.contradictions[0].is_load_bearing).toBe(true);
  });

  it("reports engineComplete=false with no verdict/summary when synthesis is absent", () => {
    const vm = buildVerdictViewModel({ trackRows: rows, synthesis: null, ios: null });
    expect(vm.engineComplete).toBe(false);
    expect(vm.verdict).toBeNull();
    expect(vm.executiveSummary).toBeNull();
    expect(vm.tracks).toHaveLength(2); // tracks still listed
  });

  it("builds the engine trace from per-track signals", () => {
    const vm = buildVerdictViewModel({ trackRows: rows, synthesis: synth(), ios: null });
    expect(vm.trace.signals.map((s) => s.signal)).toEqual(["pass", "pass"]);
  });

  it("surfaces the verdict derivation (rejected verdicts) through the view model", () => {
    const vm = buildVerdictViewModel({ trackRows: rows, synthesis: synth(), ios: null });
    expect(vm.verdict?.derivation.rejected.length).toBe(3);
  });

  it("computes evidence coverage: counts, certainty mix, and tracks run vs skipped", () => {
    const withEvidence = [
      trackRow(1, "supplier_identity", "pass"),
      trackRow(3, "brand_risk_assessment", "infer"),
    ];
    withEvidence[0].evidence_items = [
      { evidence_id: "a", statement: "x", certainty: "verified", source_type: "third_party", source_url: null, claimant: "third_party", claimant_benefits: false, supports: "s", weight_key: "government_registration" },
      { evidence_id: "b", statement: "y", certainty: "inferred", source_type: "third_party", source_url: null, claimant: "third_party", claimant_benefits: false, supports: "s", weight_key: "address_verifiable" },
    ];
    const vm = buildVerdictViewModel({ trackRows: withEvidence, synthesis: synth(), ios: null, requiredTracks: [1, 3] });
    expect(vm.coverage?.total_evidence_items).toBe(2);
    expect(vm.coverage?.certainty).toEqual({ verified: 1, inferred: 1, unknown: 0 });
    expect(vm.coverage?.tracks_run).toBe(2);
    expect(vm.coverage?.tracks_skipped).toBe(3); // tracks 2,4,5 not required
  });

  it("computes gaps: missing = expected − found weight_keys; unknowns surfaced", () => {
    const docRow = trackRow(4, "documentation_review", "soft_fail");
    docRow.evidence_items = [];
    docRow.unknowns = [{ unknown: "No invoice supplied", why_unresolvable: "n/a", resolvable_by_client: true }];
    const vm = buildVerdictViewModel({ trackRows: [docRow], synthesis: synth(), ios: null });
    const docGap = vm.gaps?.per_track.find((g) => g.track_key === "documentation_review");
    expect(docGap?.missing.some((m) => m.evidence_type === "invoice_full")).toBe(true);
    expect(docGap?.missing.some((m) => m.label === "Full wholesale invoice")).toBe(true);
    expect(docGap?.unknowns).toHaveLength(1);
  });

  it("gaps suppress mutually-exclusive alternatives: a 5+ domain doesn't report 2-5 as missing", () => {
    const idRow = trackRow(1, "supplier_identity", "pass");
    idRow.evidence_items = [
      { evidence_id: "a", statement: "7y domain", certainty: "verified", source_type: "third_party", source_url: null, claimant: "third_party", claimant_benefits: false, supports: "s", weight_key: "domain_age_5_plus" },
    ];
    const vm = buildVerdictViewModel({ trackRows: [idRow], synthesis: synth(), ios: null });
    const idGap = vm.gaps?.per_track.find((g) => g.track_key === "supplier_identity");
    expect(idGap?.missing.some((m) => m.evidence_type === "domain_age_5_plus")).toBe(false); // found
    expect(idGap?.missing.some((m) => m.evidence_type === "domain_age_2_5")).toBe(false);    // sibling bucket suppressed
    expect(idGap?.missing.some((m) => m.evidence_type === "government_registration")).toBe(true); // unrelated, still missing
  });

  it("coverage and gaps are null when synthesis is absent", () => {
    const vm = buildVerdictViewModel({ trackRows: rows, synthesis: null, ios: null });
    expect(vm.coverage).toBeNull();
    expect(vm.gaps).toBeNull();
  });
});

// H3 — the ceiling is applied at THIS site too (one shared fn, three sites — divergence guard).
describe("buildVerdictViewModel — H3 verdict ceiling", () => {
  it("caps a score-clear case at usable_with_conditions when brand risk is n_a, and exposes the reason", () => {
    const vm = buildVerdictViewModel({
      trackRows: [
        trackRow(1, "supplier_identity", "pass"),
        trackRow(2, "supply_chain_relationship", "pass"),
        trackRow(3, "brand_risk_assessment", "n_a"),
        trackRow(4, "documentation_review", "n_a"),
      ],
      synthesis: synth(), ios: null,
    });
    expect(vm.verdict?.verdict).toBe("usable_with_conditions");
    expect(vm.ceiling?.ceiling_applied).toBe(true);
    expect(vm.ceiling?.original_verdict).toBe("source_clear");
    expect(vm.ceiling?.unassessed).toContain("brand_risk_assessment");
  });

  it("no ceiling when brand risk is assessed (existing fixture: verdict stands)", () => {
    const vm = buildVerdictViewModel({ trackRows: rows, synthesis: synth(), ios: null });
    expect(vm.ceiling?.ceiling_applied).toBe(false);
  });
});
