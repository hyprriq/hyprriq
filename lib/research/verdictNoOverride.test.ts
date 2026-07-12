import { describe, it, expect } from "vitest";
import { applyDocumentationNoOverride } from "./verdictNoOverride";
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

// Founder-ruled (2026-07-12): "a document can never make the verdict better than the research
// supports… documents can raise concern; they can never manufacture comfort." Before this guard the
// guarantee was IMPLICIT AND INCOMPLETE — absolute for research vetoes (the verdict lock), absent
// for score-band effects: Track 4's 0.15 weight could lift a band (the counterexample below).
// ONE pure fn at ALL THREE verdict sites (the H3 ceiling pattern); computeVerdict untouched.
describe("applyDocumentationNoOverride", () => {
  it("THE COUNTEREXAMPLE: a perfect document must not lift a brand-concern case into Source Clear", () => {
    // Research alone: pass/pass/flag → (1.2+1.0+0.45)/0.85 = 3.12 → usable_with_conditions.
    // With a perfect document: +0.15·4 → 3.25 → source_clear — comfort manufactured. The guard blocks it.
    const signals = sig({ supplier_identity: "pass", supply_chain_relationship: "pass", brand_risk_assessment: "flag", documentation_review: "pass" });
    const withDoc = computeVerdict(signals, synth);
    expect(withDoc.verdict).toBe("source_clear"); // proves the lift is REAL pre-guard
    const g = applyDocumentationNoOverride(withDoc, signals, synth);
    expect(g.verdict).toBe("usable_with_conditions"); // the research-alone verdict
    expect(g.no_override_applied).toBe(true);
    expect(g.research_only_verdict).toBe("usable_with_conditions");
  });

  it("CONCERN STILL FIRES: a document that WORSENS the verdict stands — the guard is one-directional", () => {
    // Research alone: pass/flag/pass → (1.2+0.375+1.2)/0.85 = 3.26 → source_clear.
    // With a defective document (soft_fail): 2.775+0.075 = 2.85 → usable_with_conditions. The concern KEEPS.
    const signals = sig({ supplier_identity: "pass", supply_chain_relationship: "flag", brand_risk_assessment: "pass", documentation_review: "soft_fail" });
    const withDoc = computeVerdict(signals, synth);
    expect(withDoc.verdict).toBe("usable_with_conditions");
    const g = applyDocumentationNoOverride(withDoc, signals, synth);
    expect(g.verdict).toBe("usable_with_conditions"); // NOT restored to the research-alone source_clear
    expect(g.no_override_applied).toBe(false);
    expect(g.research_only_verdict).toBe("source_clear"); // recorded honestly for the audit trail
  });

  it("a document hard-fail keeps its FROZEN-engine effect (the VBP floor, verdictEngine.ts:92) — worse always wins", () => {
    // ADR-G004 (frozen): Track 4 hard_fail FLOORS at verify_before_purchase (document manipulation
    // ⇒ verify), unlike Tracks 1/3 which LOCK do_not_rely. The guard must pass the floor through.
    const signals = sig({ supplier_identity: "pass", supply_chain_relationship: "pass", brand_risk_assessment: "pass", documentation_review: "hard_fail" });
    const withDoc = computeVerdict(signals, synth);
    expect(withDoc.verdict).toBe("verify_before_purchase"); // the frozen floor
    const g = applyDocumentationNoOverride(withDoc, signals, synth);
    expect(g.verdict).toBe("verify_before_purchase"); // concern stands — never restored to research-only source_clear
    expect(g.no_override_applied).toBe(false);
    expect(g.research_only_verdict).toBe("source_clear");
  });

  it("no documents (n_a / absent) → exact no-op", () => {
    const na = sig({ supplier_identity: "pass", supply_chain_relationship: "pass", brand_risk_assessment: "pass", documentation_review: "n_a" });
    const v1 = computeVerdict(na, synth);
    const g1 = applyDocumentationNoOverride(v1, na, synth);
    expect(g1).toMatchObject({ verdict: v1.verdict, no_override_applied: false, research_only_verdict: null });
    const absent = sig({ supplier_identity: "pass", supply_chain_relationship: "pass", brand_risk_assessment: "pass" });
    const v2 = computeVerdict(absent, synth);
    const g2 = applyDocumentationNoOverride(v2, absent, synth);
    expect(g2.no_override_applied).toBe(false);
  });
});
