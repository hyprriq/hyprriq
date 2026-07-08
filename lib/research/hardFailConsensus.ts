// H7 (SO-4, founder-signed) — the highest-stakes keys must survive TWO independent extraction
// passes over the SAME frozen pack before they can veto. This is the direct fix for "same evidence,
// morning hard_fail / evening pass": re-extracting over the frozen pack tests EXTRACTION stability
// without adding collection variance. Pure reconciler: deterministic given the two outputs.
// OQ-A (founder-ruled): on a failed second call we cannot confirm OR deny — keys are KEPT and the
// caller escalates to manual review (fail toward caution + human; a real problem must never
// disappear because of an infra hiccup, and the gate must never silently defeat itself).
export interface ConsensusOutcome {
  confirmed: string[];
  dropped: string[];
  second_call_failed: boolean;
}

export function reconcileHardFailConsensus(
  hardFailKeys: string[],
  secondPassProposedKeys: string[] | null,
): ConsensusOutcome {
  if (hardFailKeys.length === 0) return { confirmed: [], dropped: [], second_call_failed: false };
  if (secondPassProposedKeys === null) return { confirmed: [...hardFailKeys], dropped: [], second_call_failed: true };
  const second = new Set(secondPassProposedKeys);
  return {
    confirmed: hardFailKeys.filter((k) => second.has(k)),
    dropped: hardFailKeys.filter((k) => !second.has(k)),
    second_call_failed: false,
  };
}
