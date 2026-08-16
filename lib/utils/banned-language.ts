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
// BL fix (2026-07-24): "not a guarantee" (the ruled closing disclaimer's form) is as much a
// denial as "not guarantee"; "no approval guarantees" allows one intervening noun; and the
// INTERROGATIVE form ("Does HyprrIQ guarantee…?") is the question honest copy asks in order to
// deny it — "we will guarantee" (verb directly after the auxiliary) still blocks.
const NEGATION_BEFORE = /(?:(?:\bnot|n[o'’]t|\bcannot|\bcan'?t|\bnever|\bno)\s*(?:a\s+|an\s+|\w+\s+)?|(?:\bdoes|\bdo|\bcan|\bcould|\bwould|\bwill)\s+\w+\s+)$/i;
function hasUnnegatedGuarantee(text: string): boolean {
  const re = /guarantee/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const before = text.slice(Math.max(0, m.index - 18), m.index);
    if (!NEGATION_BEFORE.test(before)) return true;
  }
  return false;
}

// ── BL FIX GATE (2026-07-24, all six OQs founder-ruled) — H4 negation carve-out (BL4).
// The H2 precedent: affirmative "Amazon approval" claims block; DENIAL forms are the platform's
// own mandated language ("do not confirm or deny Amazon approval" — the §8 governing law;
// "not confirmation of Amazon approval or refusal" — the OQ-CC5 scope sentence) and must pass.
const APPROVAL_DENIAL_BEFORE = /(?:\bdeny(?:ing)?|\bdenial\s+of|\bnot\s+confirmation\s+of|\bnever|\bcannot\s+confirm|\bnot?\s+(?:a\s+)?guarantee\s+of)\s*$/i;
function hasUnnegatedAmazonApproval(text: string): boolean {
  const re = /amazon\s+approv/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const before = text.slice(Math.max(0, m.index - 24), m.index);
    if (!APPROVAL_DENIAL_BEFORE.test(before)) return true;
  }
  return false;
}

// BL FIX — H12's denial-awareness: "could not confirm authorization" IS the instead-column;
// only UNNEGATED confirm/certify-authorization claims block.
const CONFIRM_NEGATION_BEFORE = /(?:\bnot|n[o'’]t|\bcannot|\bcan'?t|\bnever|\bno|\bunable\s+to|\bcould\s+not|\bdo(?:es)?\s+not)\s*$/i;

// ── GATE RULING 2026-08-16 (#1, census-driven): abbreviation-aware sentence starts. The old
// lastIndexOf(".") treated the period in "e.g." as a sentence end, truncating the request-voice
// guard's scope and defeating the 2026-07-28 carve-out on real M8 questions (10-case census
// class). A period ends a sentence only when it does not belong to an abbreviation. ──
const ABBREV_TAIL = /(?:\b(?:e\.g|i\.e|etc|vs|cf|approx|inc|ltd|corp|co|dr|mr|mrs|ms|st|no)|[\s(["'“][A-Za-z])\.$/i;
function sentenceStartIndex(text: string, idx: number): number {
  for (let i = idx - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === "?" || ch === "!") return i + 1;
    if (ch === ".") {
      if (ABBREV_TAIL.test(text.slice(Math.max(0, i - 7), i + 1))) continue;
      return i + 1;
    }
  }
  return 0;
}

// ── GATE RULING 2026-08-16 (#3): negation + attribution awareness for the verdict-shaped
// fraud/legitimacy rules — the same machinery H2/H12 carry. Clearing forms ("No scam reports …
// were found", "whether the seller was a legitimate reseller") and attributed impersonation
// ("scammers posing AS the vendor, not the vendor itself") pass; affirmative our-voice
// accusations still block. ──
// Clearing shapes, scoped tight so an unrelated negation earlier in the sentence can never
// exempt a verdict ("…is not identity fraud — X is a verifiably legitimate entity" still
// blocks): leading determiner "No …" gets the wide window; bare not/never a 2-word reach;
// whether/if a 4-word reach.
const CLEARING_BEFORE = /(?:\bno\b[^.?!]{0,60}|(?:\bnot\b|\bnever\b|\bwithout\b)\s+(?:\w+\s+){0,2}|(?:\bwhether\b|\bif\b)\s+(?:\w+\s+){0,4})$/i;
const ATTRIBUTION_IN_SENTENCE = /\bposing\s+as\b|\bimpersonat|\bpretending\s+to\s+be\b|\ballegedly\b|\baccused\s+of\b|\bnot\s+[A-Z][\w\s]*\s+itself\b/i;
function makeVerdictGuard(re: RegExp): (text: string) => boolean {
  const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
  return (text: string): boolean => {
    const g = new RegExp(re.source, flags);
    let m: RegExpExecArray | null;
    while ((m = g.exec(text)) !== null) {
      const start = sentenceStartIndex(text, m.index);
      if (CLEARING_BEFORE.test(text.slice(start, m.index))) continue;
      if (ATTRIBUTION_IN_SENTENCE.test(text.slice(start, Math.min(text.length, m.index + 80)))) continue;
      return true;
    }
    return false;
  };
}

// ── GATE RULING 2026-08-16 (#4): ungating splits SERVICE from SUBJECT-MATTER. Blocking only
// the service-offer shape (our subject or an offer verb before "ungat", or "ungating service");
// descriptive gating-state vocabulary ("ungated resale", reported "Amazon ungating alone is
// insufficient") is the product's subject matter and passes. The mandated service DENIAL
// ("We do not provide ungating services") stays passing via the in-sentence negation check. ──
function hasUngatingServiceClaim(text: string): boolean {
  const re = /ungat/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const start = sentenceStartIndex(text, m.index);
    const beforeInSentence = text.slice(start, m.index);
    const serviceShape =
      /\b(?:we|our|hyprriq)\b[^.?!]*$/i.test(beforeInSentence) ||
      /\b(?:provide|offer|sell|perform|promise|handle|guarantee)\w*\s+(?:\w+\s+)?$/i.test(beforeInSentence) ||
      /^ing\s+services?\b/i.test(text.slice(m.index + 5, m.index + 19));
    if (!serviceShape) continue;
    if (/\b(?:not|don'?t|does\s+not|doesn'?t|never|won'?t|no)\b/i.test(beforeInSentence)) continue;
    return true;
  }
  return false;
}

// ── GATE RULING 2026-08-16 (#2): the EVIDENCE-SUBJECT form ("the evidence confirms
// authorization…") is DEMOTED to the assertion tier — flagged for reword to "supports" until
// the engine-prose pass lands, never silently released. Our-voice and passive-without-evidence-
// subject forms stay HARD. ──
const EVIDENCE_SUBJECT_BEFORE = /\b(?:evidence|sources?|records?|documentation|filings?|listings?|pack)\b[^.?!]{0,30}$/i;
// AMENDMENT 2026-07-28 (founder-authorized, from the REAL-OUTPUT probe) — REQUEST-VOICE carve-out:
// Module 8's mandated job is REQUESTING evidence ("can you provide documentation confirming your
// authorization?") — a request/question is not our assertion. The guard is sentence-scoped: a
// request marker or interrogative subject earlier in the SAME sentence exempts the match. Our-voice
// assertions ("we confirm your authorization", "this confirms authorization") carry no such marker
// and still block. (The H13 embedded-question guard is the precedent.)
const REQUEST_VOICE_IN_SENTENCE = /\b(?:provide|supply|share|submit|send|obtain|request(?:ing)?)\b|\b(?:can|could|will|would|do|does)\s+you\b|^[\s"']*(?:can|could|do|does|is|are|has|have)\b/i;
function hasUnnegatedConfirmAuth(text: string): boolean {
  // The object must FOLLOW the verb as its complement ("confirms authorization", "certified as an
  // authorized distributor") — attributive uses ("a confirmed distributor or authorization
  // relationship", the mandated marketplace disclaimer) are descriptions, not certification claims.
  const re = /\b(?:confirm(?:s|ed|ing)?|certif(?:y|ies|ied|ying))\b\s+(?:that\s+)?(?:as\s+)?(?:an?\s+|the\s+|their\s+|its\s+|your\s+)?(?:authoriz|authoris|approv|authentic)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const before = text.slice(Math.max(0, m.index - 20), m.index);
    if (CONFIRM_NEGATION_BEFORE.test(before)) continue;
    // #1 (2026-08-16): abbreviation-aware sentence scope — "e.g." can no longer truncate it.
    const sentenceStart = sentenceStartIndex(text, m.index);
    if (REQUEST_VOICE_IN_SENTENCE.test(text.slice(sentenceStart, m.index))) continue;
    // #2 (2026-08-16): evidence-subject form → demoted to the assertion tier (scanAssertion).
    if (EVIDENCE_SUBJECT_BEFORE.test(text.slice(sentenceStart, m.index))) continue;
    return true;
  }
  // AMENDMENT 2026-07-28 — the PASSIVE our-voice form ("authorization is confirmed"), which the
  // verb-first pattern cannot see. Negation-aware: "could not be confirmed" is mandated language.
  const passive = /\bauthoriz\w+\s+(?:is|are|was|were|has\s+been|have\s+been)\s+confirmed\b/gi;
  while ((m = passive.exec(text)) !== null) return true;
  return false;
}

// HARD (H1–H9 original + H10–H15 from the BL fix gate) — promises, platform endorsement,
// affiliations, totality conclusions, and (BL fix) the six runtime-proven hole classes.
// THE VERDICT-IS-THE-RECOMMENDATION RULING (BL5): the verdict IS the recommendation — H10 bans
// recommendation language BEYOND it, and the four VERDICT_SENTENCES are whitelisted BY
// CONSTRUCTION: "Verify Before Purchase" carries no recommendation verb, "Do Not Rely" keeps
// "rely" deliberately OUT of H10's verb alternation. Two-sided fixtures name both.
// (H1's 2026-07-24 any-voice ungating guard retired by the 2026-08-16 ruling — replaced by
// hasUngatingServiceClaim above: service-offer shapes block, subject-matter vocabulary passes.)

const HARD: Rule[] = [
  { re: /ungat/i, label: "ungating", test: hasUngatingServiceClaim },                           // H1 — RULING 2026-08-16: service-offer shape only; subject-matter gating vocabulary passes
  { re: /\bguarantee/i, label: "guarantee", test: hasUnnegatedGuarantee },                      // H2 — HARD even attributed (founder ruling); negation-aware (mandated disclaimers pass)
  // H3 — the PROMISE forms only ("account is safe", "we ensure account safety"). The bare noun
  // "account safety" appears in the MANDATED disclaimer's denial list and must not match — hence
  // the \b (excludes "safety") + explicit promise-verb alternation.
  { re: /account\s+(is\s+|will\s+be\s+)?safe\b|(ensur|maintain|protect|keep)\w*\s+(your\s+)?account\s+safety/i, label: "account safe" },
  { re: /amazon\s+approv/i, label: "amazon approved", test: hasUnnegatedAmazonApproval },       // H4 — BL fix: negation carve-out (denial forms are mandated language)
  { re: /(affiliated|partnered)\s+with\s+(amazon|walmart|ebay|shopify)/i, label: "affiliated/partnered with marketplace" }, // H5 (+founder addition 2)
  { re: /fully\s+legitimate/i, label: "fully legitimate" },                                     // H6
  { re: /risk[\s-]?free/i, label: "risk-free" },                                                // H7
  { re: /officially\s+permitted/i, label: "officially permitted" },                             // H8
  { re: /(will\s+not|won'?t)\s+(be\s+|get\s+)?suspend|no\s+risk\s+of\s+suspension/i, label: "suspension promise" }, // H9 (founder addition 1)
  // ── H10 — purchase recommendations, BOTH polarities (a don't-buy is as much a recommendation
  // as a buy; the verdict is the only guidance). "rely" is deliberately NOT in the alternation
  // ("Do Not Rely" is verdict vocabulary); "Verify Before Purchase" has no recommendation verb. ──
  { re: /\b(?:you\s+)?(?:should(?:\s+not)?|shouldn'?t|must(?:\s+not)?|do\s+not|don'?t|never|avoid)\s+(?:buy(?:ing)?|purchas\w*|sourc(?:e|ing)|resell\w*|sell(?:ing)?|order(?:ing)?|stock(?:ing)?)\b/i, label: "purchase recommendation (either polarity)" },
  { re: /\b(?:recommend|advis\w+|suggest\w*)\s+(?:that\s+)?(?:you\s+)?(?:not\s+)?(?:buy(?:ing)?|purchas\w*|sourcing|reselling|selling|ordering|against)\b/i, label: "purchase recommendation (advice verb)" },
  { re: /\bavoid\s+(?:this|that|the)\s+(?:supplier|vendor|source|wholesaler|distributor)\b/i, label: "avoid-supplier recommendation" },
  { re: /\bbuy\s+with\s+confidence\b/i, label: "buy with confidence" },
  { re: /\b(?:safe|cleared|ok(?:ay)?|fine|good)\s+to\s+(?:buy|purchas\w*|sourc\w*)\b/i, label: "safe-to-buy" },
  // ── H11 — safe/unsafe as sell/list classifications, alternation-complete (the safe-to-SELL hole). ──
  { re: /\b(?:safe|unsafe)\s+to\s+(?:sell|list|stock|resell|offer)\b/i, label: "safe/unsafe to sell (either polarity)" },
  // POST-FREEZE AMENDMENT (2026-07-24): verdict-shaped — OUR "is unsafe" blocks; an attributed
  // regulator finding ("the CPSC recall notice deemed the product unsafe") is evidence and passes.
  { re: /\b(?:is|are|was|were|looks?|seems?)\s+unsafe\b/i, label: "unsafe classification" },
  // ── H12 — confirm/certify authorization/approval/authenticity, denial-aware (the instead-column
  // IS the denial: "could not confirm authorization" passes; "confirm your intended supplier" is
  // out of scope by object). ──
  { re: /\b(?:confirm|certif)/i, label: "confirms/certifies authorization", test: hasUnnegatedConfirmAuth },
  // ── H13 — predicting Amazon's decisions, alternation-complete, BOTH polarities ("will not take
  // action" is as much a prediction as "will"). May-language never trips a will-rule. ──
  // Denial-of-prediction is mandated limitation copy ("We cannot confirm WHETHER Amazon will
  // accept an invoice" — the help disclaimer): an embedded question under a denial passes.
  { re: /\bamazon\s+will\s+(?:not\s+)?(?:accept|reject|approve|allow|permit|enforce|suspend|take\s+action)/i, label: "Amazon-decision prediction", test: (t) => {
    const re = /\bamazon\s+will\b/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t)) !== null) {
      if (!/\bamazon\s+will\s+(?:not\s+)?(?:accept|reject|approve|allow|permit|enforce|suspend|take\s+action)/i.test(t.slice(m.index, m.index + 40))) continue;
      const before = t.slice(Math.max(0, m.index - 12), m.index);
      if (!/(?:\bwhether|\bif)\s*$/i.test(before)) return true;
    }
    return false;
  } },
  { re: /\b(?:invoice|document|application|listing|account)s?\s+will\s+(?:not\s+)?be\s+(?:accepted|rejected|approved|suspended)\b/i, label: "Amazon-outcome prediction" },
  { re: /\bsuspension[\s-]*proof\b/i, label: "suspension-proof" }, // [\s-]* — tag-stripping can leave "- " between the words
  // ── H14 — legitimacy/fraud verdicts + quality GUARANTEES, both polarities (absence≠fraud:
  // calling a vendor fake is banned in the same breath as calling it legitimate). The supplier-
  // language principle (founder-ruled): observable DESCRIPTION passes ("established wholesaler",
  // "consistent with a legitimate wholesale operation" — no is/are before "legitimate"); quality
  // GUARANTEE vocabulary blocks ("authentic/genuine vendor", bare "is legitimate"). ──
  // AMENDMENT 2026-07-28 (founder-authorized, from the REAL-OUTPUT probe): alternation-complete —
  // the real 021 M9 field carried "is a VERIFIABLY legitimate corporate entity" and the adverb sat
  // in the pattern gap (a false PASS on the most client-facing field). Now: -ly adverbs and
  // intensifiers (any number), the holds/remains verb variation — while the RELATIONSHIP-framed
  // borderline ("holds a legitimate … authorized distribution relationship", evidence-attributed)
  // and "legitimately registered" (adverb, no bare adjective) stay passing. Our-voice BARE
  // ASSERTION of entity legitimacy only; consistent-with framing untouched (no is/are before it).
  { re: /\b(?:is|are|was|were|seems?|looks?|holds?|remains?)\s+(?:a\s+|an\s+)?(?:\w+ly\s+)*legitimate\b(?![^.?!]{0,60}\b(?:relationship|agreement|channel|chain-of-custody)\b)/i, label: "bare legitimacy verdict",
    test: makeVerdictGuard(/\b(?:is|are|was|were|seems?|looks?|holds?|remains?)\s+(?:a\s+|an\s+)?(?:\w+ly\s+)*legitimate\b(?![^.?!]{0,60}\b(?:relationship|agreement|channel|chain-of-custody)\b)/i) }, // #3 2026-08-16
  // POST-FREEZE AMENDMENT (founder-authorized bug-hunt, 2026-07-24): VERDICT-SHAPED, not
  // presence-based — the pipeline RESEARCHES scam reports, so its absence-reporting narrative
  // ("No scam reports were found") must never block delivery. Our-voice conclusions block;
  // research-artifact vocabulary passes. Attributed allegations ("the vendor is a scam") still
  // block by the H2 even-attributed precedent — the founder rephrases at review.
  { re: /\b(?:is|are|was|were|being)\s+(?:a\s+|an\s+)?(?:scam(?:mer)?|fake|fraud(?:ulent|ster)?|bogus)\b|\blooks?\s+(?:like\s+)?(?:a\s+)?(?:scam|fake|fraud)\b|\brunning\s+a\s+scam\b|\bscammers?\b/i, label: "fraud verdict",
    test: makeVerdictGuard(/\b(?:is|are|was|were|being)\s+(?:a\s+|an\s+)?(?:scam(?:mer)?|fake|fraud(?:ulent|ster)?|bogus)\b|\blooks?\s+(?:like\s+)?(?:a\s+)?(?:scam|fake|fraud)\b|\brunning\s+a\s+scam\b|\bscammers?\b/i) }, // #3 2026-08-16
  { re: /\b(?:fraudulent|fake|bogus)\s+(?:vendor|supplier|wholesaler|distributor|company|business|operation|reseller|entity)\b/i, label: "fraud verdict (attributive)",
    test: makeVerdictGuard(/\b(?:fraudulent|fake|bogus)\s+(?:vendor|supplier|wholesaler|distributor|company|business|operation|reseller|entity)\b/i) }, // #3 2026-08-16
  { re: /\b(?:authentic|genuine)\s+(?:vendor|supplier|wholesaler|distributor|source|business|operation|reseller)\b/i, label: "authenticity guarantee" },
  // ── H15 — approved as a status, word-order-complete (the adjacency hole: A3/A5 need
  // "approved seller/supplier"; the predicate order escaped). ──
  { re: /\b(?:supplier|vendor|wholesaler|distributor|source|seller|account|company|business)\s+(?:is|are|was|were|has\s+been|have\s+been)\s+(?:not\s+)?approved\b/i, label: "approved-status claim (either polarity)" },
  { re: /\bapproved\s+to\s+(?:sell|list|resell)\b/i, label: "approved-to-sell claim" },
];

// ASSERTION (A1–A5) — status vocabulary: ours to never assert, evidence's to be reported.
const ASSERTION: Rule[] = [
  { re: /authoriz(ed|e)\s+(seller|reseller|distributor|dealer)/i, label: "authorized seller/distributor/dealer" }, // A1
  { re: /authoris(ed|e)\s+(seller|reseller|distributor|dealer)/i, label: "authorised seller/distributor/dealer" }, // A1 (BrE)
  { re: /official\s+distributor/i, label: "official distributor" },                             // A2
  { re: /approved\s+(seller|reseller)/i, label: "approved seller/reseller" },                   // A3
  { re: /brand[\s-]approved/i, label: "brand approved" },                                       // A4
  { re: /\b(safe|approved|verified|recommended|low[\s-]?risk)\s+supplier/i, label: "safe/approved/verified supplier" }, // A5 (requires the "supplier" pairing — never matches the bare UI certainty label)
  // A6 — RULING 2026-08-16 (#2): the evidence-subject confirmation form, demoted from HARD.
  // Flags for reword ("supports", not "confirms") until the engine-prose pass retires the verb.
  { re: /\b(?:evidence|sources?|records?|documentation|filings?|listings?|pack)\b[^.?!]{0,30}\bconfirm\w*\b[^.?!]{0,40}\b(?:authoriz|authoris|approv|authentic)/i, label: "evidence-voice authorization confirmation (reword to 'supports')" },
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
