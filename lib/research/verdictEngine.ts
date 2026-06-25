import type { TrackKey } from "@/lib/constants/tracks";
import type { TrackSignal, VerdictResult, SynthesisOutput } from "@/lib/research/contracts";

// Layer 4b — Deterministic Judgment (ADR-G004). Reads only structured fields (enums + the
// synthesis's structured booleans) — never synthesis free-text (the verdict firewall). Phase 3:
// real weighted score + 8 veto rules + decision_confidence. Stage-1 scaffold: placeholder.
export function computeVerdict(
  signals: Partial<Record<TrackKey, TrackSignal>>,
  synthesis: SynthesisOutput,
): VerdictResult {
  const loadBearingContradiction = synthesis.module_4_contradictions.some((c) => c.is_load_bearing);
  const signalCount = Object.keys(signals).length;
  return {
    verdict: "verify_before_purchase",
    weighted_score: signalCount, // Phase 3: real ADR-G004 weighted score
    veto_fired: loadBearingContradiction,
    veto_reasons: loadBearingContradiction ? ["load_bearing_contradiction"] : [],
    decision_confidence: "low",
  };
}
