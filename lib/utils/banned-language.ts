// H5 — two-tier banned-language scanner (brief §3.12 + ADR-G001 GR1; tier model + phrase list
// founder-ruled 2026-07-06). One flat list conflated two different voices — HyprrIQ's PROMISES
// (never acceptable, even attributed) and the product's SUBJECT-MATTER vocabulary (dealer pages,
// authorization programs — the very evidence the product reports). The tiers encode that:
//
//   HARD tier      → blocks delivery in EVERY client-visible string, attributed or not.
//   ASSERTION tier → blocks in HyprrIQ's OWN-VOICE (code-templated) strings; in LLM narrative /
//                    evidence / question fields it raises a MANDATORY-REVIEW advisory — presence-
//                    based (regex never judges attribution; a human does, at publish). Rule: cases
//                    with assertion advisories can never auto-deliver once auto-delivery exists.

type Rule = { re: RegExp; label: string; test?: (text: string) => boolean };

// H2 — NEGATION-AWARE guarantee check (bug found via the AT-2 pre-check): the spec-MANDATED
// disclaimer language is the DENIAL of a guarantee ("does not guarantee", "We do not guarantee:",
// "not guarantees") and must pass; any occurrence WITHOUT a preceding negation blocks. The founder
// ruling (guarantee = HARD even attributed) is unchanged — this only exempts the required denials.
const NEGATION_BEFORE = /(?:\bnot|n[o'’]t|\bcannot|\bcan'?t|\bnever|\bno)\s*$/i;
function hasUnnegatedGuarantee(text: string): boolean {
  const re = /guarantee/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const before = text.slice(Math.max(0, m.index - 18), m.index);
    if (!NEGATION_BEFORE.test(before)) return true;
  }
  return false;
}

// HARD (H1–H9) — promises, platform endorsement, affiliations, totality conclusions.
const HARD: Rule[] = [
  { re: /ungat/i, label: "ungating" },                                                          // H1 (Hard Rule #12: never, anywhere)
  { re: /\bguarantee/i, label: "guarantee", test: hasUnnegatedGuarantee },                      // H2 — HARD even attributed (founder ruling); negation-aware (mandated disclaimers pass)
  // H3 — the PROMISE forms only ("account is safe", "we ensure account safety"). The bare noun
  // "account safety" appears in the MANDATED disclaimer's denial list and must not match — hence
  // the \b (excludes "safety") + explicit promise-verb alternation.
  { re: /account\s+(is\s+|will\s+be\s+)?safe\b|(ensur|maintain|protect|keep)\w*\s+(your\s+)?account\s+safety/i, label: "account safe" },
  { re: /amazon\s+approv/i, label: "amazon approved" },                                         // H4
  { re: /(affiliated|partnered)\s+with\s+(amazon|walmart|ebay|shopify)/i, label: "affiliated/partnered with marketplace" }, // H5 (+founder addition 2)
  { re: /fully\s+legitimate/i, label: "fully legitimate" },                                     // H6
  { re: /risk[\s-]?free/i, label: "risk-free" },                                                // H7
  { re: /officially\s+permitted/i, label: "officially permitted" },                             // H8
  { re: /(will\s+not|won'?t)\s+(be\s+|get\s+)?suspend|no\s+risk\s+of\s+suspension/i, label: "suspension promise" }, // H9 (founder addition 1)
];

// ASSERTION (A1–A5) — status vocabulary: ours to never assert, evidence's to be reported.
const ASSERTION: Rule[] = [
  { re: /authoriz(ed|e)\s+(seller|reseller|distributor|dealer)/i, label: "authorized seller/distributor/dealer" }, // A1
  { re: /authoris(ed|e)\s+(seller|reseller|distributor|dealer)/i, label: "authorised seller/distributor/dealer" }, // A1 (BrE)
  { re: /official\s+distributor/i, label: "official distributor" },                             // A2
  { re: /approved\s+(seller|reseller)/i, label: "approved seller/reseller" },                   // A3
  { re: /brand[\s-]approved/i, label: "brand approved" },                                       // A4
  { re: /\b(safe|approved|verified|recommended|low[\s-]?risk)\s+supplier/i, label: "safe/approved/verified supplier" }, // A5 (requires the "supplier" pairing — never matches the bare UI certainty label)
];

const scanWith = (rules: Rule[]) => (text: string): string[] => {
  if (!text) return [];
  return rules.filter((b) => (b.test ? b.test(text) : b.re.test(text))).map((b) => b.label);
};

// HARD tier — blocks delivery. Every client-visible string, no exceptions.
export const scanHard = scanWith(HARD);

// ASSERTION tier — advisory in LLM fields, blocking in our own-voice strings.
export const scanAssertion = scanWith(ASSERTION);

// Back-compat name: the blocking scan IS the hard tier (existing call sites keep their semantics).
export const scanForBannedLanguage = scanHard;

const walkWith = (scan: (t: string) => string[]) => (findings: unknown): string[] => {
  const out = new Set<string>();
  const walk = (v: unknown) => {
    if (typeof v === "string") scan(v).forEach((x) => out.add(x));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(findings);
  return [...out];
};

// Delivery gate: walk a jsonb blob with the HARD tier — violations block delivery.
export const scanFindingsForBannedLanguage = walkWith(scanHard);

// Admin review: walk a jsonb blob with the ASSERTION tier — advisories, never blocking here.
export const assertionAdvisories = walkWith(scanAssertion);
