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

describe("computeVerdict derivation trace (Phase 4.5)", () => {
  const scenario = () => {
    const s = emptySynth();
    s.module_4_contradictions = [
      { is_load_bearing: true, risk_level: "high" },
      { is_load_bearing: true, risk_level: "moderate" },
    ];
    return computeVerdict(sig({
      supplier_identity: "pass", supply_chain_relationship: "flag",
      brand_risk_assessment: "infer", documentation_review: "soft_fail",
    }), s);
  };

  it("raw_score and score_verdict reflect the score BEFORE vetoes; final is floored", () => {
    const r = scenario();
    expect(r.derivation.raw_score).toBeCloseTo(2.4, 5);
    expect(r.derivation.score_verdict).toBe("usable_with_conditions"); // score alone
    expect(r.verdict).toBe("verify_before_purchase");                  // after veto floor
    expect(r.derivation.final_differs_from_score).toBe(true);
  });

  it("contributions cover all four scoring tracks and sum to the weighted score", () => {
    const r = scenario();
    expect(r.derivation.contributions).toHaveLength(4);
    const sum = r.derivation.contributions.reduce((a, c) => a + c.contribution, 0);
    expect(sum / r.derivation.total_weight).toBeCloseTo(r.derivation.raw_score, 5);
  });

  it("records the load-bearing veto as a structured floor step", () => {
    const r = scenario();
    expect(r.derivation.vetoes).toEqual([
      { kind: "floor", verdict: "verify_before_purchase", reason: "2 load-bearing contradictions" },
    ]);
  });

  it("rejected[] explains all three unchosen verdicts deterministically", () => {
    const r = scenario();
    const byVerdict = Object.fromEntries(r.derivation.rejected.map((x) => [x.verdict, x.reason]));
    expect(Object.keys(byVerdict).sort()).toEqual(
      ["do_not_rely", "source_clear", "usable_with_conditions"].sort(),
    );
    expect(byVerdict.source_clear).toMatch(/3\.2/);            // score below threshold
    expect(byVerdict.usable_with_conditions).toMatch(/qualified/i); // score ok, capped by veto
    expect(byVerdict.do_not_rely).toMatch(/no .*hard-fail/i);  // higher severity not triggered
    expect(r.derivation.rejected.some((x) => x.verdict === "verify_before_purchase")).toBe(false);
  });

  it("margin matches the decision-confidence boundary distance", () => {
    const r = scenario();
    expect(r.derivation.margin.nearest_boundary).toBe(2.2);
    expect(r.derivation.margin.distance).toBeCloseTo(0.2, 5);
    expect(r.decision_confidence).toBe("low"); // < 0.25
  });

  it("a hard_fail lock is recorded as a lock step and decision confidence stays high", () => {
    const r = computeVerdict(sig({ supplier_identity: "hard_fail", brand_risk_assessment: "pass" }), emptySynth());
    expect(r.derivation.vetoes.some((v) => v.kind === "lock" && v.verdict === "do_not_rely")).toBe(true);
    expect(r.verdict).toBe("do_not_rely");
    expect(r.decision_confidence).toBe("high");
  });
});
