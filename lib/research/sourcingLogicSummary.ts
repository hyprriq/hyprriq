// ── WHAT THE CONSISTENCY CHECK ACTUALLY FOUND, in a client's words ───────────────────────────
//
// ⚠ WHY THIS EXISTS (founder-reported 2026-09-01, from the first real delivered report). Track 5
// ran on AWI-2608-045 and produced a result — signal n_a, flags [b2b_only_archetype,
// no_documentation_provided], zero contradictions, coherence "consistent". The PDF printed the
// heading, the word "Informational", and NOTHING ELSE, because the client-visible `summary` held
// the SCOPE NOTE ("Consistency check — informational; does not affect the verdict") instead of a
// finding. It read as broken on the one page where it had worked.
//
// THE FOUNDER'S RULING: "When it finds no contradictions that is a RESULT, not an absence. It
// should say so plainly. Silence is the one thing it should not say."
//
// ⛔ AND THE SENTENCE IS DERIVED FROM WHAT THE CODE ACTUALLY COMPARES, NOT FROM WHAT WE WISH IT
// COMPARED. The ruling's example named "price against channel, brand mix against supplier size,
// the stated route against what we could observe". Track 5 does none of those. It runs exactly two
// detectors over the stored track rows of one attempt:
//
//   1. documentation_comfort_vs_web_risk — vendor-supplied documentation validated POSITIVELY
//      while independent research on another area validated a disqualifier.
//   2. cross_track_signal_divergence — one area scored `pass` while another `hard_fail`.
//
// Writing the example verbatim would have printed checks that never ran, on a client deliverable.
// The wording below says only what happened. (Flagged to the founder rather than silently decided.)
//
// ⚠⚠ THE SECOND FINDING, AND IT IS THE LARGER ONE. "consistent" is derived from
// `contradictions.length === 0`, which CONFLATES two different worlds:
//   · the detectors had material and found no conflict, and
//   · the detectors could not possibly have fired.
// On AWI-2608-045 it was the SECOND: no documentation was provided (detector 1 inert) and no area
// scored pass or hard_fail — all three were `flag` (detector 2 inert). Reporting "we checked and
// nothing conflicted" there would be the same class of error as a guard that refuses everything
// looking like one that works: a clean result that was never actually at risk of being dirty.
// So `comparable` is computed separately and the copy tells the truth about which world it is.
//
// ⛔ CODE-TEMPLATED, NEVER MODEL PROSE. Track 5 is the deterministic, derived-only track (OQ-B3);
// its client sentence must reproduce exactly on replay, and must carry no method vocabulary, no
// weight keys and no track_key strings — the derivation scanner runs over this output like any
// other client prose.

export type CoherenceAssessment = "consistent" | "tension" | "insufficient_data";

/** What the two detectors had to work with — see the note above on why this is separate. */
export interface SourcingComparability {
  /** Detector 1 could fire: documentation was supplied AND validated positively. */
  documentsToCompare: boolean;
  /** Detector 2 could fire: at least one area scored `pass` and at least one `hard_fail`. */
  opposingSignals: boolean;
}

/**
 * The exact client-visible sentence for a Track 5 row. Deterministic, plain, and honest about
 * whether a comparison was possible at all.
 *
 * ⚠ THESE STRINGS ARE CLIENT-FACING PRODUCT COPY. They are exported as named constants, not
 * inlined, so the founder can change the wording in one place and a test can assert exactly what
 * ships. Any edit here changes what a paying client reads.
 */
export const SOURCING_TENSION =
  "Areas of this report point in different directions. That tension is described in the verdict and the areas above; it is recorded here rather than resolved.";

export const SOURCING_CLEAR =
  "We compared each area's findings against the others — including whether the paperwork provided points the same way as what we found independently — and nothing conflicted.";

export const SOURCING_CLEAR_NOTHING_TO_COMPARE =
  "No area of this report contradicted another. We note honestly that there was little to compare: this cross-check looks for paperwork that disagrees with what we found independently, and for one area clearing while another fails outright, and neither situation arose on this case.";

export const SOURCING_CLEAR_NO_DOCUMENTS =
  "No area of this report contradicted another. One half of this cross-check compares supplied paperwork against what we found independently, and no paperwork was provided, so that comparison could not run.";

export const SOURCING_CLEAR_NO_OPPOSING =
  "We compared the supplied paperwork against what we found independently and nothing conflicted. No area cleared outright while another failed outright, so there was no divergence between areas to weigh.";

export const SOURCING_INSUFFICIENT =
  "Too few areas were assessed on this case to cross-check one against another.";

export function sourcingClientSummary(
  assessment: CoherenceAssessment,
  comparability: SourcingComparability,
): string {
  if (assessment === "tension") return SOURCING_TENSION;
  if (assessment === "insufficient_data") return SOURCING_INSUFFICIENT;
  const { documentsToCompare, opposingSignals } = comparability;
  if (documentsToCompare && opposingSignals) return SOURCING_CLEAR;
  if (!documentsToCompare && !opposingSignals) return SOURCING_CLEAR_NOTHING_TO_COMPARE;
  if (!documentsToCompare) return SOURCING_CLEAR_NO_DOCUMENTS;
  return SOURCING_CLEAR_NO_OPPOSING;
}
