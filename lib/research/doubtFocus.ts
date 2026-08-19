// ── DOUBT-FOCUS SHAPE (Module 9 composition, founder-ruled 2026-08-19) ──────────────────────
//
// THE DEFECT, DIAGNOSED THREE TIMES BEFORE THIS AND WRONG TWICE. `shapeSnapshot` interpolates
// `doubt.doubt_focus` into NOUN-PHRASE SLOTS:
//
//   targeted : the_real_risk          = `The open question: ${focus}. …`
//   elevated : headline               = `… — subject to verification of ${focus}`
//   elevated : leading_interpretation = `… This reading rests on ${focus} holding.`
//   broad    : headline               = `Key items could not be verified (${focus}). …`
//
// FOUR SLOTS, THREE DOUBT LEVELS — not the one slot that was reported. Each reads correctly ONLY
// if `focus` is a noun phrase ("the Chapter 11 resolution status"). Module 7 writes doubt_focus as
// free prose and NOTHING CONSTRAINS ITS SHAPE, so on real cases it arrives as a full sentence and
// the slot yields "This reading rests on The most concentrated doubt lands on … holding."
//
// CORPUS, MEASURED (scripts/doubt-focus-shape-probe.ts, 35 cases carrying a calibration):
//   minimal  30 cases — interpolates focus NOWHERE, safe by construction
//   elevated  2 cases — 1 clean phrase (AWI-2607-022), 1 sentence (AWI-2608-034) → BROKEN
//   broad     3 cases — 1 sentence (AWI-2607-021) → BROKEN; 2 long-but-grammatical phrases
//   targeted  0 cases — ⚠ THE SLOT HAS NEVER BEEN EXERCISED BY A REAL CASE
// 2 cases render mangled prose today. The first version of that probe said 4: it counted >14
// words as a sentence, and two long NOUN PHRASES tripped it. Length is not what breaks a slot;
// sentence punctuation is.
//
// ⛔ THE FIX IS SHAPE-SAFE COMPOSITION, NOT A CLEANER AND NOT A PROMPT CONSTRAINT. Constraining
// Module 7's prompt would (a) only affect new attempts, (b) depend on model compliance for a
// GRAMMATICAL guarantee, and (c) leave the templates still assuming a shape nothing enforces.
// Instead every slot has TWO forms, chosen deterministically from the text: a PHRASE form that
// reads inline, and a SENTENCE form that gives the focus its own sentence behind a short label.
// Neither truncates, rewords or drops the focus — the doubt is load-bearing and must survive whole.

/**
 * True when a focus carries actual words. A focus of "..." or "—" is not a doubt statement, and
 * rendering it produces "The open question: ..." on a paid report — worse than the generic
 * fallback, because it looks like the engine had something to say and lost it. Callers treat a
 * contentless focus as ABSENT. (No corpus case emits this; it is a shape a model can produce.)
 */
export function hasFocusContent(focus: string | null | undefined): boolean {
  return typeof focus === "string" && /[A-Za-z0-9]/.test(focus);
}

/**
 * True when `focus` can sit inside a noun-phrase slot. The test is sentence punctuation, NOT
 * length: "Supply chain legitimacy and downstream marketplace risk for Sterilite products sourced
 * through Four Seasons General Merchandise" is long, ugly in a slot, and perfectly grammatical.
 */
export function isPhraseShaped(focus: string): boolean {
  const t = focus.trim();
  return t.length > 0 && !/[.!?]/.test(t);
}

/**
 * A phrase ready to sit inline. Trims and drops a single trailing period so a slot that supplies
 * its own punctuation ("…of {phrase}.") cannot double it. Only used when isPhraseShaped is true.
 */
export function asPhrase(focus: string): string {
  return focus.trim().replace(/\s*\.\s*$/, "");
}

/** A focus rendered as its own sentence: trimmed, and terminated if the model forgot to. */
export function asSentence(focus: string): string {
  const t = focus.trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

/**
 * Join a label to a focus so the result is a grammatical sentence in either shape.
 *   phrase   → "Subject to verification of the Chapter 11 resolution status."
 *   sentence → "Subject to verification: The most concentrated doubt lands on …"
 * The label carries the meaning the slot used to carry, so nothing is lost when the inline form
 * is unavailable.
 */
export function labelledFocus(label: string, focus: string): string {
  return isPhraseShaped(focus)
    ? `${label} of ${asPhrase(focus)}.`
    : `${label}: ${asSentence(focus)}`;
}
