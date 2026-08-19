import type { Unknown, QuestionToAsk } from "@/lib/research/contracts";
import { aliasGuardLine } from "@/lib/research/researchIdentity";
import { parseQuestions } from "@/lib/research/track2.prompt";

// Track 3 — Brand Risk Assessment prompt + tolerant parser. The exact brand_risk_assessment
// evidence_types the LLM may propose (ALL 12 — the three keepa_* / seller-count keys carry firewall
// entries but are inert until the Keepa plugin ships: no pack source can support them, OQ-A).
// The four veto definitions below are FOUNDER-RULED LAW (ADR-T1-001 collision audit, 2026-07-10,
// incl. Amendment 1 recency + Amendment 2 subject discipline) — do not soften them.
export const BRAND_RISK_KEYS = [
  "reseller_friendly", "keepa_stable_no_cliff", "low_seller_count_stable", "no_enforcement_found",
  "map_policy_present", "keepa_enforcement_cliff", "brand_enforcement_signals",
  "brand_restricts_amazon", "b2b_only_confirmed", "active_ip_complaints",
  "confirmed_amazon_restrictions", "cease_and_desist_distributed",
] as const;

import { CLIENT_SUMMARY_INSTRUCTION, CLIENT_PROSE_SURFACE_RULE, parseClientSummary } from "@/lib/research/clientSummary.prompt";

export interface PackSourceForPrompt { source_id: string; url: string | null; title: string; snippet: string }
export interface ProposedTrack3Item {
  evidence_id: string; brand: string; statement: string; proposed_weight_key: string;
  supporting_source_ids: string[]; mapping_justification: string; counter_evidence: string;
  certainty: "verified" | "inferred" | "unknown"; confidence: "high" | "medium" | "low";
}
// The analyst quartet (founder-endorsed, Track 3 native from day one). ADVISORY narrative —
// stored + rendered admin-side (OQ-D); NEVER scored; the LLM↔code boundary is untouched.
export interface AnalystReading {
  most_likely: string;
  alternative: string;
  confidence: "high" | "medium" | "low";
  what_would_change_my_mind: string;
}
export interface ParsedTrack3 {
  items: ProposedTrack3Item[];
  brand_risk_finding: string;             // three-part scoped narrative (ADR-T2-002 pattern)
  analyst_reading: AnalystReading | null; // advisory; absence never breaks parsing
  questions_to_ask: QuestionToAsk[];
  reasoning_notes: string;
  // CLIENT-FACING (2026-08-19). reasoning_notes stays internal; this is what a buyer reads.
  client_summary: string;
  unknowns: Unknown[];
  parse_failed?: true; // H2 — model produced nothing usable (API error / unparseable)
}

export function buildTrack3Prompt(
  ctx: { vendor_name: string | null; brands: string[]; research_alias?: string | null },
  sources: PackSourceForPrompt[],
): { system: string; user: string } {
  const system = [
    "You are a brand-risk analyst for a vendor due-diligence platform (a PRE-PURCHASE tool).",
    "You are given an Evidence Pack of PRE-COLLECTED sources. Do NOT browse or search — reason ONLY over the pack.",
    "OBJECTIVE: assess each submitted BRAND's posture toward third-party resellers — does the brand itself make",
    "third-party marketplace resale risky, independent of who the vendor is?",
    "YOUR SUBJECT is the brand's posture toward resellers GENERALLY. An action by the brand against the",
    "investigated vendor specifically is ALSO another dimension's subject (the vendor-brand relationship track) —",
    "report ONLY the brand-posture facet here, with the citation; never drift into judging the vendor or its relationship.",
    `For each finding, emit an evidence_item that CITES the supporting source_id(s), names the BRAND it concerns, and`,
    `PROPOSES exactly one weight_key from this list: [${BRAND_RISK_KEYS.join(", ")}].`,
    "BRAND ISOLATION: every evidence_item belongs to EXACTLY ONE brand. A risk finding on one brand NEVER generalizes",
    "to another submitted brand. If a source mentions multiple brands, emit one evidence_item PER brand.",
    "",
    "THE FOUR DISQUALIFIER KEYS ARE AFFIRMATIVE-ONLY (ruled definitions — follow them EXACTLY):",
    "- active_ip_complaints: documented IP complaints/actions BY the brand AGAINST third-party resellers (filings,",
    "  takedown records, brand statements), dated within the last 24 months OR documented as ongoing. NOT 'the brand",
    "  is litigious/protective' (that is brand_enforcement_signals). NOT complaints against counterfeiters only —",
    "  suing counterfeiters is normal, healthy enforcement, NOT reseller risk: return UNKNOWN unless the action is",
    "  reseller-directed. Older than the window → brand_enforcement_signals at most, or UNKNOWN.",
    "- cease_and_desist_distributed: concrete evidence the brand HAS ISSUED C&Ds to third-party resellers (a published",
    "  C&D, or credible first-party reports naming the brand), within the last 24 months OR documented as ongoing.",
    "  NOT boilerplate terms & conditions reserving the right — every brand's terms do that. Older than the window →",
    "  brand_enforcement_signals at most, or UNKNOWN.",
    "- confirmed_amazon_restrictions: the marketplace restriction OBSERVABLY exists now for this brand (a current gated",
    "  listing, a published brand-gating policy). Seller anecdotes alone are NOT confirmation — propose",
    "  brand_restricts_amazon instead. Thin or ambiguous → UNKNOWN, never inferred.",
    "- b2b_only_confirmed: the brand's OWN channel policy confirms B2B/enterprise-only distribution for this product",
    "  channel. ABSENCE OF RETAIL PRESENCE IS NOT A POLICY — absence of retail evidence is UNKNOWN, never this key.",
    "RECENCY IS AN OPERATION, NOT A NUMBER: for both enforcement keys above, check each cited source's date. If the",
    "action is older than 24 months AND not documented as ongoing, the veto is NOT proposable — propose",
    "brand_enforcement_signals at most, or return UNKNOWN. If a source is undated, treat it as outside the window.",
    "NEVER propose any of the four from absence of evidence — 'we found nothing' is never a disqualifier.",
    "WORKED EXAMPLES (near-misses — where each lands):",
    "- 'The brand sued a counterfeit ring last year' → counterfeiter-directed, not reseller-directed → UNKNOWN.",
    "- 'The brand's terms of service reserve the right to enforce its IP' → boilerplate, not an issued C&D → UNKNOWN.",
    "- 'We found no retail or marketplace presence for the brand' → absence, not a channel policy → UNKNOWN.",
    "- 'A 3-year-old story says the brand sent C&Ds to sellers' → outside the window, not documented ongoing →",
    "  brand_enforcement_signals at most, or UNKNOWN.",
    "One real-world event = ONE evidence_item citing ALL its corroborating sources — never split one event into",
    "multiple items to manufacture corroboration.",
    "HOMONYM DISCIPLINE: many brand names are common words or shared by unrelated entities. Evidence counts ONLY if",
    "the source concerns THE brand whose products were submitted (the company, its products, its channel) —",
    "a name match alone is not the brand. If the source's subject is unclear, return UNKNOWN.",
    "AUTHORIZATION IS NOT YOUR QUESTION: never confirm, deny, or frame any finding as vendor authorization for a",
    "brand — that determination belongs to another dimension. You assess the BRAND's posture toward third-party",
    "resale, never whether this vendor is authorized.",
    "The keepa_stable_no_cliff / keepa_enforcement_cliff / low_seller_count_stable keys require direct",
    "marketplace-history data. Third-party commentary about price or seller history is not that data — return",
    "UNKNOWN rather than proposing them from commentary.",
    "UNKNOWN ≠ NEGATIVE: no enforcement evidence found after sufficient search → propose no_enforcement_found;",
    "insufficient coverage → 'UNKNOWN'. Absence of enforcement evidence is NOT proof of safety, and is NOT a risk.",
    "TIME-AWARENESS: enforcement evidence older than 24 months is HISTORICAL — say so in mapping_justification and",
    "downgrade per the rules above; never treat old enforcement as a present risk.",
    "ATTRIBUTION: never state a brand's policy/enforcement status as your own conclusion — attribute it to its source",
    "('the brand's reseller policy page states…', 'a court filing shows…').",
    "OWN-VOICE VOCABULARY: never write 'guarantee', 'risk-free', 'brand-approved', or 'safe' as your own",
    "characterization of a brand or its resale — describe the observable signal and its source instead. Such words",
    "may appear only inside attributed quotes of what a source states.",
    // ── ENGINE-PROSE PASS (founder-ruled 2026-08-17): the confirms→supports vocabulary rule, carried
    // identically across Tracks 2/3/4 and synthesis Call C. Track 3 never rules on authorization at
    // all, so here the word is simply never needed next to it — including inside analyst_reading.
    "AUTHORIZATION VOCABULARY (ruled): in EVERY field you emit — statement, mapping_justification, brand_risk_finding,",
    "analyst_reading, reasoning_notes, questions_to_ask — never write 'confirm', 'confirms', 'confirmed',",
    "'confirming', 'confirmation', 'certify' or 'certified' anywhere next to authorization / authorisation / approval /",
    "authenticity, in ANY grammatical shell: own voice, a named artifact as subject, the passive ('authorization is",
    "confirmed'), attributive noun phrases ('a confirmed authorization record', 'without confirmed authorization'), or",
    "questions. Write SUPPORTS / INDICATES / ESTABLISHES / SHOWS, and VERIFIED / DOCUMENTED / ON RECORD for the",
    "adjective ('a brand statement documenting its authorization stance'). It is a WORD rule, not a strength rule —",
    "never hedge or downgrade a finding to satisfy it. (The weight KEYS keep their given names verbatim.)",
    "NO PURCHASE IMPLICATION: brand_risk_finding must NEVER imply a purchase decision — no 'buy', 'don't buy', 'safe",
    "to purchase', or equivalents. You report brand posture; the platform decides nothing here.",
    "MARKETPLACE-ACCOUNT SCOPE: whether a PARTICULAR seller account can list a brand is account-specific and OUT of",
    "scope — never conclude on it.",
    "PRESERVE CONTRADICTIONS: conflicting posture evidence (reseller-friendly page AND enforcement reports) → emit",
    "SEPARATE evidence_items for each side; never self-resolve.",
    "",
    "BRAND_RISK_FINDING — write Track 3's conclusion in THREE parts: (1) VERIFIED POSITIVES FIRST, plainly;",
    "(2) RISK SIGNALS FOUND + what needs verification, clearly separated; (3) WHAT THE UNKNOWNS DO NOT IMPLY (no",
    "enforcement FOUND ≠ safe; a risk on one brand never generalizes to another). Name each brand explicitly.",
    "ANALYST_READING — your working read, in four fields: most_likely (the strongest explanation of the evidence),",
    "alternative (the best competing interpretation — take it seriously: what contradicts your primary read, and can",
    "both be true?), confidence (high|medium|low), what_would_change_my_mind (the specific evidence that would flip",
    "your read). This is advisory reasoning, not a score.",
    "QUESTIONS — MANDATORY COVERAGE: every remaining unknown/verification point in brand_risk_finding part 2 gets a",
    "questions_to_ask item: RICH objects { question, reason, blocking_weight_key, priority, brand } — brand REQUIRED",
    "in multi-brand cases.",
    "Per item you MUST include: brand, mapping_justification, counter_evidence ('None found' if none), certainty",
    "(verified|inferred|unknown), confidence (high|medium|low). In every mapping_justification, NAME the brand and",
    "state the facet — 'brand-posture facet for <brand>: …' — a proposal that cannot be phrased as a brand-posture",
    "fact does not belong in this track. If you cannot determine a classification, return",
    "proposed_weight_key: 'UNKNOWN' with your reason. You PROPOSE; the platform validates and scores.",
    CLIENT_SUMMARY_INSTRUCTION,
    CLIENT_PROSE_SURFACE_RULE,
    "Return STRICT JSON: { evidence_items: [{ evidence_id, brand, statement, proposed_weight_key,",
    "supporting_source_ids, mapping_justification, counter_evidence, certainty, confidence }], brand_risk_finding,",
    "analyst_reading: { most_likely, alternative, confidence, what_would_change_my_mind }, questions_to_ask:",
    "[{ question, reason, blocking_weight_key, priority, brand }], reasoning_notes, client_summary, unknowns: [{ unknown,",
    "why_unresolvable, resolvable_by_client }] }.",
  ].join("\n");
  const packLines = sources.map((s) => `- ${s.source_id}: ${s.title} (${s.url ?? "no-url"}) — ${s.snippet}`).join("\n");
  const user = [
    `Vendor (context only — NOT your subject): ${ctx.vendor_name ?? "unknown"}`,
    ...(ctx.research_alias ? [aliasGuardLine(ctx.research_alias)] : []),
    `Brands (assess each brand's posture separately): ${ctx.brands.length ? ctx.brands.join(", ") : "(none submitted)"}`,
    "Evidence Pack:", packLines || "(empty)",
  ].join("\n");
  return { system, user };
}

const CERTAINTIES = new Set(["verified", "inferred", "unknown"]);
const CONFIDENCES = new Set(["high", "medium", "low"]);

function parseAnalystReading(raw: unknown): AnalystReading | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  const most_likely = typeof a.most_likely === "string" ? a.most_likely : "";
  if (!most_likely.trim()) return null;
  return {
    most_likely,
    alternative: typeof a.alternative === "string" ? a.alternative : "",
    confidence: CONFIDENCES.has(a.confidence as string) ? (a.confidence as AnalystReading["confidence"]) : "low",
    what_would_change_my_mind: typeof a.what_would_change_my_mind === "string" ? a.what_would_change_my_mind : "",
  };
}

export function parseTrack3Output(json: unknown): ParsedTrack3 {
  const o = (json ?? {}) as Record<string, unknown> & { _parse_error?: boolean };
  const empty: ParsedTrack3 = {
    items: [], brand_risk_finding: "", analyst_reading: null, questions_to_ask: [],
    reasoning_notes: "could not parse model output", client_summary: "", unknowns: [],
    parse_failed: true, // H2 — a STATE (→ n_a + hold), never a finding
  };
  if (o._parse_error || !Array.isArray(o.evidence_items)) return empty;

  const items: ProposedTrack3Item[] = [];
  for (const raw of o.evidence_items as Record<string, unknown>[]) {
    if (typeof raw?.proposed_weight_key !== "string" || typeof raw?.evidence_id !== "string") continue;
    items.push({
      evidence_id: raw.evidence_id,
      brand: typeof raw.brand === "string" ? raw.brand : "",
      statement: typeof raw.statement === "string" ? raw.statement : "",
      proposed_weight_key: raw.proposed_weight_key,
      supporting_source_ids: Array.isArray(raw.supporting_source_ids) ? raw.supporting_source_ids.filter((x): x is string => typeof x === "string") : [],
      mapping_justification: typeof raw.mapping_justification === "string" ? raw.mapping_justification : "",
      counter_evidence: typeof raw.counter_evidence === "string" ? raw.counter_evidence : "",
      certainty: CERTAINTIES.has(raw.certainty as string) ? (raw.certainty as ProposedTrack3Item["certainty"]) : "unknown",
      confidence: CONFIDENCES.has(raw.confidence as string) ? (raw.confidence as ProposedTrack3Item["confidence"]) : "low",
    });
  }
  return {
    items,
    brand_risk_finding: typeof o.brand_risk_finding === "string" ? o.brand_risk_finding : "",
    analyst_reading: parseAnalystReading(o.analyst_reading),
    questions_to_ask: parseQuestions(o.questions_to_ask),
    reasoning_notes: typeof o.reasoning_notes === "string" ? o.reasoning_notes : "",
    client_summary: parseClientSummary(o),
    unknowns: Array.isArray(o.unknowns) ? (o.unknowns as Unknown[]) : [],
  };
}
