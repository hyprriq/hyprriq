import type { NormalizedEvidence, SynthesisOutput } from "@/lib/research/contracts";

// Layer 3 — Intelligence Reasoning (LLM: Sonnet in dev, Opus before go-live via runModel).
// Runs the fixed nine-module method (ADR-G005). Phase 6: real Opus prompt. Stage-1 scaffold:
// returns a typed placeholder snapshot so the skeleton flow can run end-to-end.
export function runSynthesis(evidence: NormalizedEvidence): Promise<SynthesisOutput> {
  return Promise.resolve({
    module_1_normalized_evidence: evidence.items,
    module_2_claim_attributions: [],
    module_3_assertions: [],
    module_4_contradictions: [],
    module_5_hypotheses: { hypotheses: [], what_would_change_the_leader: "" },
    module_6_risk_gaps: [],
    module_7_doubt_calibration: { doubt_level: "minimal", doubt_focus: "", rationale: "stub" },
    module_8_vendor_questions: [],
    module_9_decision_snapshot: {
      headline: "stub", leading_interpretation: "", the_real_risk: "",
      what_to_verify: [], what_to_monitor: [],
    },
  });
}
