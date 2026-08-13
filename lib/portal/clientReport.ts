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
    ...m8.filter(isClientQuestion).map((q) => ({ question: stripInternalRefs(q.trim()), source: "system" as const })),
    ...additional
      .map((a) => a.question)
      .filter(isClientQuestion)
      .map((q) => ({ question: stripInternalRefs(q.trim()), source: "additional" as const })),
  ];
  return {
    headline: stripInternalRefs(str(snapshot.headline)),
    the_real_risk: stripInternalRefs(str(snapshot.the_real_risk)),
    leading_interpretation: stripInternalRefs(str(snapshot.leading_interpretation)),
    what_to_monitor: (Array.isArray(snapshot.what_to_monitor) ? snapshot.what_to_monitor : [])
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .map((s) => stripInternalRefs(s)),
    questions,
  };
}
