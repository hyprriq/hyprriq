import { describe, it, expect } from "vitest";
import { computeVerdict } from "./verdictEngine";
import type { SynthesisOutput, TrackSignal } from "@/lib/research/contracts";
import type { TrackKey } from "@/lib/constants/tracks";

const emptySynth = (): SynthesisOutput => ({
  module_1_normalized_evidence: [], module_2_claim_attributions: [], module_3_assertions: [],
  module_4_contradictions: [], module_5_hypotheses: { hypotheses: [], what_would_change_the_leader: "" },
  module_6_risk_gaps: [], module_7_doubt_calibration: { doubt_level: "minimal", doubt_focus: "", rationale: "" },
  module_8_vendor_questions: [], module_9_decision_snapshot: { headline: "", leading_interpretation: "", the_real_risk: "", what_to_verify: [], what_to_monitor: [] },
});

const sig = (o: Partial<Record<TrackKey, TrackSignal>>) => o;

describe("computeVerdict (deterministic, ADR-G004)", () => {
  it("worked example: pass/soft_fail/flag/flag → 2.0 → verify_before_purchase, no veto", () => {
    const r = computeVerdict(sig({
      supplier_identity: "pass", supply_chain_relationship: "soft_fail",
      brand_risk_assessment: "flag", documentation_review: "flag",
    }), emptySynth());
    expect(r.weighted_score).toBeCloseTo(2.0, 5);
    expect(r.verdict).toBe("verify_before_purchase");
    expect(r.veto_fired).toBe(false);
  });
  it("all pass → source_clear", () => {
    const r = computeVerdict(sig({
      supplier_identity: "pass", supply_chain_relationship: "pass",
      brand_risk_assessment: "pass", documentation_review: "pass",
    }), emptySynth());
    expect(r.weighted_score).toBeCloseTo(4.0, 5);
    expect(r.verdict).toBe("source_clear");
  });
  it("Track 1 hard_fail locks Do Not Rely even with otherwise strong signals", () => {
    const r = computeVerdict(sig({
      supplier_identity: "hard_fail", supply_chain_relationship: "pass",
      brand_risk_assessment: "pass", documentation_review: "pass",
    }), emptySynth());
    expect(r.verdict).toBe("do_not_rely");
    expect(r.veto_fired).toBe(true);
  });
  it("Track 3 soft_fail floors at Verify Before Purchase", () => {
    const r = computeVerdict(sig({
      supplier_identity: "pass", supply_chain_relationship: "pass",
      brand_risk_assessment: "soft_fail", documentation_review: "pass",
    }), emptySynth());
    // score would map to source_clear/uwc, but the soft_fail floor caps it
    expect(r.verdict).toBe("verify_before_purchase");
  });
  it("critical contradiction locks Do Not Rely", () => {
    const s = emptySynth();
    s.module_4_contradictions = [{ is_load_bearing: true, risk_level: "critical" }];
    const r = computeVerdict(sig({ supplier_identity: "pass", brand_risk_assessment: "pass" }), s);
    expect(r.verdict).toBe("do_not_rely");
  });
  it("redistributes weights for skipped tracks (single_99: only 1 & 3) and is deterministic", () => {
    const input = sig({ supplier_identity: "pass", brand_risk_assessment: "pass" });
    const a = computeVerdict(input, emptySynth());
    const b = computeVerdict(input, emptySynth());
    expect(a.verdict).toBe(b.verdict);
    expect(a.weighted_score).toBeCloseTo(4.0, 5); // both pass → 4.0 after redistribution
    expect(a.verdict).toBe("source_clear");
  });
});
