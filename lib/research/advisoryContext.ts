// ── THE CLIENT-SURFACE DOOR — ADVISORY CONTEXT INTO CALL C ONLY (founder-ruled 2026-09-10) ───
//
// THE WHOLE RULING, in the founder's words: "M9 MAY CITE THE MARKETPLACE HISTORY ONLY AS
// EXPLICITLY ADVISORY. Not woven into the verdict reasoning; named as separate from it. …
// Never '…which raises concern about…' — the moment it reads as reasoning, we can produce a
// report whose narrative describes a collapse while the verdict says Source Clear. That
// contradiction is worse than the seam it fixes."
//
// HOW THE RULING IS ENFORCED BY STRUCTURE, not memory:
//   · The advisory citation is CODE-APPENDED here (advisoryParagraph), never model-written —
//     so its separateness is a constant, not a prompt hope. The prefix below is the founder's
//     exact framing and is byte-locked by test.
//   · The LLM (Call C) receives the context for M8 questions and what_to_monitor ONLY; its
//     prompt forbids referencing it in headline / leading_interpretation / the_real_risk, and
//     stripAdvisoryWeave enforces that ban mechanically on the model's output — a weave is
//     stripped sentence-by-sentence and AUDITED, never shipped (the categoryLanguage pattern).
//   · Call A, Call B, the refuter, certifySynthesisForVerdict and computeVerdict never receive
//     this context — asserted by the inertia lock (advisoryContext.lock.test.ts), the same
//     proof pattern Track 6 carries.
//   · THE DEEP DOOR STAYS CLOSED (same ruling): evidence-path entry is a separate founder
//     ruling under the 2026-07-11 firewall riders.
//
// MEMO NOTE (determinism): synthesis memoization is DISABLED (Q4(b)). If the evidence-hash
// memo is ever revived, advisoryContext MUST join its key — a memo hit that ignores it would
// serve a snapshot written blind to a fact the input carried.

export interface AdvisorySentence { brand: string; sentence: string }
export interface AdvisoryContext {
  /** The founder-ratified marketplace-history sentences (already gate-clean at their source). */
  marketplace_history: AdvisorySentence[];
}

/** FOUNDER-RATIFIED FRAMING, verbatim — byte-locked. The separateness lives in the sentence. */
export const ADVISORY_PREFIX = "Separately, and outside this verdict:";

/** The code-appended M9 citation. One paragraph, prefix first, one clause per brand. */
export function advisoryParagraph(ctx: AdvisoryContext): string | null {
  const rows = ctx.marketplace_history.filter((s) => s.brand && s.sentence.trim());
  if (rows.length === 0) return null;
  const body = rows.length === 1
    ? rows[0].sentence
    : rows.map((r) => `For ${r.brand}: ${r.sentence}`).join(" ");
  return `${ADVISORY_PREFIX} ${body}`;
}

// The weave vocabulary — the marketplace-history reading's own terms. A sentence in the
// verdict-reasoning prose that uses them IS the weave the ruling bans; what_to_monitor and the
// M8 questions are outside this ban by the ruling's own scope.
const WEAVE_RE = /third-party seller|seller count|sellers? (?:fell|dropped|declined|exited|remaining)|marketplace (?:listing )?history/i;
const SENT_SPLIT = /(?<=[.!?])\s+/;

export interface WeaveStrip { field: string; sentence: string }

// ── THE MONITOR EXTENSION (founder-ruled 2026-09-11): the cause-inference ban covers
// what_to_monitor too — "a client does not read a monitor entry as a lesser class of claim",
// and a hedge is the problem, not the defence: "may indicate the brand is restricting" names
// one cause and stays silent about the others, which reads as our leading hypothesis.
//
// The monitor guard CANNOT reuse WEAVE_RE: monitor entries legitimately carry seller-count
// facts (that is the field's approved use). It targets the ATTRIBUTION SHAPE instead — an
// attribution verb (hedged or bare) in a sentence whose entry carries the advisory subject.
// ⚠ THE STATED COST (reported to the founder before shipping): sentence-level stripping means
// a violation FUSED to a legitimate clause in one sentence loses the whole sentence, good
// clause included. Deterministic and audited; the prompt rule is the first defence, so this
// fires only on violations.
const ATTRIBUTION_RE = /\b(?:may|might|could|likely|probably|possibly)\s+(?:indicat\w*|suggest\w*|mean\w*|signal\w*|imply\w*|reflect\w*)\b|\bconsistent with\b|\bpoints?\s+to\b|\b(?:indicat\w*|suggest\w*)\s+(?:that\s+)?the\s+brand\b|\bsign\s+(?:that|of)\b|\bevidence\s+(?:that|of)\s+the\s+brand\b/i;

/** Enforce the cause-inference ban on what_to_monitor. Entries keep their facts; sentences
 *  that ATTRIBUTE a cause to the advisory shape are removed and reported. An entry emptied by
 *  the strip is dropped entirely. */
export function stripMonitorAttribution(entries: string[]): { entries: string[]; stripped: WeaveStrip[] } {
  const out: string[] = [];
  const stripped: WeaveStrip[] = [];
  for (const entry of entries) {
    if (!WEAVE_RE.test(entry) || !ATTRIBUTION_RE.test(entry)) { out.push(entry); continue; }
    const kept: string[] = [];
    for (const s of entry.split(SENT_SPLIT)) {
      if (ATTRIBUTION_RE.test(s)) stripped.push({ field: "what_to_monitor", sentence: s });
      else kept.push(s);
    }
    const rebuilt = kept.join(" ").trim();
    if (rebuilt) out.push(rebuilt);
  }
  return { entries: out, stripped };
}

/** Enforce the no-weave law on one verdict-reasoning field. Sentences carrying the advisory
 *  vocabulary are REMOVED and reported; the code-appended paragraph (prefix-marked) is the only
 *  form the citation may take. Deterministic, auditable, never silent. */
export function stripAdvisoryWeave(field: string, text: string): { text: string; stripped: WeaveStrip[] } {
  if (!text || !WEAVE_RE.test(text)) return { text, stripped: [] };
  const kept: string[] = [];
  const stripped: WeaveStrip[] = [];
  for (const s of text.split(SENT_SPLIT)) {
    if (WEAVE_RE.test(s) && !s.startsWith(ADVISORY_PREFIX)) stripped.push({ field, sentence: s });
    else kept.push(s);
  }
  return { text: kept.join(" ").trim(), stripped };
}
