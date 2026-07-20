import type { HypothesisSet, HypothesisWatchCondition } from "@/lib/research/contracts";

// ── S-1f STEP 3 — A6 (ADDENDUM-1, APPROVED): per-hypothesis watch conditions + the
// prediction_correct scoring hook. WRITE-SIDE and UNBACKFILLABLE (G006's own law): the record
// exists only for cases synthesized after this lands, and no later pass can manufacture it.
//
// THE DISCIPLINE: this is a DETERMINISTIC STRUCTURAL PROJECTION of what the LLM already wrote in
// M5 — no model call, no paraphrase, no inference. Code derives STRUCTURE (the ordinal id, the
// pairing, the empty scoring slot); the LLM's own words ride VERBATIM or the field is null. Any
// future urge to have code WRITE a watch condition is a founder ruling, not a refactor.
//
// Storage rides the existing `case_synthesis.hypotheses` jsonb (the HypothesisSet is upserted
// whole) — NO MIGRATION, which is what ADDENDUM-1 anticipated and what the code confirms.
export function deriveWatchConditions(set: HypothesisSet): HypothesisWatchCondition[] {
  return set.hypotheses.map((h, i) => ({
    watch_id: `wc-${i + 1}`,
    hypothesis_label: h.label,
    likelihood: h.likelihood,
    rests_on: [...h.supporting_evidence],
    disconfirmed_by: [...h.contradicting_evidence],
    // The set-level condition belongs to the LEADING hypothesis — it is the leader's own
    // falsifier. Attaching it to alternatives would assert something M5 never said. Absence is
    // recorded as absence: an empty string is null, never a hollow commitment.
    what_would_change_the_leader:
      h.likelihood === "leading" && set.what_would_change_the_leader.trim() !== ""
        ? set.what_would_change_the_leader
        : null,
    prediction_correct: null, // SCORING HOOK — G4's half fills these; null is the honest state
    scored_at: null,
  }));
}
