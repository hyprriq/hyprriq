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

// Parenthetical groups made ONLY of internal evidence tokens — src_40 / E04 / EV-011 — joined by
// commas, "and", or "through". Genuine parentheticals (words, e.g., NYSE: SNX, years in prose)
// never match because they contain non-token words.
const TOKEN = String.raw`(?:src_\d+|EV?-?\d{1,4})`;
const REF_GROUP = new RegExp(String.raw`\s*\(\s*${TOKEN}(?:\s*(?:,|and|through)\s*${TOKEN})*\s*\)`, "g");

export function stripInternalRefs(text: string): string {
  return text
    .replace(REF_GROUP, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

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

// The composed client-projection pass: strip refs → substitute internal names → drop the
// disposal log. Order matters only for readability of intermediates; each step is independent.
export function cleanClientProse(text: string): string {
  return dropSourceDisposalSentences(substituteInternalDimensionNames(stripInternalRefs(text)));
}

export function cleanClientProseDeep<T>(value: T): T {
  return deepMapStrings(value, cleanClientProse);
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

export function projectClientReport(
  snapshot: Record<string, unknown> | null,
  vendorQuestions: unknown,
  additional: { question?: unknown; source?: string }[],
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
  return {
    headline: cleanClientProse(str(snapshot.headline)),
    the_real_risk: cleanClientProse(str(snapshot.the_real_risk)),
    leading_interpretation: cleanClientProse(str(snapshot.leading_interpretation)),
    what_to_monitor: (Array.isArray(snapshot.what_to_monitor) ? snapshot.what_to_monitor : [])
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .map((s) => cleanClientProse(s)),
    questions,
  };
}
