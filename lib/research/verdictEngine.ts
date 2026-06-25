import type { TrackKey } from "@/lib/constants/tracks";
import type { TrackSignal, VerdictResult, SynthesisOutput, Verdict } from "@/lib/research/contracts";
import { SIGNAL_SCORE, TRACK_WEIGHTS } from "@/lib/research/weights";

// Layer 4b — Deterministic Judgment (ADR-G004). Reads ONLY structured fields (signal enums +
// the synthesis's structured contradiction flags) — never synthesis free-text (the verdict
// firewall). Same inputs → same verdict, always.
const SCORING_TRACKS: TrackKey[] = [
  "supplier_identity", "supply_chain_relationship", "brand_risk_assessment", "documentation_review",
]; // Track 5 (sourcing_logic) arbitrates via synthesis — it does not vote.

const SEVERITY: Record<Verdict, number> = {
  source_clear: 0, usable_with_conditions: 1, verify_before_purchase: 2, do_not_rely: 3,
};

function scoreToVerdict(s: number): Verdict {
  if (s >= 3.2) return "source_clear";
  if (s >= 2.2) return "usable_with_conditions";
  if (s >= 1.2) return "verify_before_purchase";
  return "do_not_rely";
}

export function computeVerdict(
  signals: Partial<Record<TrackKey, TrackSignal>>,
  synthesis: SynthesisOutput,
): VerdictResult {
  // Weighted score over the four scoring tracks. Skipped/n_a tracks are excluded and the
  // remaining weights are redistributed (divide by totalWeight) — keeps the 0–4 scale.
  let totalWeight = 0;
  let weightedSum = 0;
  for (const t of SCORING_TRACKS) {
    const sig = signals[t];
    if (!sig || sig === "n_a") continue;
    const w = TRACK_WEIGHTS[t];
    weightedSum += (SIGNAL_SCORE[sig] ?? 0) * w;
    totalWeight += w;
  }
  const weighted_score = totalWeight > 0 ? weightedSum / totalWeight : 0; // 0–4
  let verdict = scoreToVerdict(weighted_score);

  // ── Veto rules (ADR-G004 Part 4) — applied after the score ──
  const reasons: string[] = [];
  let locked: Verdict | null = null;
  let floor: Verdict | null = null;
  const raiseFloor = (v: Verdict, reason: string) => {
    if (!floor || SEVERITY[v] > SEVERITY[floor]) floor = v;
    reasons.push(reason);
  };
  const lock = (v: Verdict, reason: string) => {
    if (!locked || SEVERITY[v] > SEVERITY[locked]) locked = v;
    reasons.push(reason);
  };

  if (signals.supplier_identity === "hard_fail") lock("do_not_rely", "Track 1 hard_fail — fabrication/fraud");
  if (signals.brand_risk_assessment === "hard_fail") lock("do_not_rely", "Track 3 hard_fail — active enforcement");
  if (signals.supplier_identity === "soft_fail") raiseFloor("verify_before_purchase", "Track 1 soft_fail — vendor unverifiable");
  if (signals.brand_risk_assessment === "soft_fail") raiseFloor("verify_before_purchase", "Track 3 soft_fail — brand risk unassessable");
  if (signals.documentation_review === "hard_fail") raiseFloor("verify_before_purchase", "Track 4 hard_fail — document manipulation");

  const contradictions = synthesis.module_4_contradictions ?? [];
  const loadBearing = contradictions.filter((c) => c.is_load_bearing).length;
  const critical = contradictions.some((c) => c.risk_level === "critical");
  if (loadBearing >= 2) raiseFloor("verify_before_purchase", `${loadBearing} load-bearing contradictions`);
  if (critical) lock("do_not_rely", "critical contradiction — scenario cannot be trusted");

  if (locked) verdict = locked;
  else if (floor && SEVERITY[floor] > SEVERITY[verdict]) verdict = floor;

  // Decision confidence = how flippable this verdict is. A lock is decisive (high). Otherwise
  // small margin to the nearest band boundary → low confidence.
  let decision_confidence: VerdictResult["decision_confidence"];
  if (locked) {
    decision_confidence = "high";
  } else {
    const margin = Math.min(
      ...[3.2, 2.2, 1.2].map((b) => Math.abs(weighted_score - b)),
    );
    decision_confidence = margin < 0.25 ? "low" : margin < 0.6 ? "moderate" : "high";
  }

  return {
    verdict,
    weighted_score,
    confidence_0_15: Math.round((weighted_score / 4) * 15),
    veto_fired: reasons.length > 0,
    veto_reasons: reasons,
    decision_confidence,
  };
}
