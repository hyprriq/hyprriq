// ── rejudge-case.ts attempt-targeting + honest reporting (founder-caught defect pair, 2026-07-16).
// DEFECT 1 (the honesty bug): a skipped verdict comparison printed the FULL "PASS — the stored
// record fully determines the verdict." line — the claim outran the artifact. DEFECT 2: the
// default rejudged the LATEST attempt, but cases.verdict belongs to the DELIVERED attempt on a
// delivered case — the only attempt the comparison is meaningful against. Pure helpers so the
// behavior is unit-locked (the F4 rederive pattern); the script stays thin.
// This module contains NO engine entry — the certified composition lives in the script itself.

export interface AttemptResolution {
  attempt: number;
  basis: "explicit" | "delivered_default" | "latest_default";
}

export function resolveRejudgeAttempt(input: {
  requested: number | null;
  deliveredAttempt: number | null;
  latestAttempt: number;
}): AttemptResolution {
  if (input.requested != null) return { attempt: input.requested, basis: "explicit" };
  if (input.deliveredAttempt != null) return { attempt: input.deliveredAttempt, basis: "delivered_default" };
  return { attempt: input.latestAttempt, basis: "latest_default" };
}

export type RejudgeOutcome = "pass" | "fail" | "tracks_only";

export interface RejudgeSummary {
  outcome: RejudgeOutcome;
  exitCode: 0 | 1 | 2;
  line: string;
  verdictComparable: boolean;
  verdictOk: boolean;
}

export function rejudgeSummary(input: {
  mismatches: number;
  attempt: number;
  deliveredAttempt: number | null;
  storedVerdict: string | null;
  rejudgedVerdict: string;
}): RejudgeSummary {
  // Comparable when the case is not delivered (cases.verdict tracks the latest attempt) or the
  // rejudged attempt IS the delivered one. A skipped comparison is a smaller test, said plainly.
  const verdictComparable = input.deliveredAttempt == null || input.attempt === input.deliveredAttempt;
  const verdictOk = !verdictComparable || input.storedVerdict === input.rejudgedVerdict;

  if (input.mismatches > 0 || (verdictComparable && !verdictOk)) {
    const verdictNote = verdictComparable && !verdictOk ? " + verdict mismatch" : "";
    return {
      outcome: "fail", exitCode: 1, verdictComparable, verdictOk,
      line: `FAIL — ${input.mismatches} signal mismatch(es)${verdictNote}.`,
    };
  }
  if (!verdictComparable) {
    return {
      outcome: "tracks_only", exitCode: 2, verdictComparable, verdictOk,
      line: `TRACKS-ONLY PASS — verdict comparison SKIPPED: rejudged attempt ${input.attempt} is not the delivered attempt ${input.deliveredAttempt}. The full determinism property was NOT tested.`,
    };
  }
  return {
    outcome: "pass", exitCode: 0, verdictComparable, verdictOk,
    line: "PASS — the stored record fully determines the verdict.",
  };
}
