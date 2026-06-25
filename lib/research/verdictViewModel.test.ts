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
  failure_type: null, attempt_number: 1,
});

const rows: TrackResultRow[] = [
  trackRow(0, "intake_scope_guard", "n_a"),
  trackRow(1, "supplier_identity", "pass"),
  trackRow(3, "brand_risk_assessment", "pass"),
];

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
});
