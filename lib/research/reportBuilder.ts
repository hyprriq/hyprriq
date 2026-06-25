import type { SynthesisOutput, VerdictResult } from "@/lib/research/contracts";

export interface ReportPayload {
  verdict: VerdictResult["verdict"];
  decision_confidence: VerdictResult["decision_confidence"];
  snapshot: SynthesisOutput["module_9_decision_snapshot"];
  vendor_questions: string[];
}

// Layer 5 — Report Communication (DETERMINISTIC CODE). Consumes the Decision Snapshot
// (produced by the LLM in Layer 3) + the verdict. The LLM never writes the delivered report.
// Phase H: React-PDF. Stage-1 scaffold: assembles the payload shape.
export function buildReport(synthesis: SynthesisOutput, verdict: VerdictResult): ReportPayload {
  return {
    verdict: verdict.verdict,
    decision_confidence: verdict.decision_confidence,
    snapshot: synthesis.module_9_decision_snapshot,
    vendor_questions: synthesis.module_8_vendor_questions,
  };
}
