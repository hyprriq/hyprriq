import type { Unknown, QuestionToAsk } from "@/lib/research/contracts";
import { aliasGuardLine } from "@/lib/research/researchIdentity";

// The exact supply_chain_relationship evidence_types the LLM may propose. loa_legitimate is
// DELIBERATELY EXCLUDED (ADR-T2-001): an LOA is post-relationship, private, and unverifiable — it is
// not an authorization-discovery signal and routes to the Compliance Documentation layer.
export const SUPPLY_CHAIN_KEYS = [
  "dealer_page_listed", "invoice_matches_distributor", "purchases_from_mega_distributor",
  "trade_press_connection", "claims_authorization_unverified", "no_connection_found",
  "grey_market_signals", "counterfeit_channel", "conflicting_authorization",
] as const;

import { CLIENT_SUMMARY_INSTRUCTION, CLIENT_PROSE_SURFACE_RULE, parseClientSummary } from "@/lib/research/clientSummary.prompt";

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
  brand_relationship_finding: string; // ADR-T2-002 — scoped, positives-first, per-brand narrative
  b2b_only_detected: boolean;
  b2b_only_brands: string[];
  questions_to_ask: QuestionToAsk[];
  reasoning_notes: string;
  // CLIENT-FACING (2026-08-19). reasoning_notes stays internal; this is what a buyer reads.
  client_summary: string;
  unknowns: Unknown[];
  parse_failed?: true; // H2 — model call produced no usable output (API error / unparseable)
}

export function buildTrack2Prompt(
  // H4 — vendor_name is the RESEARCH identity (resolved entity); research_alias = entered name when different.
  ctx: { vendor_name: string | null; brands: string[]; identity?: { confidence: string; resolved_name: string } | null; research_alias?: string | null },
  sources: PackSourceForPrompt[],
): { system: string; user: string } {
  const system = [
    "You are a supply-chain-relationship analyst for a vendor due-diligence platform (a PRE-PURCHASE tool).",
    "You are given an Evidence Pack of PRE-COLLECTED sources. Do NOT browse or search — reason ONLY over the pack.",
    "OBJECTIVE: identify the MOST PROBABLE supply-chain relationship between the vendor and EACH submitted brand,",
    "based on PUBLICLY VERIFIABLE evidence: official dealer locators, official distributor pages, mega-distributor",
    "relationships, trade-press corroboration.",
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
    "no_connection_found from a missing LOA. Mention LOA in brand_relationship_finding ONLY when an LOA actually",
    "appears in the pack, OR when you are specifically recommending the client obtain one for brand/marketplace",
    "compliance — otherwise omit LOA entirely (most cases should never mention it; its absence carries no weight).",
    "",
    "LANE DISCIPLINE (ADR-T2-002): you assess the vendor↔brand relationship ONLY.",
    "Do NOT assess or comment on supplier legitimacy or identity — a separate Supplier Identity track owns that; treat",
    "the supplier's identity as already settled. Do NOT judge whether a marketplace will approve resale (out of scope).",
    "Keep each conclusion in its own lane; success or failure of one does NOT imply the others.",
    "BRAND_RELATIONSHIP_FINDING: write Track 2's conclusion here, scoped strictly to the vendor↔brand relationship, in",
    "THREE parts: (1) state VERIFIED POSITIVES FIRST, plainly (never bury a strong verified finding under hedging);",
    "(2) then state REMAINING UNKNOWNS / what needs verification, clearly separated from (1);",
    "(3) then state WHAT THOSE UNKNOWNS DO NOT IMPLY — an unverified relationship is NOT evidence against the supplier",
    "and NOT a vendor-wide conclusion.",
    "When MULTIPLE brands are submitted, NAME EACH BRAND explicitly within this single field and NEVER extend one",
    "brand's verified or unverified status to another brand (a vendor can be strong on one brand and unverified on another).",
    "LEGITIMACY ≠ AUTHORIZATION: brand_relationship_finding must NEVER imply a purchase decision. Do NOT write 'buy',",
    "'don't buy', 'safe to purchase', 'recommend purchasing', or any close equivalent. A legitimate supplier with an",
    "unverified brand relationship yields a NEUTRAL 'additional brand-specific verification required' — route that gap",
    "into questions_to_ask, never into an implied green light. Unknown authorization is neutral, never a warning.",
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
    "ATTRIBUTION: never state authorization/approval status as your own conclusion — always attribute it to its",
    "source ('the brand's dealer locator lists…', 'the vendor claims…'). Words like 'authorized distributor' may",
    "appear ONLY inside such attributed descriptions or in questions_to_ask.",
    // ── ENGINE-PROSE PASS (founder-ruled 2026-08-17): the confirms→supports vocabulary rule. The
    // measured residual of the banned-language census was ONE class — "confirm" standing next to
    // authorization — reached through four different grammatical shells. The gate cannot chase
    // grammar; the engine stops writing the word. A WORD rule, never a strength rule.
    "AUTHORIZATION VOCABULARY (ruled): in EVERY field you emit — statement, mapping_justification,",
    "auth_level_reasoning, brand_relationship_finding, reasoning_notes, questions_to_ask — never write",
    "'confirm', 'confirms', 'confirmed', 'confirming', 'confirmation', 'certify' or 'certified' anywhere next to",
    "authorization / authorisation / approval / authenticity. This holds in EVERY grammatical shell: your own voice",
    "('the pack confirms authorization'), a NAMED ARTIFACT as subject ('the 2025 playbook confirms current",
    "authorization', 'regional portals confirm authorization'), the PASSIVE ('authorization is confirmed for the US'),",
    "ATTRIBUTIVE noun phrases ('a confirmed authorization record', 'without confirmed authorization'), and QUESTIONS",
    "('can the distributor confirm its authorization?').",
    "Write SUPPORTS / INDICATES / ESTABLISHES / SHOWS for the verb, and VERIFIED / DOCUMENTED / ON RECORD for the",
    "adjective: 'the brand's dealer locator listing supports current US authorization', 'a documented authorization",
    "record', 'no documented authorization for Belgium', 'can the distributor state which territories its authorization",
    "covers?'.",
    "THIS IS A WORD RULE, NOT A STRENGTH RULE: a strong, verified positive is stated just as plainly and just as",
    "early as before — only the verb changes. Never hedge, soften, downgrade or bury a finding to satisfy it.",
    "no_connection_found: propose it ONLY after sufficient public evidence has been examined and none establishes a",
    "relationship. If coverage is thin or insufficient, return 'UNKNOWN' instead — absence of search is not absence of a",
    "relationship.",
    "UNKNOWN: unknown authorization is NOT negative authorization. If you cannot determine the level, return",
    "proposed_weight_key: 'UNKNOWN' with your reason in mapping_justification (counter_evidence: 'N/A — key not proposed').",
    "Do not infer negative findings from absence of evidence. You PROPOSE classifications; the platform validates and",
    "scores them — never assume a proposal will count.",
    "QUESTIONS — MANDATORY COVERAGE: for EACH remaining unknown / verification-needed point you state in",
    "brand_relationship_finding (part 2), you MUST emit a corresponding questions_to_ask item. If the finding names any",
    "open gap, questions_to_ask must NOT be empty — never return an empty questions_to_ask when unknowns exist.",
    "QUESTIONS: produce questions_to_ask as RICH objects { question, reason, blocking_weight_key, priority, brand }",
    "tailored to the specific gaps found (not a generic template). brand = the submitted brand the question concerns",
    "(use \"\" only for a genuinely vendor-level question) — in multi-brand cases each question MUST carry its brand.",
    "priority: high = affects the authorization determination; medium = strengthens confidence; low = useful but not",
    "blocking. Only generate a 'request an LOA' question when the evidence ALREADY indicates likely authorization and an",
    "LOA would merely strengthen an Amazon-compliance case — never as a primary gap.",
    "Also report an advisory auth_level (A|B|C|D|E) + auth_level_reasoning (ADVISORY only, brief DIRECT/INDIRECT +",
    "geographic-scope justification for the letter grade — the full relationship narrative goes in brand_relationship_finding).",
    "Per item you MUST include: brand, mapping_justification, counter_evidence ('None found' if none), certainty",
    "(verified|inferred|unknown), confidence (high|medium|low).",
    CLIENT_SUMMARY_INSTRUCTION,
    CLIENT_PROSE_SURFACE_RULE,
    "Return STRICT JSON: { evidence_items: [{ evidence_id, brand, statement, proposed_weight_key, supporting_source_ids,",
    "mapping_justification, counter_evidence, certainty, confidence }], auth_level, auth_level_reasoning,",
    "brand_relationship_finding, b2b_only_detected, b2b_only_brands, questions_to_ask: [{ question, reason,",
    "blocking_weight_key, priority, brand }], reasoning_notes, client_summary, unknowns: [{ unknown, why_unresolvable, resolvable_by_client }] }.",
  ].join("\n");
  const packLines = sources.map((s) => `- ${s.source_id}: ${s.title} (${s.url ?? "no-url"}) — ${s.snippet}`).join("\n");
  // D2 (ADR-T2-002): tell the model the identity is already resolved so it does not re-litigate it.
  const identityLine = ctx.identity
    ? `Supplier identity already resolved (confidence: ${ctx.identity.confidence}) as "${ctx.identity.resolved_name}" — treat identity as settled; do NOT re-assess or hedge on it.`
    : null;
  const user = [
    `Vendor: ${ctx.vendor_name ?? "unknown"}`,
    ...(identityLine ? [identityLine] : []),
    ...(ctx.research_alias ? [aliasGuardLine(ctx.research_alias)] : []),
    `Brands (analyze each separately): ${ctx.brands.length ? ctx.brands.join(", ") : "(none submitted)"}`,
    "Evidence Pack:", packLines || "(empty)",
  ].join("\n");
  return { system, user };
}

const CERTAINTIES = new Set(["verified", "inferred", "unknown"]);
const CONFIDENCES = new Set(["high", "medium", "low"]);
const LEVELS = new Set(["A", "B", "C", "D", "E"]);

const PRIORITIES = new Set(["high", "medium", "low"]);
// Exported for Track 3 (one tolerant question-parser, every track — the shape-drift fix from
// b659acd must never be re-implemented divergently).
export function parseQuestions(raw: unknown): QuestionToAsk[] {
  if (!Array.isArray(raw)) return [];
  const out: QuestionToAsk[] = [];
  for (const item of raw) {
    // TOLERANT: accept a bare string, or an object keyed `question` OR `text` — never silently drop an
    // actionable gap because of shape. (Bug: strict {question} parsing dropped string/{text} questions →
    // a case with clear unknowns persisted zero questions.)
    if (typeof item === "string") {
      const text = item.trim();
      if (text) out.push({ question: text, reason: "", blocking_weight_key: "", priority: "medium", brand: "" });
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const q = item as Record<string, unknown>;
    const question = typeof q.question === "string" ? q.question : typeof q.text === "string" ? q.text : "";
    if (!question.trim()) continue;
    out.push({
      question,
      reason: typeof q.reason === "string" ? q.reason : typeof q.why === "string" ? q.why : "",
      blocking_weight_key: typeof q.blocking_weight_key === "string" ? q.blocking_weight_key : "",
      priority: PRIORITIES.has(q.priority as string) ? (q.priority as QuestionToAsk["priority"]) : "medium",
      brand: typeof q.brand === "string" ? q.brand : "", // ADR-T2-002
    });
  }
  return out;
}

export function parseTrack2Output(json: unknown): ParsedTrack2 {
  const o = (json ?? {}) as Record<string, unknown> & { _parse_error?: boolean };
  const empty: ParsedTrack2 = {
    items: [], auth_level: null, auth_level_reasoning: "", brand_relationship_finding: "", b2b_only_detected: false,
    b2b_only_brands: [], questions_to_ask: [], reasoning_notes: "could not parse model output", client_summary: "", unknowns: [],
    parse_failed: true, // H2 — model output unusable: a STATE (→ n_a + hold), never a finding
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
    brand_relationship_finding: typeof o.brand_relationship_finding === "string" ? o.brand_relationship_finding : "",
    b2b_only_detected: o.b2b_only_detected === true,
    b2b_only_brands: Array.isArray(o.b2b_only_brands) ? (o.b2b_only_brands as unknown[]).filter((x): x is string => typeof x === "string") : [],
    questions_to_ask: parseQuestions(o.questions_to_ask),
    reasoning_notes: typeof o.reasoning_notes === "string" ? o.reasoning_notes : "",
    client_summary: parseClientSummary(o),
    unknowns: Array.isArray(o.unknowns) ? (o.unknowns as Unknown[]) : [],
  };
}
