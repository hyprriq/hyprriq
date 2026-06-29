import type { Unknown, QuestionToAsk } from "@/lib/research/contracts";

// The exact supply_chain_relationship evidence_types the LLM may propose. loa_legitimate is
// DELIBERATELY EXCLUDED (ADR-T2-001): an LOA is post-relationship, private, and unverifiable — it is
// not an authorization-discovery signal and routes to the Compliance Documentation layer.
export const SUPPLY_CHAIN_KEYS = [
  "dealer_page_listed", "invoice_matches_distributor", "purchases_from_mega_distributor",
  "trade_press_connection", "claims_authorization_unverified", "no_connection_found",
  "grey_market_signals", "counterfeit_channel", "conflicting_authorization",
] as const;

export interface PackSourceForPrompt { source_id: string; url: string | null; title: string; snippet: string }
export interface ProposedTrack2Item {
  evidence_id: string; brand: string; statement: string; proposed_weight_key: string;
  supporting_source_ids: string[]; mapping_justification: string; counter_evidence: string;
  certainty: "verified" | "inferred" | "unknown"; confidence: "high" | "medium" | "low";
}
export interface ParsedTrack2 {
  items: ProposedTrack2Item[];
  auth_level: "A" | "B" | "C" | "D" | "E" | null;
  auth_level_reasoning: string;
  b2b_only_detected: boolean;
  b2b_only_brands: string[];
  questions_to_ask: QuestionToAsk[];
  reasoning_notes: string;
  unknowns: Unknown[];
}

export function buildTrack2Prompt(
  ctx: { vendor_name: string | null; brands: string[] },
  sources: PackSourceForPrompt[],
): { system: string; user: string } {
  const system = [
    "You are a supply-chain-relationship analyst for a vendor due-diligence platform (a PRE-PURCHASE tool).",
    "You are given an Evidence Pack of PRE-COLLECTED sources. Do NOT browse or search — reason ONLY over the pack.",
    "OBJECTIVE: identify the MOST PROBABLE supply-chain relationship between the vendor and EACH submitted brand,",
    "based on PUBLICLY VERIFIABLE evidence: official dealer locators, official distributor pages, mega-distributor",
    "relationships, trade-press confirmation.",
    `For each finding, emit an evidence_item that CITES the supporting source_id(s), names the BRAND it concerns, and`,
    `PROPOSES exactly one weight_key from this list: [${SUPPLY_CHAIN_KEYS.join(", ")}].`,
    "BRAND ISOLATION: every evidence_item belongs to EXACTLY ONE brand. If a source mentions multiple brands, emit one",
    "evidence_item PER brand, each citing the SAME source_id.",
    "DIRECT vs INDIRECT: in auth_level_reasoning, explicitly state whether authorization is DIRECT manufacturer",
    "authorization or an INDIRECT distributor-chain relationship — do not blur the two.",
    "GEOGRAPHIC SCOPE: where evidence implies a territory (e.g. authorized for the US only), note the geographic",
    "authorization scope in mapping_justification.",
    "LOA RULE: an LOA (Letter of Authorization) is NOT an authorization-discovery signal — it is post-relationship,",
    "private, and unverifiable. Do NOT propose any LOA key. NEVER treat a missing LOA as negative and NEVER infer",
    "no_connection_found from a missing LOA. If an LOA appears in the pack, you may mention it in reasoning_notes as",
    "analyst context ONLY (it carries no scoring weight).",
    "B2B / DISTRIBUTOR-ONLY BRANDS: if the research indicates a brand follows a distributor-only or enterprise-only",
    "sales model, the absence of a reseller certificate is EXPECTED — never a negative signal. Base this on evidence in",
    "the pack (do not assume); list such brands in b2b_only_brands and explain the reasoning in reasoning_notes.",
    "TIME-AWARENESS: authorization evidence older than 3 years is HISTORICAL — say so in mapping_justification unless",
    "newer evidence corroborates it. Do not treat a stale distributor page as current authorization.",
    "MARKETPLACE RESTRICTIONS: marketplace-specific signals (e.g. Amazon IP complaints, Walmart exclusivity) go in",
    "reasoning_notes ONLY — they are NOT a Track 2 weight_key.",
    "PRESERVE CONTRADICTIONS: if the pack contains conflicting authorization evidence, emit SEPARATE evidence_items for",
    "each side and let the platform resolve them — NEVER self-resolve or suppress a contradiction.",
    "NO-EVIDENCE vs NEGATIVE-EVIDENCE: clearly distinguish 'no authorization evidence found' (absence) from 'evidence of",
    "negative authorization found' (e.g. grey-market / counterfeit signals). NEVER conflate the two.",
    "no_connection_found: propose it ONLY after sufficient public evidence has been examined and none establishes a",
    "relationship. If coverage is thin or insufficient, return 'UNKNOWN' instead — absence of search is not absence of a",
    "relationship.",
    "UNKNOWN: unknown authorization is NOT negative authorization. If you cannot determine the level, return",
    "proposed_weight_key: 'UNKNOWN' with your reason in mapping_justification (counter_evidence: 'N/A — key not proposed').",
    "Do not infer negative findings from absence of evidence. You PROPOSE classifications; the platform validates and",
    "scores them — never assume a proposal will count.",
    "QUESTIONS: produce questions_to_ask as RICH objects { question, reason, blocking_weight_key, priority } tailored to",
    "the specific gaps found (not a generic template). priority: high = affects the authorization determination; medium =",
    "strengthens confidence; low = useful but not blocking. Only generate a 'request an LOA' question when the evidence",
    "ALREADY indicates likely authorization and an LOA would merely strengthen an Amazon-compliance case — never as a primary gap.",
    "Also report an advisory auth_level (A|B|C|D|E) + auth_level_reasoning (ADVISORY only — the platform derives the score).",
    "Per item you MUST include: brand, mapping_justification, counter_evidence ('None found' if none), certainty",
    "(verified|inferred|unknown), confidence (high|medium|low).",
    "Return STRICT JSON: { evidence_items: [{ evidence_id, brand, statement, proposed_weight_key, supporting_source_ids,",
    "mapping_justification, counter_evidence, certainty, confidence }], auth_level, auth_level_reasoning, b2b_only_detected,",
    "b2b_only_brands, questions_to_ask: [{ question, reason, blocking_weight_key, priority }], reasoning_notes,",
    "unknowns: [{ unknown, why_unresolvable, resolvable_by_client }] }.",
  ].join("\n");
  const packLines = sources.map((s) => `- ${s.source_id}: ${s.title} (${s.url ?? "no-url"}) — ${s.snippet}`).join("\n");
  const user = [
    `Vendor: ${ctx.vendor_name ?? "unknown"}`,
    `Brands (analyze each separately): ${ctx.brands.length ? ctx.brands.join(", ") : "(none submitted)"}`,
    "Evidence Pack:", packLines || "(empty)",
  ].join("\n");
  return { system, user };
}

const CERTAINTIES = new Set(["verified", "inferred", "unknown"]);
const CONFIDENCES = new Set(["high", "medium", "low"]);
const LEVELS = new Set(["A", "B", "C", "D", "E"]);

const PRIORITIES = new Set(["high", "medium", "low"]);
function parseQuestions(raw: unknown): QuestionToAsk[] {
  if (!Array.isArray(raw)) return [];
  const out: QuestionToAsk[] = [];
  for (const q of raw as Record<string, unknown>[]) {
    if (typeof q?.question !== "string") continue;
    out.push({
      question: q.question,
      reason: typeof q.reason === "string" ? q.reason : "",
      blocking_weight_key: typeof q.blocking_weight_key === "string" ? q.blocking_weight_key : "",
      priority: PRIORITIES.has(q.priority as string) ? (q.priority as QuestionToAsk["priority"]) : "medium",
    });
  }
  return out;
}

export function parseTrack2Output(json: unknown): ParsedTrack2 {
  const o = (json ?? {}) as Record<string, unknown> & { _parse_error?: boolean };
  const empty: ParsedTrack2 = {
    items: [], auth_level: null, auth_level_reasoning: "", b2b_only_detected: false,
    b2b_only_brands: [], questions_to_ask: [], reasoning_notes: "could not parse model output", unknowns: [],
  };
  if (o._parse_error || !Array.isArray(o.evidence_items)) return empty;

  const items: ProposedTrack2Item[] = [];
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
      certainty: CERTAINTIES.has(raw.certainty as string) ? (raw.certainty as ProposedTrack2Item["certainty"]) : "unknown",
      confidence: CONFIDENCES.has(raw.confidence as string) ? (raw.confidence as ProposedTrack2Item["confidence"]) : "low",
    });
  }
  return {
    items,
    auth_level: LEVELS.has(o.auth_level as string) ? (o.auth_level as ParsedTrack2["auth_level"]) : null,
    auth_level_reasoning: typeof o.auth_level_reasoning === "string" ? o.auth_level_reasoning : "",
    b2b_only_detected: o.b2b_only_detected === true,
    b2b_only_brands: Array.isArray(o.b2b_only_brands) ? (o.b2b_only_brands as unknown[]).filter((x): x is string => typeof x === "string") : [],
    questions_to_ask: parseQuestions(o.questions_to_ask),
    reasoning_notes: typeof o.reasoning_notes === "string" ? o.reasoning_notes : "",
    unknowns: Array.isArray(o.unknowns) ? (o.unknowns as Unknown[]) : [],
  };
}
