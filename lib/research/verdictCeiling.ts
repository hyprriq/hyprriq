import type { TrackKey } from "@/lib/constants/tracks";
import type { TrackSignal, Verdict, VerdictResult } from "@/lib/research/contracts";

// H3 — verdict ceiling (approved design-round OQ-1): while brand_risk_assessment is unassessed
// (n_a / absent), the score-verdict is capped at usable_with_conditions — a source_clear that
// never examined brand risk (30% weight, "the actual account risk") is indefensible.
//
// RULES OF THIS FILE:
// - Pure wrapper applied AFTER the frozen computeVerdict — never inside it. Only DOWNGRADES
//   source_clear; never upgrades, never rescues a bad case.
// - Applied at ALL THREE verdict sites — pipeline stageVerdict, admin buildVerdictViewModel,
//   scripts/rejudge-case.ts — so stored / displayed / re-derived verdicts can never diverge.
//   (Pattern rule: any post-verdict adjustment is ONE shared function at every site, or it
//   doesn't ship.)
// - KEPT per SO-5 (founder-signed 2026-07-10; Track 3 HAS shipped): the ceiling SELF-RETIRES —
//   assessed cases pass through untouched, while plan-excluded and llm-failed cases (brand risk
//   n_a) keep the N2 protection forever. DO NOT DELETE the call-sites; the SO-5 lock test in
//   verdictCeiling.test.ts enforces this, and the founder ruling reads: "a cap that fires only on
//   absence-of-assessment should be removed when assessment becomes UNIVERSAL, not when it becomes
//   available. It isn't universal. Keep it; it retires itself."

// Local copy of the four scoring dimensions (do not export from the frozen verdictEngine.ts).
const SCORING_TRACKS: TrackKey[] = [
  "supplier_identity", "supply_chain_relationship", "brand_risk_assessment", "documentation_review",
];

export interface CeilingResult {
  verdict: Verdict;
  ceiling_applied: boolean;
  original_verdict: Verdict;
  unassessed: TrackKey[];        // scoring dimensions with no signal / n_a — reported honestly either way
  ceiling_reason: string | null;
}

export function applyVerdictCeiling(
  result: Pick<VerdictResult, "verdict">,
  signals: Partial<Record<TrackKey, TrackSignal>>,
): CeilingResult {
  const unassessed = SCORING_TRACKS.filter((t) => !signals[t] || signals[t] === "n_a");
  const brandRiskUnassessed = unassessed.includes("brand_risk_assessment");
  if (brandRiskUnassessed && result.verdict === "source_clear") {
    return {
      verdict: "usable_with_conditions",
      ceiling_applied: true,
      original_verdict: "source_clear",
      unassessed,
      ceiling_reason:
        "Score qualified for Source Clear, capped at Usable With Conditions — Brand Risk Assessment was not part of this report.",
    };
  }
  return { verdict: result.verdict, ceiling_applied: false, original_verdict: result.verdict, unassessed, ceiling_reason: null };
}
