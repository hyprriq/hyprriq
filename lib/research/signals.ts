import type { EvidenceWeight, SignalResult, TrackSignal } from "@/lib/research/contracts";
import { scoreToBand } from "@/lib/research/confidence";

// Layer 4a — CODE derives the authoritative track_verdict_signal (enhancement #1). The LLM
// never decides PASS/FAIL. Phase 3: full ADR-G003 weight tables + hard/soft-fail registry.
// Stage-1 scaffold: sums applied weights into 0–15; hard/soft-fail hits short-circuit.
export function deriveTrackSignal(
  weights: EvidenceWeight[],
  hardFailHits: string[],
  softFailHits: string[],
): SignalResult {
  const score = Math.max(0, Math.min(15, weights.reduce((s, w) => s + w.points, 0)));
  const band = scoreToBand(score);
  const signal: TrackSignal =
    hardFailHits.length > 0 ? "hard_fail" : softFailHits.length > 0 ? "soft_fail" : "n_a";
  return { signal, score_0_15: score, band };
}
