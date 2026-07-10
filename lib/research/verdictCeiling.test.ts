import { describe, it, expect } from "vitest";
import { applyVerdictCeiling } from "./verdictCeiling";
import { computeVerdict } from "./verdictEngine";
import type { SynthesisOutput, TrackSignal } from "@/lib/research/contracts";
import type { TrackKey } from "@/lib/constants/tracks";

const synth: SynthesisOutput = {
  module_1_normalized_evidence: [], module_2_claim_attributions: [], module_3_assertions: [],
  module_4_contradictions: [], module_5_hypotheses: { hypotheses: [], what_would_change_the_leader: "" },
  module_6_risk_gaps: [], module_7_doubt_calibration: { doubt_level: "minimal", doubt_focus: "", rationale: "t" },
  module_8_vendor_questions: [],
  module_9_decision_snapshot: { headline: "", leading_interpretation: "", the_real_risk: "", what_to_verify: [], what_to_monitor: [] },
};
const sig = (over: Partial<Record<TrackKey, TrackSignal>>): Partial<Record<TrackKey, TrackSignal>> => over;

// H3 — the verdict ceiling (approved design-round OQ-1): while brand_risk_assessment is unassessed,
// a score-derived source_clear is capped at usable_with_conditions. ONE pure function applied at
// ALL THREE verdict sites (pipeline, admin viewModel, rejudge) so they can never diverge.
describe("applyVerdictCeiling", () => {
  it("caps source_clear at usable_with_conditions while brand risk is unassessed", () => {
    const signals = sig({ supplier_identity: "pass", supply_chain_relationship: "pass", brand_risk_assessment: "n_a", documentation_review: "n_a" });
    const v = computeVerdict(signals, synth);
    expect(v.verdict).toBe("source_clear"); // the score says clear…
    const c = applyVerdictCeiling(v, signals);
    expect(c.verdict).toBe("usable_with_conditions"); // …the ceiling says not without brand risk
    expect(c.ceiling_applied).toBe(true);
    expect(c.original_verdict).toBe("source_clear");
    expect(c.unassessed).toContain("brand_risk_assessment");
    expect(c.ceiling_reason).toMatch(/Brand Risk/);
  });

  it("never rescues a bad case: do_not_rely passes through untouched", () => {
    const signals = sig({ supplier_identity: "hard_fail", supply_chain_relationship: "flag", brand_risk_assessment: "n_a" });
    const v = computeVerdict(signals, synth);
    expect(v.verdict).toBe("do_not_rely");
    const c = applyVerdictCeiling(v, signals);
    expect(c.verdict).toBe("do_not_rely");
    expect(c.ceiling_applied).toBe(false);
  });

  it("verify_before_purchase passes through untouched (only source_clear is capped)", () => {
    const signals = sig({ supplier_identity: "flag", supply_chain_relationship: "flag", brand_risk_assessment: "n_a" });
    const v = computeVerdict(signals, synth);
    const c = applyVerdictCeiling(v, signals);
    expect(c.verdict).toBe(v.verdict);
    expect(c.ceiling_applied).toBe(false);
    expect(c.unassessed).toContain("brand_risk_assessment"); // still reported honestly
  });

  it("no-op the day Track 3 ships (brand risk assessed → source_clear stands)", () => {
    const signals = sig({ supplier_identity: "pass", supply_chain_relationship: "pass", brand_risk_assessment: "pass", documentation_review: "pass" });
    const v = computeVerdict(signals, synth);
    expect(v.verdict).toBe("source_clear");
    const c = applyVerdictCeiling(v, signals);
    expect(c.verdict).toBe("source_clear");
    expect(c.ceiling_applied).toBe(false);
    expect(c.unassessed).toHaveLength(0);
  });

  // ── Track 3 gate, SO-5 (founder-signed 2026-07-10): the ceiling is KEPT, not deleted. Founder's
  // ruling, verbatim: "a cap that fires only on absence-of-assessment should be removed when
  // assessment becomes UNIVERSAL, not when it becomes available. It isn't universal. Keep it; it
  // retires itself." This test is the LOCK on that self-retirement claim — and the thing that tells
  // a future session why the ceiling is still here after Track 3 shipped. ──
  it("SO-5 lock: post-Track-3, an llm_failed brand-risk case (n_a) is STILL capped — the ceiling self-retires only where assessment ran", () => {
    // Track 3 is live, but THIS case's track-3 model call failed → n_a (H2). A source_clear built
    // without brand risk remains indefensible; deleting the ceiling would have reopened N2 here.
    const failedShape = sig({ supplier_identity: "pass", supply_chain_relationship: "pass", brand_risk_assessment: "n_a", documentation_review: "pass" });
    const v = computeVerdict(failedShape, synth);
    const c = applyVerdictCeiling(v, failedShape);
    if (v.verdict === "source_clear") {
      expect(c.verdict).toBe("usable_with_conditions");
      expect(c.ceiling_applied).toBe(true);
    }
    expect(c.unassessed).toContain("brand_risk_assessment");
  });

  it("reachability after H3: a strong two-track case lands usable_with_conditions, not the old VBP floor", () => {
    // Pre-H3, stub Track 3 scored soft_fail and FLOORED this exact shape at verify_before_purchase.
    const signals = sig({ supplier_identity: "pass", supply_chain_relationship: "infer", brand_risk_assessment: "n_a", documentation_review: "n_a", sourcing_logic: "n_a" });
    const v = computeVerdict(signals, synth);
    const c = applyVerdictCeiling(v, signals);
    expect(["usable_with_conditions", "source_clear"]).toContain(v.verdict);
    expect(c.verdict).toBe("usable_with_conditions");
  });
});
