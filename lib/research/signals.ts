import type { TrackKey } from "@/lib/constants/tracks";
import type { EvidenceWeight, SignalResult, TrackSignal } from "@/lib/research/contracts";
import { scoreToBand } from "@/lib/research/confidence";
import { weightFor } from "@/lib/research/weights";

export interface SignalDerivation extends SignalResult { applied: EvidenceWeight[] }

// Layer 4a — CODE derives the authoritative track_verdict_signal (enhancement #1). The LLM only
// reports which evidence_types it found; this function looks up ADR-G003 points, sums them, and
// maps to a signal. Fully deterministic: same evidence_types → same signal.
//
// Mapping (rubric v1, tunable via RUBRIC_VERSION):
//   hard-fail evidence present            → hard_fail (affirmative fraud/deception)
//   no evidence found at all              → soft_fail (absence — NOT fraud; Hard Rule #15)
//   score ≥ 8                             → pass
//   score ≥ 4                             → infer
//   else (evidence found, weak/negative)  → flag
export function deriveTrackSignal(track: TrackKey, foundEvidenceTypes: string[]): SignalDerivation {
  let raw = 0;
  let hardFail = false;
  const applied: EvidenceWeight[] = [];
  for (const t of foundEvidenceTypes) {
    const w = weightFor(track, t);
    if (!w) continue;
    raw += w.points;
    if (w.hard_fail) hardFail = true;
    applied.push({ evidence_type: t, points: w.points });
  }
  const score = Math.max(0, Math.min(15, raw));
  const band = scoreToBand(score);

  let signal: TrackSignal;
  if (hardFail) signal = "hard_fail";
  else if (applied.length === 0) signal = "soft_fail"; // absence of any recognized evidence
  else if (score >= 8) signal = "pass";
  else if (score >= 4) signal = "infer";
  else signal = "flag";

  return { signal, score_0_15: score, band, applied };
}
