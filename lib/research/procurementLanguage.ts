// Phase 5.1c (ADR-T2-002) — code-owned procurement-language detector. Track 2's brand_relationship_finding
// must NEVER imply a purchase decision (buy / don't buy / safe to purchase / recommend purchasing, or close
// equivalents) — legitimacy≠authorization, and the buy/don't-buy call is the verdict engine's, not a track's.
// Patterns target RECOMMENDATION-SHAPED phrases (multi-word) so neutral uses of "purchase"/"resell" (e.g.
// "purchase orders corroborate…", "before purchasing inventory", "authorization to resell") do NOT trip it.
const PROCUREMENT_PATTERNS: RegExp[] = [
  /\b(safe|unsafe|cleared|ok|okay|fine|good)\s+to\s+(buy|purchase|source|resell)\b/i,
  /\b(recommend|recommending|recommended|advise|advising|suggest|suggesting)\s+(that\s+)?(you\s+)?(they\s+)?(buy|buying|purchas\w+|sourcing|reselling)\b/i,
  /\b(you|client|clients|buyer|buyers|customer|customers)\s+(can|should|may|could|are\s+cleared\s+to)\s+(safely\s+)?(buy|purchase|source|resell)\b/i,
  /\b(go\s+ahead\s+and|proceed\s+to|proceed\s+with|clear(ed)?\s+to)\s+(buy|buying|purchas\w+)\b/i,
  /\bbuy\s+with\s+confidence\b/i,
  /\b(don'?t|do\s+not|never|avoid)\s+(buy|buying|purchas\w+)\b/i,
];

// Returns the offending phrase(s) found (empty array = clean).
export function findProcurementLanguage(text: string): string[] {
  if (!text) return [];
  const hits: string[] = [];
  for (const re of PROCUREMENT_PATTERNS) {
    const m = text.match(re);
    if (m) hits.push(m[0]);
  }
  return hits;
}

export function containsProcurementLanguage(text: string): boolean {
  return findProcurementLanguage(text).length > 0;
}
