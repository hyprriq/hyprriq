// ── §3 — THE HEADLINE'S QUALIFIER CLAUSE (2026-08-19) ────────────────────────────────────────
//
// WHAT THE DATA ACTUALLY SAID, because two earlier diagnoses were wrong and both would have sent
// someone to the wrong file. scripts/snapshot-prose-probe.ts over every delivered snapshot:
// 7 checked · 0 fields ending on a dangling connector · 2 RUN-ONS INSIDE A STORED FIELD.
//
// So it is NOT "two fields joined with no separator", and NOT "a connector expecting a list that
// rendered empty". THERE IS NO JOIN. Module 9 stores ONE string of the form
//   "<claim>. — subject to verification of <what would settle it>"
// and the renderer prints it faithfully. It reads as a run-on because it IS one, from the engine.
//
// ⚠ THE QUALIFIER IS LOAD-BEARING AND MUST NOT BE DROPPED. clientReport.ts's own law: the
// appended "— subject to verification…" CHANGES THE MEANING of the headline. This does not
// truncate, summarise or reword — it splits one string at a seam the engine itself writes, so the
// claim and the condition on the claim can be typeset as two things instead of one paragraph.
// Presentation only; the bytes are preserved and re-joinable.
//
// The engine is frozen, so the seam is handled at render. If the engine's phrasing is ever
// changed, this degrades to "no split" — never to a lost qualifier.

export interface HeadlineParts {
  /** The claim. Always present (equals the whole headline when there is no qualifier). */
  claim: string;
  /** The condition on the claim, WITHOUT the leading connector, or null when absent. */
  qualifier: string | null;
}

// The seam as the engine writes it: an em/en dash or hyphen, then "subject to verification".
// Anchored to that phrase — this must never become a general "split on a dash" rule, which would
// cut ordinary parenthetical dashes out of a finding.
const SEAM = /\s*[—–-]\s*subject to verification\s*(?:of\s*)?/i;

export function splitHeadline(headline: string): HeadlineParts {
  const text = (headline ?? "").trim();
  if (!text) return { claim: "", qualifier: null };
  const m = SEAM.exec(text);
  if (!m || m.index === 0) return { claim: text, qualifier: null };
  const claim = text.slice(0, m.index).trim();
  const rest = text.slice(m.index + m[0].length).trim();
  // A seam with nothing after it is a dangling connector — drop the connector, keep the claim.
  // (The corpus has none today; it is the shape a truncated generation would produce.)
  if (!rest) return { claim, qualifier: null };
  return { claim, qualifier: rest };
}

/** The label the qualifier renders under — the connector's meaning, said once, as a heading. */
export const HEADLINE_QUALIFIER_LABEL = "Subject to verification of";
