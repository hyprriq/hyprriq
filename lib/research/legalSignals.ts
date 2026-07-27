// ── BL FIX GATE — TRIGGER 9 (BL3, founder-ruled: DERIVE-at-render, zero storage, zero migration).
// THE DIRECTION LAW, on the record: banned-language scans OUR OUTPUT and BLOCKS; this scans
// CLIENT INPUT and FLAGS. A client must NEVER be blocked from disclosing something important —
// a hit fires an admin alert at intake and a loud ⚖ LEGAL FLAG banner on the review page,
// derived fresh each render (no stored flag to go stale; the Brief §4 trigger-9 intent honored
// without a schema change). Presence-based patterns, no LLM, two-sided-tested. ──

const LEGAL_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\bip\s+(?:complaint|notice|claim|infringement)/i, label: "IP complaint/notice" },
  { re: /\binfring/i, label: "infringement" },
  { re: /\bcease\s+and\s+desist\b/i, label: "cease and desist" },
  { re: /\blegal\s+(?:notice|action|matter|proceeding|counsel|dispute|threat)/i, label: "legal notice/action" },
  { re: /\blawsuit\b|\bsued\b|\bsuing\b/i, label: "lawsuit" },
  { re: /\battorney\b|\blawyer\b/i, label: "attorney/lawyer" },
  { re: /\bcounterfeit\s+(?:claim|complaint|notice|allegation)/i, label: "counterfeit claim" },
  { re: /\bamazon\s+complaint\b|\bcomplaint\s+(?:from|by)\s+(?:the\s+)?brand\b/i, label: "active complaint" },
  { re: /\baccount\s+(?:\w+\s+)?(?:deactivat|suspend)\w*/i, label: "account deactivation/suspension mentioned" },
  { re: /\bsection\s+3\b/i, label: "Section 3 notice" },
];

// Returns the matched signal labels (empty = no legal signals). Presence-based — attribution and
// severity are the founder's read; this only makes sure he SEES it.
export function findLegalSignals(text: string | null | undefined): string[] {
  if (!text) return [];
  return LEGAL_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.label);
}
