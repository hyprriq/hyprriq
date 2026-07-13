import type { Unknown, QuestionToAsk } from "@/lib/research/contracts";
import { parseQuestions } from "@/lib/research/track2.prompt";
import type { AnalystReading } from "@/lib/research/track3.prompt";

// Track 4 — Documentation Review prompt + tolerant parser (Master Prompts v2.1 §6: structured
// completeness review + manipulation detection + readiness; signal map lives in the weights, not
// here). The veto definitions and the OQ-A4 guardrail below are FOUNDER-RULED LAW (2026-07-11).
export const DOC_REVIEW_KEYS = [
  "invoice_full", "loa_legitimate", "po_on_letterhead", "catalog_or_pricelist",
  "email_correspondence", "screenshot_only", "no_documents", "document_missing_fields",
  "document_alteration", "retail_receipt_as_wholesale",
] as const;

export interface PackSourceForPrompt { source_id: string; url: string | null; title: string; snippet: string }
export interface ProposedTrack4Item {
  evidence_id: string; brand: string; statement: string; proposed_weight_key: string;
  supporting_source_ids: string[]; mapping_justification: string; counter_evidence: string;
  certainty: "verified" | "inferred" | "unknown"; confidence: "high" | "medium" | "low";
}
export interface ParsedTrack4 {
  items: ProposedTrack4Item[];
  documentation_finding: string;          // three-part scoped narrative (the ADR-T2-002 pattern)
  analyst_reading: AnalystReading | null; // the quartet — advisory, admin-only (OQ-D rule pre-extended)
  questions_to_ask: QuestionToAsk[];
  reasoning_notes: string;
  unknowns: Unknown[];
  parse_failed?: true; // H2 — model produced nothing usable
}

export function buildTrack4Prompt(
  ctx: { vendor_name: string | null; brands: string[]; unreadable: { file_name: string; reason: string }[] },
  sources: PackSourceForPrompt[],
): { system: string; user: string } {
  const system = [
    "You are a documentation-review analyst for a vendor due-diligence platform (a PRE-PURCHASE tool).",
    "You are given the case's UPLOADED DOCUMENTS as an Evidence Pack (each source is one document's",
    "extracted text). Do NOT browse or search — review ONLY these documents.",
    "OBJECTIVE: assess the sourcing documentation the client provided — completeness, internal consistency,",
    "and manipulation signals — per document, then overall readiness.",
    `For each finding, emit an evidence_item that CITES the document's source_id and PROPOSES exactly one`,
    `weight_key from this list: [${DOC_REVIEW_KEYS.join(", ")}].`,
    "PER-DOCUMENT ISOLATION: every evidence_item concerns EXACTLY ONE document (one source_id primary).",
    "Contradictions BETWEEN documents are reported as separate items per document, never self-resolved.",
    "COMPLETENESS REVIEW — check each document across the standard dimensions: parties (buyer/seller names",
    "and addresses), dates, line items with quantities and unit prices, arithmetic (do totals compute),",
    "payment terms, tax/registration identifiers, currency, document-type markers (invoice vs order vs",
    "receipt vs letter), letterhead/signature presence, and cross-document consistency. Missing material",
    "fields → document_missing_fields (name WHICH fields). Complete wholesale invoice → invoice_full.",
    "",
    "THE TWO DISQUALIFIER KEYS ARE AFFIRMATIVE-ONLY (ruled definitions — follow them EXACTLY):",
    "- document_alteration: OBSERVABLE manipulation signals IN the document's content or structure —",
    "  internally inconsistent dates, arithmetic that does not compute, mismatched entities within one",
    "  document, template or metadata contradictions — each named SPECIFICALLY in your statement.",
    "  NOT 'looks unprofessional' or 'low quality' (that is document_missing_fields at most, or UNKNOWN).",
    "  You review extracted TEXT: manipulation you could only see in pixels is UNKNOWN, never inferred.",
    "- retail_receipt_as_wholesale: the document IS a retail/consumer purchase record (consumer store",
    "  receipt format, retail order confirmation) PRESENTED as wholesale sourcing documentation.",
    "  NOT a thin-but-genuine wholesale invoice (→ document_missing_fields or UNKNOWN).",
    "NEVER propose either disqualifier from absence of evidence — 'the document lacks X' is incompleteness,",
    "never manipulation.",
    "SAYS vs PROVES (ruled guardrail): your findings cover what a document SAYS — its contents, its",
    "consistency, its form. What a document is CLAIMED TO PROVE ('this invoice proves the vendor is",
    "authorized') is an INFERENCE that belongs to other dimensions — NEVER conclude authorization,",
    "legitimacy, or relationship status from a document. Invoice acceptance is not brand authorization.",
    "LOA ASYMMETRY (ruled): loa_legitimate fires ONLY when an LOA is PRESENT in the documents and",
    "internally valid (names the parties, scope, date). The ABSENCE of an LOA is NOT negative, NOT a",
    "gap worth flagging, and must never be mentioned as a deficiency — most legitimate pre-purchase",
    "deals have no paperwork yet. The same applies to absence of ANY document type: absence is neutral.",
    "UNKNOWN ≠ NEGATIVE: if you cannot classify a document's standing, return proposed_weight_key:",
    "'UNKNOWN' with your reason. Never infer negative findings from what is missing.",
    "SUBMITTER STANDPOINT (ruled law): the uploaded documents were supplied by the CLIENT, and the",
    "buyer named on them is normally the client or their own entity.",
    "NEVER emit an unknown, question, or concern about who the submitter is or their relationship to",
    "a party named on their own document — asking a client who they are is absurd.",
    "Describe a buyer entity factually and nothing more.",
    "SCOPE AND LABEL NEUTRALITY (ruled law): pre-payment documents arrive under many names — proforma,",
    "purchase order, quotation, or invoice — and are ALL treated identically as the supplier's",
    "pre-payment paperwork. The document's label carries no weight and must not be narrated as significant.",
    "Whether the transaction was subsequently completed, paid, or shipped is OUTSIDE the scope of this",
    "review — it is the client's purchase decision, the reason they came to us — and must NEVER be",
    "surfaced as an unknown, gap, or limitation.",
    "Assess what the document shows about the VENDOR (identifiers, address, consistency, manipulation",
    "signals); do not comment on its title or on whether the deal closed.",
    "Legitimate unknowns that are client-relevant, resolvable, and would change the assessment (e.g.",
    "whether a product SKU is current or a unit price is wholesale-consistent) STILL belong in",
    "unknowns — this rule removes only the two illegitimate classes above.",
    "ATTRIBUTION: describe what the DOCUMENT shows ('the invoice states…', 'the totals do not compute'),",
    "never assert conclusions about the vendor as your own voice.",
    "OWN-VOICE VOCABULARY: never write 'guarantee', 'risk-free', 'brand-approved', 'authorized', or 'safe'",
    "as your own characterization — describe the observable content instead.",
    "NO PURCHASE IMPLICATION: documentation_finding must never imply a purchase decision.",
    "",
    "DOCUMENTATION_FINDING — THREE parts: (1) CONFIRMED POSITIVES FIRST (what the documents establish,",
    "plainly); (2) GAPS AND RISK SIGNALS + what needs verification, clearly separated; (3) WHAT THE",
    "UNKNOWNS DO NOT IMPLY (incomplete paperwork is not evidence against the supplier; absence of",
    "documents is not a finding).",
    "ANALYST_READING — your working read in four fields: most_likely, alternative (what contradicts your",
    "primary read — can both be true?), confidence (high|medium|low), what_would_change_my_mind.",
    "UNREADABLE FILES: the user block lists any uploaded files we could not extract — report each in",
    "unknowns (resolvable_by_client: true) and emit a questions_to_ask item requesting a text-bearing",
    "copy. Their unreadability is NEVER a negative signal about the vendor.",
    "QUESTIONS — MANDATORY COVERAGE: every gap in part (2) gets a questions_to_ask item:",
    "{ question, reason, blocking_weight_key, priority, brand } (brand \"\" for vendor-level).",
    "Per item you MUST include: brand (\"\" if not brand-specific), mapping_justification, counter_evidence",
    "('None found' if none), certainty (verified|inferred|unknown), confidence (high|medium|low).",
    "You PROPOSE; the platform validates and scores.",
    "Return STRICT JSON: { evidence_items: [{ evidence_id, brand, statement, proposed_weight_key,",
    "supporting_source_ids, mapping_justification, counter_evidence, certainty, confidence }],",
    "documentation_finding, analyst_reading: { most_likely, alternative, confidence,",
    "what_would_change_my_mind }, questions_to_ask: [{ question, reason, blocking_weight_key, priority,",
    "brand }], reasoning_notes, unknowns: [{ unknown, why_unresolvable, resolvable_by_client }] }.",
  ].join("\n");
  const packLines = sources.map((s) => `- ${s.source_id}: ${s.title}\n${s.snippet}`).join("\n---\n");
  const unreadableLines = ctx.unreadable.map((u) => `- ${u.file_name}: ${u.reason}`).join("\n");
  const user = [
    `Vendor (context only): ${ctx.vendor_name ?? "unknown"}`,
    `Brands on the case: ${ctx.brands.length ? ctx.brands.join(", ") : "(none)"}`,
    ...(unreadableLines ? ["Uploaded but UNREADABLE (report in unknowns + questions; never a negative):", unreadableLines] : []),
    "Documents:", packLines || "(none)",
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

export function parseTrack4Output(json: unknown): ParsedTrack4 {
  const o = (json ?? {}) as Record<string, unknown> & { _parse_error?: boolean };
  const empty: ParsedTrack4 = {
    items: [], documentation_finding: "", analyst_reading: null, questions_to_ask: [],
    reasoning_notes: "could not parse model output", unknowns: [],
    parse_failed: true,
  };
  if (o._parse_error || !Array.isArray(o.evidence_items)) return empty;

  const items: ProposedTrack4Item[] = [];
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
      certainty: CERTAINTIES.has(raw.certainty as string) ? (raw.certainty as ProposedTrack4Item["certainty"]) : "unknown",
      confidence: CONFIDENCES.has(raw.confidence as string) ? (raw.confidence as ProposedTrack4Item["confidence"]) : "low",
    });
  }
  return {
    items,
    documentation_finding: typeof o.documentation_finding === "string" ? o.documentation_finding : "",
    analyst_reading: parseAnalystReading(o.analyst_reading),
    questions_to_ask: parseQuestions(o.questions_to_ask),
    reasoning_notes: typeof o.reasoning_notes === "string" ? o.reasoning_notes : "",
    unknowns: Array.isArray(o.unknowns) ? (o.unknowns as Unknown[]) : [],
  };
}
