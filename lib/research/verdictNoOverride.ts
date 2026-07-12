import type { TrackKey } from "@/lib/constants/tracks";
import type { SynthesisOutput, TrackSignal, Verdict, VerdictResult } from "@/lib/research/contracts";
import { computeVerdict } from "@/lib/research/verdictEngine";

// Founder-ruled (2026-07-12, the multi-document gate): "a document can never make the verdict
// better than the research supports… documents can raise concern; they can never manufacture
// comfort." Invoice-acceptance risk and brand-enforcement risk are independent events — a valid
// LOA must not cancel a brand-enforcement concern found in research.
//
// Before this file the guarantee was IMPLICIT AND INCOMPLETE: absolute for research vetoes (the
// hard-fail verdict lock in the frozen computeVerdict — no score overrides it) but ABSENT for
// score-band effects — Track 4's 0.15 weight could lift a band (pass/pass/flag = 3.12 → UWC on
// research alone; +document pass = 3.25 → source_clear). This makes it EXPLICIT.
//
// RULES OF THIS FILE (the H3 verdictCeiling discipline):
// - Pure wrapper applied AFTER the frozen computeVerdict — never inside it. Only ever DOWNGRADES
//   back to the research-only verdict; never upgrades, never rescues, never blocks a document-
//   driven downgrade (concern always stands).
// - Applied at ALL THREE verdict sites — pipeline stageVerdict, admin buildVerdictViewModel,
//   scripts/rejudge-case.ts — one shared function, or it doesn't ship (the pattern rule).
// - The research-only verdict is computed by re-running the SAME frozen engine with
//   documentation_review excluded (n_a → its weight redistributes) — deterministic, no persistence
//   needed: derivable from stored signals at every site, exactly like the ceiling.

const RANK: Record<Verdict, number> = { do_not_rely: 0, verify_before_purchase: 1, usable_with_conditions: 2, source_clear: 3 };

export interface NoOverrideResult {
  verdict: Verdict;
  no_override_applied: boolean;          // true = a document-driven band LIFT was blocked
  research_only_verdict: Verdict | null; // what research alone supports (null when no documents voted)
}

export function applyDocumentationNoOverride(
  result: Pick<VerdictResult, "verdict">,
  signals: Partial<Record<TrackKey, TrackSignal>>,
  synthesis: SynthesisOutput,
): NoOverrideResult {
  const t4 = signals.documentation_review;
  if (!t4 || t4 === "n_a") return { verdict: result.verdict, no_override_applied: false, research_only_verdict: null };
  const researchOnly = computeVerdict({ ...signals, documentation_review: "n_a" }, synthesis).verdict;
  if (RANK[result.verdict] > RANK[researchOnly]) {
    return { verdict: researchOnly, no_override_applied: true, research_only_verdict: researchOnly };
  }
  return { verdict: result.verdict, no_override_applied: false, research_only_verdict: researchOnly };
}
