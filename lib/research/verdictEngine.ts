import type { TrackKey } from "@/lib/constants/tracks";
import type {
  TrackSignal, VerdictResult, SynthesisOutput, Verdict,
  TrackContribution, VetoStep, RejectedVerdict, VerdictDerivation,
} from "@/lib/research/contracts";
import { SIGNAL_SCORE, TRACK_WEIGHTS } from "@/lib/research/weights";

// Layer 4b — Deterministic Judgment (ADR-G004). Reads ONLY structured fields (signal enums +
// the synthesis's structured contradiction flags) — never synthesis free-text (the verdict
// firewall). Same inputs → same verdict, always.
//
// Phase 4.5: this function also emits a `derivation` trace (contributions, score-verdict, vetoes,
// margin, rejected-verdict reasons) so the UI can EXPLAIN the verdict. ADR-G004 logic lives ONLY
// here — the explanation is captured from the same evaluation, never re-derived elsewhere.
const SCORING_TRACKS: TrackKey[] = [
  "supplier_identity", "supply_chain_relationship", "brand_risk_assessment", "documentation_review",
]; // Track 5 (sourcing_logic) arbitrates via synthesis — it does not vote.

const SEVERITY: Record<Verdict, number> = {
  source_clear: 0, usable_with_conditions: 1, verify_before_purchase: 2, do_not_rely: 3,
};
const THRESHOLDS = { source_clear: 3.2, usable_with_conditions: 2.2, verify_before_purchase: 1.2 } as const;
const BOUNDARIES = [3.2, 2.2, 1.2];
const NAME: Record<Verdict, string> = {
  source_clear: "Source Clear", usable_with_conditions: "Usable With Conditions",
  verify_before_purchase: "Verify Before Purchase", do_not_rely: "Do Not Rely",
};
// Minimum score for a verdict's band (score-only). do_not_rely is the floor band (any score < 1.2).
const MIN_SCORE: Record<Verdict, number> = {
  source_clear: 3.2, usable_with_conditions: 2.2, verify_before_purchase: 1.2, do_not_rely: 0,
};
// Veto-reachable severities and the human description of what would trigger them.
const VETO_TRIGGER: Partial<Record<Verdict, string>> = {
  verify_before_purchase: "Track-1/3 soft-fail, Track-4 hard-fail, or ≥2 load-bearing contradictions",
  do_not_rely: "Track-1/3 hard-fail or a critical contradiction",
};

function scoreToVerdict(s: number): Verdict {
  if (s >= 3.2) return "source_clear";
  if (s >= 2.2) return "usable_with_conditions";
  if (s >= 1.2) return "verify_before_purchase";
  return "do_not_rely";
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function computeVerdict(
  signals: Partial<Record<TrackKey, TrackSignal>>,
  synthesis: SynthesisOutput,
): VerdictResult {
  // Weighted score over the four scoring tracks. Skipped/n_a tracks are excluded and the
  // remaining weights are redistributed (divide by totalWeight) — keeps the 0–4 scale.
  const contributions: TrackContribution[] = [];
  let totalWeight = 0;
  let weightedSum = 0;
  for (const t of SCORING_TRACKS) {
    const sig = signals[t];
    const weight = TRACK_WEIGHTS[t];
    const included = !!sig && sig !== "n_a";
    const signal_score = included ? (SIGNAL_SCORE[sig] ?? 0) : 0;
    const contribution = signal_score * weight;
    if (included) {
      weightedSum += contribution;
      totalWeight += weight;
    }
    contributions.push({ track_key: t, signal: sig ?? "n_a", signal_score, weight, contribution, included });
  }
  const weighted_score = totalWeight > 0 ? weightedSum / totalWeight : 0; // 0–4
  const score_verdict = scoreToVerdict(weighted_score);
  let verdict = score_verdict;

  // ── Veto rules (ADR-G004 Part 4) — applied after the score ──
  const reasons: string[] = [];
  const vetoes: VetoStep[] = [];
  let locked: Verdict | null = null;
  let floor: Verdict | null = null;
  const raiseFloor = (v: Verdict, reason: string) => {
    if (!floor || SEVERITY[v] > SEVERITY[floor]) floor = v;
    reasons.push(reason);
    vetoes.push({ kind: "floor", verdict: v, reason });
  };
  const lock = (v: Verdict, reason: string) => {
    if (!locked || SEVERITY[v] > SEVERITY[locked]) locked = v;
    reasons.push(reason);
    vetoes.push({ kind: "lock", verdict: v, reason });
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

  // Distance to the nearest band boundary (informational; also drives decision_confidence).
  let distance = Infinity;
  let nearest_boundary = BOUNDARIES[0];
  for (const b of BOUNDARIES) {
    const d = Math.abs(weighted_score - b);
    if (d < distance) { distance = d; nearest_boundary = b; }
  }

  // Decision confidence = how flippable this verdict is. A lock is decisive (high). Otherwise
  // small margin to the nearest band boundary → low confidence.
  const decision_confidence: VerdictResult["decision_confidence"] = locked
    ? "high"
    : distance < 0.25 ? "low" : distance < 0.6 ? "moderate" : "high";

  // "Why Not?" — for each unchosen verdict, the deterministic reason it wasn't the outcome.
  const vetoNoun = reasons.join("; ");
  const rejected: RejectedVerdict[] = (Object.keys(SEVERITY) as Verdict[])
    .filter((c) => c !== verdict)
    .map((c) => ({ verdict: c, reason: rejectionReason(c, verdict, weighted_score, score_verdict, vetoNoun) }));

  const derivation: VerdictDerivation = {
    contributions,
    total_weight: totalWeight,
    weighted_sum: weightedSum,
    raw_score: weighted_score,
    thresholds: THRESHOLDS,
    score_verdict,
    vetoes,
    final_differs_from_score: verdict !== score_verdict,
    margin: { distance, nearest_boundary },
    rejected,
  };

  return {
    verdict,
    weighted_score,
    confidence_0_15: Math.round((weighted_score / 4) * 15),
    veto_fired: reasons.length > 0,
    veto_reasons: reasons,
    decision_confidence,
    derivation,
  };
}

// Deterministic per-candidate rejection reasoning. Uses the SAME thresholds/veto state the verdict
// was computed from — no second encoding of ADR-G004.
function rejectionReason(c: Verdict, final: Verdict, raw: number, scoreVerdict: Verdict, vetoNoun: string): string {
  const sevC = SEVERITY[c];
  const sevF = SEVERITY[final];
  const r = raw.toFixed(2);
  if (sevC < sevF) {
    // More favorable than the outcome: blocked by score, or capped by a veto.
    if (raw < MIN_SCORE[c]) return `Score ${r} is below the ${MIN_SCORE[c]} threshold for ${NAME[c]}.`;
    return `Score qualified (${r} ≥ ${MIN_SCORE[c]}), but ${vetoNoun || "a veto"} capped the verdict at ${NAME[final]}.`;
  }
  // More severe than the outcome: its triggers didn't occur.
  const parts = [`the weighted score ${r} maps to ${NAME[scoreVerdict]}`];
  if (VETO_TRIGGER[c]) parts.push(`no ${VETO_TRIGGER[c]} fired`);
  return `${cap(parts.join("; "))}.`;
}
