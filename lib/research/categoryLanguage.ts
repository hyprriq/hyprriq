// ── Category Compliance CONDITION 1 (founder-ruled 2026-07-23) — the category honesty scanner.
// Built EXPLICITLY against the banned-language audit's ten runtime-proven holes, not on the
// procurement-pattern family that has them:
//
//   POLARITY-BLIND: "restricted" and "not restricted" are BOTH verdictive status claims about the
//   client's product/category — the negation is not an escape (the "you should NOT buy" hole).
//   This is the opposite of the guarantee-denial class: there the negation is the mandated honest
//   form; here BOTH polarities assert a gating status we cannot know.
//
//   ALTERNATION-COMPLETE: sell/list/stock/resell/buy/purchase/source (the "safe to SELL" hole);
//   approve/reject/accept/allow/permit/take action (the "Amazon will accept" hole class).
//
//   Every pattern is RED-proven in categoryLanguage.test.ts by feeding the actual evasion shapes
//   through the live scanner — the method that found the ten holes.
//
// TWO-SIDED BY LAW: the founder's own §8 flag language and governing law pass — "may require /
// may apply / may trigger", "Check Amazon's restricted substances list" (possessive noun, not a
// status claim), "storage restrictions" (noun), "Requirements change frequently".
// This scans LLM-WRITTEN narrative fields only; the injected flag language is code-owned and
// never scanned at generation (it is locked byte-identical to the founder's doc instead). ──

type CategoryRule = { re: RegExp; label: string };

const RULES: CategoryRule[] = [
  // Verdictive gating/restriction status — polarity-blind (is/are + [not|un]restricted/gated/banned).
  { re: /\b(?:is|are|being|remains?)\s+(?:currently\s+)?(?:not\s+)?(?:un)?(?:restricted|gated|banned)\b/i, label: "gating/restriction status claim (either polarity)" },
  // Eligibility as a status — polarity-blind.
  { re: /\b(?:is|are|you'?re|you\s+are|be)\s+(?:not\s+)?(?:in)?eligible\b/i, label: "eligibility claim (either polarity)" },
  // "safe to X" — alternation-complete (the audit's missing-verb hole).
  { re: /\bsafe\s+to\s+(?:sell|list|stock|resell|buy|purchas\w*|source)\b/i, label: "safe-to-sell class" },
  // Predicting Amazon's decisions — the "Amazon will accept" hole class, alternation-complete,
  // polarity-blind ("will not allow" is as much a prediction as "will allow").
  { re: /\bamazon\s+will\s+(?:not\s+)?(?:approve|reject|accept|allow|permit|take\s+action)\b/i, label: "Amazon-decision prediction" },
  // Ungating language — Hard Rule #12: never, anywhere, any form.
  { re: /ungat/i, label: "ungating language" },
  // Can/cannot sell — polarity-blind capability claims.
  { re: /\b(?:you\s+)?(?:can(?:not)?|can'?t|are\s+(?:un)?able\s+to)\s+(?:safely\s+)?(?:sell|list|stock|resell)\b/i, label: "can/cannot-sell claim (either polarity)" },
  // Requirements stated as ABSOLUTE — the governing law's own ban ("Never state requirements as
  // absolute"). "may require" stays legal; "requires" / "will need|require" / "must have" do not.
  { re: /\b(?:requires|will\s+(?:need|require)|must\s+(?:have|obtain|provide|submit))\b/i, label: "requirement stated as absolute" },
];

// Returns the labels of every violated rule (empty = clean). Same shape as the sibling scanners
// so call sites and tests compose identically.
export function findCategoryLanguageViolations(text: string): string[] {
  if (!text) return [];
  return RULES.filter((r) => r.re.test(text)).map((r) => r.label);
}

export function containsCategoryLanguageViolation(text: string): boolean {
  return findCategoryLanguageViolations(text).length > 0;
}
