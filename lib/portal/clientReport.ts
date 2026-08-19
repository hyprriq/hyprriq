// ── CLIENT REPORT PROJECTION (full-build brief §2, 2026-08-13) — the Decision Snapshot's
// client-facing subset, finally wired. RULES:
// - EXACTLY five things cross: headline, the_real_risk, leading_interpretation, what_to_monitor,
//   and the questions (M8 vendor questions filtered STRUCTURALLY + analyst-added, source-tagged).
//   Modules 1–7 never cross; no other snapshot field crosses (allowlist by construction below).
// - Headlines are UNBOUNDED and load-bearing (the appended "— subject to verification…"
//   qualifier changes the meaning) — nothing here truncates, and no renderer may clamp.
// - Internal evidence references (src_N, E01, EV-005…) are known to leak into narrative prose
//   with no stripping anywhere upstream — stripInternalRefs removes them at this boundary.
//   Strip-only: prose is never rewritten, reworded, or summarized here (the engine's words,
//   the engine's imperfections).
// - The M8 filter is STRUCTURAL (a question ends with "?"), never a content blocklist — the
//   known AWI-2607-022 leak ("documentation_review: no documents were provided for review")
//   fails the structure test; future non-questions fail it too without maintenance.
import { assertNoInternalTokens } from "./clientTokenCheckpoint";

// Parenthetical groups made ONLY of internal evidence tokens — src_40 / E04 / EV-011 — joined by
// commas, "and", or "through". Genuine parentheticals (words, e.g., NYSE: SNX, years in prose)
// never match because they contain non-token words.
//
// ── §1 CLASS 1 WIDENING (founder-ruled 2026-08-18, P0). THE DEFECT THIS FIXES: this file only
// ever stripped BRACKETED groups, so 169 tokens across 19 cases reached client payloads in four
// other grammatical positions. It was "verified weeks ago" because THE FIXTURES WERE ALL
// PARENTHESISED — the instrument only saw the shape it was built to see.
//
// TWO TOKEN VOCABULARIES, DELIBERATELY DIFFERENT WIDTHS. Do not merge them:
//  · GROUPED (inside parens/brackets) keeps the loose historical set including bare E04/E10 — a
//    bracket containing nothing but tokens is a citation BY CONSTRUCTION, so a wide match is safe.
//  · BARE (naked in prose) is ANCHORED to src_N and EV-NNN only. Bare `E-\d+` is DROPPED here for
//    the same reason the presence checkpoint drops it: it collides with real product model
//    numbers (E-40, EV-2000), and silently deleting a model number out of a client's own product
//    description is a worse failure than leaving a token in.
//
// `A\d{2}` (A01, A05 — the assumption/analysis citation vocabulary that appears alongside E-ids,
// cf. the E02/E05/A01 fixture in synthesisMethodScan.test.ts) is GROUPED-ONLY, and finding that
// out is what fixed the P0. AWI-2608-034's leak was `(EV-001, EV-004, EV-005, A05, A08)` — a
// parenthetical the old matcher SHOULD have caught. It didn't, because the matcher requires EVERY
// member to be a known token, so the two unrecognised `A` tokens defeated the whole group and
// carried three EV ids into the client's most-read field. ⚠ ONE UNKNOWN TOKEN SHAPE DISABLES THE
// MATCH FOR EVERY KNOWN ONE BESIDE IT — that is the failure mode, not "parenthesised only".
// It is NOT added to the bare vocabulary: `A10` collides with real product model numbers exactly
// as `E-40` does, and deleting a model number from a client's own product text is worse than
// leaving a token in. Bare A-NN is the checkpoint's problem, and its collision risk needs a ruling.
const TOKEN = String.raw`(?:src_\d+|EV?-?\d{1,4}|A\d{2})`;
const BARE_TOKEN = String.raw`(?:src_\d+|EV-\d{3})`;
// Joiners observed IN THE CORPUS, not imagined: comma, and/or, "through", slash, and the en-dash
// RANGE (`src_3–src_6`) that no hand-written fixture set contained — 28 of the 169 occurrences.
const JOIN = String.raw`(?:\s*(?:,|and|or|through|&|/|[–—-])\s*)`;
const REF_GROUP = new RegExp(String.raw`\s*\(\s*${TOKEN}(?:\s*(?:,|and|through)\s*${TOKEN})*\s*\)`, "g");
const REF_BRACKET = new RegExp(String.raw`\s*\[\s*${TOKEN}(?:\s*(?:,|and|through)\s*${TOKEN})*\s*\]`, "g");
// ⚠ THE BOUNDARY GUARDS ARE LOAD-BEARING AND GO ON THE GROUP, NOT THE TOKEN. Without the trailing
// `(?!\d)`, `EV-\d{3}` matches the first six characters of the product model "EV-2000" and strips
// them, leaving a client reading "the 0 charger" — a false strip that corrupts their own product
// name, which is worse than the leak this file exists to stop. Caught by the corpus fixture, not
// by review. They cannot go on BARE_TOKEN itself: the en-dash range `src_3-src_6` joins tokens
// with a hyphen, so a leading guard on the token would end the group at the joiner and orphan the
// second half.
const BARE_GROUP = new RegExp(String.raw`(?<![A-Za-z0-9-])${BARE_TOKEN}(?:${JOIN}${BARE_TOKEN})*(?!\d)`, "g");

export function stripInternalRefs(text: string): string {
  return tidyAfterStrip(
    text
      .replace(REF_GROUP, "")
      .replace(REF_BRACKET, "")
      .replace(BARE_GROUP, ""),
  );
}

// ── GRAMMAR MUST SURVIVE THE STRIP (the ruling's words). Removing a token leaves punctuation and
// connectors behind that were only ever holding the token; this repairs the seam. It never
// rewords: every operation here deletes leftover punctuation/whitespace or a connector stranded
// against a sentence edge. The engine's words stay the engine's words.
function tidyAfterStrip(text: string): string {
  return text
    .replace(/\(\s*\)|\[\s*\]/g, "")            // brackets emptied by the strip
    // A MIXED citation — "(A10, unresolved)", "(, A05, A08)" — keeps its surviving words but is
    // left holding the removed token's commas. Caught on the corpus: stripping the P0's EV ids
    // produced a literal "(, A05, A08)" until this line existed.
    .replace(/\(\s*[,;]\s*/g, "(")              // "(, A05" → "(A05"
    .replace(/\s*[,;]\s*\)/g, ")")              // "A08, )" → "A08)"
    .replace(/\s*,(\s*,)+/g, ",")               // "a, , b" → "a, b"
    .replace(/([:;,])\s*(?=[.!?])/g, "")        // "Evidence:." → "Evidence."
    .replace(/\b(?:and|or)\s*(?=[.!?])/gi, "")  // "cites and." → "cites."
    .replace(/^[\s,;:]*(?:and|or)\s+/i, "")     // sentence now opening on a stranded connector
    .replace(/^[\s,;:–—-]+/, "")                // …or on stranded punctuation
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

// ── SENTENCE-LEVEL DROP (the other half of the ruled fix). When the token IS the grammatical
// subject, no amount of seam repair saves the sentence — "src_4 lists 'Bosch' on the vendor page"
// strips to " lists 'Bosch' on the vendor page", a wreck with no subject. Those sentences are
// dropped whole rather than mangled.
//
// STRUCTURAL, NOT A VERB LIST: the test is "does the sentence OPEN with a token group" (after an
// optional ALL-CAPS section label, the shape the engine actually emits — "HPE REFERENCE: src_9
// and src_10 reference…"). A verb list would be another instrument that only sees what it was
// built to see.
const TOKEN_SUBJECT_RE = new RegExp(String.raw`^\s*(?:[A-Z][A-Z0-9\s/&'-]{2,40}:\s*)?${BARE_GROUP.source}\b`);

export function dropTokenSubjectSentences(text: string): string {
  return text
    .split(SENTENCE_SPLIT)
    .filter((s) => !TOKEN_SUBJECT_RE.test(s))
    .join(" ")
    .trim();
}

// A residue that is not a sentence at all — "Evidence:" left behind by "Evidence: src_3, src_4." —
// is dropped. NOTHING ELSE IS.
//
// ⚠ THIS GUARD WAS A WORD COUNT (min 3) FOR ONE ITERATION AND IT DELETED A REAL FINDING: the
// admin fixture "Enforcement documented (E10)." strips to "Enforcement documented.", a complete
// two-word finding that the count threw away. There is no reliable way to tell that from the
// equally-two-word wreck "Reading cites." without doing grammar analysis, so the guard does the
// only thing it can defend: it removes residues with no words in them, and leaves mild engine
// imperfection standing. Losing a client's finding is the worse error, and this module's own law
// already says the prose is the engine's words with the engine's imperfections.
const NOT_A_SENTENCE = (s: string): boolean =>
  !/[A-Za-z]/.test(s) ||                 // punctuation and spaces only
  /^[^.!?]*:$/.test(s.trim());           // a bare label whose list the strip took away

function dropStrippedFragments(text: string, hadToken: boolean): string {
  if (!hadToken) return text;
  return text
    .split(SENTENCE_SPLIT)
    .filter((s) => !NOT_A_SENTENCE(s))
    .join(" ")
    .trim();
}

const SENTENCE_SPLIT = /(?<=[.!?])\s+/;

// ── FOUNDER RULING 2026-08-13: src_N stripping is CLIENT SIDE ONLY — the operator's view keeps
// the tags (checking a finding against its cited source is the operator's leverage). This deep
// variant runs in the CLIENT projection (getCaseFindings) over every string that crosses the
// RSC boundary; the admin path never imports it. ──
export function stripInternalRefsDeep<T>(value: T): T {
  return deepMapStrings(value, stripInternalRefs);
}

function deepMapStrings<T>(value: T, fn: (s: string) => string): T {
  if (typeof value === "string") return fn(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => deepMapStrings(v, fn)) as unknown as T;
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = deepMapStrings(v, fn);
    return out as unknown as T;
  }
  return value;
}

// ── FOUNDER RULING 2026-08-13 (ratified) — Rule 2: internal dimension names SUBSTITUTE to the
// five client-facing area names, never delete. These are real boundary statements a client
// should read. Covers every internal name that could appear — Track 0–6 (incl. 0.5) and the
// snake_case dimension keys — not only those seen in delivered cases so far. Article-preceded
// references ("a Track 2 …") take the bare area name so no doubled article ever renders. ──
const TRACK_FULL: Record<string, string> = {
  "0.5": "supplier identity resolution",
  "0": "intake",
  "1": "the Supplier Legitimacy assessment",
  "2": "the Supply-Chain Relationship assessment",
  "3": "the Brand Risk assessment",
  "4": "the Documentation Review assessment",
  "5": "the Sourcing Logic check",
  "6": "the category compliance review",
};
const TRACK_BARE: Record<string, string> = {
  "0.5": "supplier identity resolution",
  "0": "intake",
  "1": "Supplier Legitimacy",
  "2": "Supply-Chain Relationship",
  "3": "Brand Risk",
  "4": "Documentation Review",
  "5": "Sourcing Logic",
  "6": "category compliance",
};
const SNAKE_NAMES: [RegExp, string][] = [
  [/\bsupplier_identity\b/g, "Supplier Legitimacy"],
  [/\bsupply_chain_relationship\b/g, "Supply-Chain Relationship"],
  [/\bbrand_risk_assessment\b/g, "Brand Risk"],
  [/\bdocumentation_review\b/g, "Documentation Review"],
  [/\bsourcing_logic\b/g, "Sourcing Logic"],
  [/\bintake_scope_guard\b/g, "intake"],
];

export function substituteInternalDimensionNames(text: string): string {
  let out = text.replace(/\b(a|an|the)\s+Track\s+(0\.5|[0-6])\b/gi, (_m, article: string, n: string) => {
    const bare = TRACK_BARE[n];
    return bare ? `${article} ${bare}` : _m;
  });
  out = out.replace(/\bTrack\s+(0\.5|[0-6])\b/g, (_m, n: string) => TRACK_FULL[n] ?? _m);
  for (const [re, name] of SNAKE_NAMES) out = out.replace(re, name);
  return out;
}

// ── Rule 1: the source-disposal sentence filter. A sentence is dropped ONLY when its subject is
// a source and its predicate is a disposal verb — the housekeeping log shape verified against
// every delivered row (it matches nothing else; Rule-3 method narration like "homonym discipline
// was applied…" survives because its disposal clause describes verification, not disposal). ──
const DISPOSAL_RE = /\bsources?\b[^.!?]*\b(?:(?:was|were)\s+(?:not\s+used|excluded)|returned\s+no\s+extractable\s+content)/i;

export function dropSourceDisposalSentences(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences.filter((s) => !DISPOSAL_RE.test(s)).join(" ").trim();
}

// ── §1 CLASS 2 (founder-ruled 2026-08-18) — dev-era stub provenance. 47 occurrences across 19
// cases, all ONE shape: "stub track_1 for case 7e2bd898-59d2-4e81-ac4f-a44717b09a99". There is no
// client-facing content inside it to preserve, so the sentence goes whole.
//
// Deliberately narrow: it keys on the stub shape, NOT on "contains a UUID". A UUID anywhere in
// client prose is a leak, but removing whole sentences on that basis would silently delete real
// findings that happen to quote an id. Narrow cleaner + presence checkpoint backstop is the ruled
// architecture — the cleaner removes what it can PROVE is provenance, the checkpoint refuses the
// rest rather than guessing.
const STUB_PROVENANCE_RE = /\bstub\s+track_\d+\s+for\s+case\b/i;

export function dropStubProvenanceSentences(text: string): string {
  return text
    .split(SENTENCE_SPLIT)
    .filter((s) => !STUB_PROVENANCE_RE.test(s))
    .join(" ")
    .trim();
}

// ── §1 CLASS 3 (founder-ruled 2026-08-18: CLEANER, substitute, preserve grammar) — the retired
// scoring vocabulary. The area-claims ruling (`126d440`) replaced "research dimensions" with
// "assessment areas" across public copy; `substituteInternalDimensionNames` above replaces
// dimension NAMES, so the bare word survived in 30 occurrences across 15 cases.
//
// ⚠ THE COMPOUND RULE MUST RUN FIRST, AND THE CORPUS IS WHY. AWI-2607-030 carries "All five major
// assessment dimensions (reseller policy, …)". A bare word-for-word substitution turns that into
// "All five major assessment ASSESSMENT AREAS" — broken output shipped to a client. The corpus
// also proves the word carries an ordinary-English sense here ("any other dimension of vendor
// legitimacy"), which substitutes to grammatical prose but is NOT retired vocabulary. Both facts
// come from reading all 12 distinct corpus sentences; neither is visible in any one of them.
const RETIRED_AREA_VOCAB: [RegExp, string][] = [
  [/\b(?:assessment|verification|research|evaluation|scoring)\s+dimensions\b/gi, "assessment areas"],
  [/\b(?:assessment|verification|research|evaluation|scoring)\s+dimension\b/gi, "assessment area"],
  [/\bdimensions\b/gi, "assessment areas"],
  [/\bdimension\b/gi, "assessment area"],
];

export function substituteRetiredAreaVocabulary(text: string): string {
  let out = text;
  for (const [re, replacement] of RETIRED_AREA_VOCAB) {
    out = out.replace(re, (m) => (/^[A-Z]/.test(m) ? replacement[0].toUpperCase() + replacement.slice(1) : replacement));
  }
  return out;
}

// The composed client-projection pass. ORDER IS NOW LOAD-BEARING — it was not before:
//   1. dimension NAMES substitute (Track 2 → Supply-Chain Relationship) …
//   2. … then the retired bare word, so "the documentation_review dimension" resolves in that order
//   3. sentence-level drops run BEFORE the token strip, because the drops match on text the strip
//      is about to remove (a disposal sentence whose subject is `src_5` must still look like one)
//   4. token-level strip last, then the fragment guard over what the strip left behind
export function cleanClientProse(text: string): string {
  const hadToken = BARE_GROUP.test(text) || REF_GROUP.test(text) || REF_BRACKET.test(text);
  BARE_GROUP.lastIndex = REF_GROUP.lastIndex = REF_BRACKET.lastIndex = 0;
  const named = substituteRetiredAreaVocabulary(substituteInternalDimensionNames(text));
  const dropped = dropTokenSubjectSentences(
    dropStubProvenanceSentences(dropSourceDisposalSentences(named)),
  );
  return dropStrippedFragments(stripInternalRefs(dropped), hadToken);
}

export function cleanClientProseDeep<T>(value: T): T {
  return deepMapStrings(value, cleanClientProse);
}

// ── F2 allowlist projection as a PURE function (extracted 2026-08-13 for the admin review
// screen's client-view; getCaseFindings consumes it unchanged — the client projection's
// behavior is byte-identical, and the admin can now render EXACTLY what the client gets
// without a second implementation that could drift). FOUNDER-SIGNED exclusions unchanged. ──
export const FINDING_CLIENT_ALLOWLIST = [
  "title", "heading", "summary", "detail",
  "brand_relationship_finding", "brand_risk_finding", "documentation_finding",
  "identity_scope_note", "authorization_scope_note", "marketplace_eligibility_disclaimer",
  "evidence_count",
] as const;

// OQ-D neutral constant (mirrors lib/research/contracts SOURCING_CLIENT_SUMMARY — duplicated
// here so this module stays dependency-free; locked together by the projection tests).
const SOURCING_NEUTRAL_SUMMARY = "Consistency check — informational; does not affect the verdict";

export function projectFindingJsonForClient(
  cf: Record<string, unknown>,
  trackKey: string,
): Record<string, unknown> {
  const projected: Record<string, unknown> = {};
  for (const k of FINDING_CLIENT_ALLOWLIST) if (k in cf) projected[k] = cf[k];
  if (trackKey === "sourcing_logic" && "summary" in projected) projected.summary = SOURCING_NEUTRAL_SUMMARY;
  return projected;
}

export function isClientQuestion(s: unknown): s is string {
  return typeof s === "string" && s.trim().length > 0 && s.trim().endsWith("?");
}

export type ClientReportQuestion = { question: string; source: "system" | "additional" };

export interface ClientReport {
  headline: string;
  the_real_risk: string;
  leading_interpretation: string;
  what_to_monitor: string[];
  questions: ClientReportQuestion[];
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

// ── STUB-HEADLINE GUARD (founder-approved 2026-08-14): a headline that is empty or implausibly
// short is treated as ABSENT — the Summary fallback renders instead. Structural, no blocklist:
// the four legacy test reports carry the literal "stub"; any future thin engine output is
// caught the same way. ──
export const MIN_REAL_HEADLINE_CHARS = 20;

// ── BANK-COORDINATE FILTER (ratified 2026-08-14, scoped to Documentation Review): a sentence
// carrying payment coordinates (IBAN/BIC/SWIFT/account numbers) is transcription, never a
// finding — no client needs their own IBAN read back. Sentence-level, zero-false-positive
// patterns only. ──
const BANK_COORD_RE = /\bIBAN\b|\bBIC\b|\bSWIFT\b|\baccount\s+number\b|\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/;

export function dropBankCoordinateSentences(text: string): string {
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((s) => !BANK_COORD_RE.test(s))
    .join(" ")
    .trim();
}

// The per-finding clean pass used by BOTH client projections (portal getCaseFindings and the
// admin client-view's buildClientFindings): generic prose cleanup everywhere, plus the
// documentation-scoped bank-coordinate filter.
// ── CHECKPOINT BINDING (founder-ruled 2026-08-18). These two functions are the ONLY sanctioned
// way to produce client bytes, so binding the presence checkpoint at their tails means everything
// built on them inherits it BY CONSTRUCTION — including render paths nobody has written yet.
//
// THE ESCAPE IS EXPLICIT AND NARROW, AND IT EXISTS FOR ONE REASON: the operator's review screen
// renders the client's text so a leak can be SEEN and fixed. If the tail threw there too, a leaky
// case would become unreviewable — the gate would hide the very thing it is complaining about.
// Modelled on renderReportPdf's `allowMissingClientName`: an explicit parameter at the call site,
// never an ambient env var, so every bypass is visible in the code that asks for it.
export interface ClientProjectionOptions {
  /** Operator surfaces only. Reports instead of refusing, so a leak can be diagnosed. */
  allowInternalTokens?: boolean;
}

function checkpoint(value: unknown, context: string, opts?: ClientProjectionOptions): void {
  if (opts?.allowInternalTokens) return;
  assertNoInternalTokens(value, context);
}

export function cleanClientFindingJson<T>(value: T, trackKey: string, opts?: ClientProjectionOptions): T {
  const cleaned = cleanClientProseDeep(value);
  const out = trackKey !== "documentation_review" ? cleaned : deepMapStrings(cleaned, dropBankCoordinateSentences);
  checkpoint(out, `cleanClientFindingJson(${trackKey})`, opts);
  return out;
}

export function projectClientReport(
  snapshot: Record<string, unknown> | null,
  vendorQuestions: unknown,
  additional: { question?: unknown; source?: string }[],
  opts?: ClientProjectionOptions,
): ClientReport | null {
  if (!snapshot) return null;
  const m8 = Array.isArray(vendorQuestions) ? vendorQuestions : [];
  const questions: ClientReportQuestion[] = [
    ...m8.filter(isClientQuestion).map((q) => ({ question: cleanClientProse(q.trim()), source: "system" as const })),
    ...additional
      .map((a) => a.question)
      .filter(isClientQuestion)
      .map((q) => ({ question: cleanClientProse(q.trim()), source: "additional" as const })),
  ];
  const headline = cleanClientProse(str(snapshot.headline));
  const report: ClientReport = {
    headline: headline.trim().length >= MIN_REAL_HEADLINE_CHARS ? headline : "",
    the_real_risk: cleanClientProse(str(snapshot.the_real_risk)),
    leading_interpretation: cleanClientProse(str(snapshot.leading_interpretation)),
    what_to_monitor: (Array.isArray(snapshot.what_to_monitor) ? snapshot.what_to_monitor : [])
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .map((s) => cleanClientProse(s)),
    questions,
  };
  checkpoint(report, "projectClientReport", opts);
  return report;
}
