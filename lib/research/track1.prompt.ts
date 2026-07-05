import type { Unknown } from "@/lib/research/contracts";

// The exact ADR-G003 supplier_identity evidence_types the LLM may propose (constrained output).
export const SUPPLIER_IDENTITY_KEYS = [
  "government_registration", "domain_age_5_plus", "domain_age_2_5", "domain_age_under_2_established",
  "address_verifiable", "linkedin_company", "phone_verifiable", "website_quality",
  "bbb_or_trade_association", "negative_reputation", "registration_fabricated", "address_fraudulent",
  "website_fraudulent", "scam_reports_corroborated",
] as const;

export interface PackSourceForPrompt { source_id: string; url: string | null; title: string; snippet: string }
export interface ProposedEvidenceItem {
  evidence_id: string; statement: string; proposed_weight_key: string;
  supporting_source_ids: string[]; mapping_justification: string; counter_evidence: string;
  certainty: "verified" | "inferred" | "unknown"; confidence: "high" | "medium" | "low";
}
// H2 — parse_failed marks "the model call produced no usable output" (API error or unparseable
// text). Distinct from a valid-but-empty response: failure is a STATE (→ n_a + hold), never a finding.
export interface ParsedTrack1 { items: ProposedEvidenceItem[]; reasoning_notes: string; unknowns: Unknown[]; parse_failed?: true }

export function buildTrack1Prompt(
  ctx: { vendor_name: string | null; vendor_website: string | null },
  sources: PackSourceForPrompt[],
): { system: string; user: string } {
  const system = [
    "You are a supplier-identity analyst for a vendor due-diligence platform.",
    "You are given an Evidence Pack of PRE-COLLECTED sources. Do NOT browse or search — reason ONLY over the pack.",
    "For each finding, emit an evidence_item that CITES the supporting source_id(s) from the pack, PROPOSES exactly one",
    `weight_key from this list: [${SUPPLIER_IDENTITY_KEYS.join(", ")}].`,
    "Also surface phone-verifiability and contact-consistency findings from the registry / address / LinkedIn / BBB",
    "sources (they contain contact data) — emit evidence items for them if found.",
    "FRAUD vs REPUTATION — do NOT conflate (this is a hard-fail key; get it right):",
    "  • scam_reports_corroborated is ONLY for MULTIPLE INDEPENDENT reports of FRAUD, scam, or non-delivery by THE",
    "    VENDOR ITSELF. A single report is NOT corroboration. Propose it only when ≥2 independent sources allege fraud by",
    "    this vendor.",
    "  • Operational / reputational complaints (poor reviews, slow shipping, bad customer service, refund/return",
    "    disputes) are NOT fraud → map them to negative_reputation, never to scam_reports_corroborated.",
    "  • A scam report about a THIRD-PARTY RESELLER or someone OTHER THAN this vendor does NOT concern the vendor —",
    "    do NOT propose scam_reports_corroborated (or any fraud key) from it. When unsure, return UNKNOWN.",
    "REGISTRATION FRAUD — registration_fabricated is ONLY for AFFIRMATIVE evidence the registration is fabricated:",
    "the official registry actively shows it is nonexistent, forged, or CONTRADICTED by the official record. It is NOT",
    "a catch-all for 'could not confirm'. Route ALL of these to UNKNOWN, NEVER registration_fabricated:",
    "  • not found where you looked / cannot verify / no matching record;",
    "  • an INACTIVE or dissolved-but-real registration (dissolved ≠ fabricated);",
    "  • a match to a DIFFERENT, parent, or DBA entity rather than this vendor.",
    "WEBSITE FRAUD — VENDOR legitimacy ONLY (Track 1 asks 'is this a real, operating wholesale business?', NOT brand",
    "affiliation, which is Track 2/Track 3). website_fraudulent applies ONLY to affirmative deception about the VENDOR'S",
    "OWN website/identity: the vendor's site is a fake/scam site, is non-functional or non-existent as a real business,",
    "or IMPERSONATES A DIFFERENT real company's OFFICIAL site to pose as that company. It requires affirmative evidence",
    "of vendor-website deception. Do NOT propose website_fraudulent for any of these:",
    "  • the vendor sells a brand but its affiliation to that brand is unconfirmed → a Track 2/Track 3 question, NOT vendor fraud;",
    "  • the client-entered vendor NAME does not match the vendor WEBSITE (name says a brand, the site is a distributor) → a",
    "    client data-entry / identity-resolution discrepancy, NOT vendor fraud — note it as an identity discrepancy, do not flag fraud;",
    "  • a real, established vendor website (real domain, operating business) whose brand relationship is merely unproven →",
    "    vendor identity HOLDS (a pass on identity).",
    "Principle: a real operating vendor website establishes vendor identity even if brand affiliation is unconfirmed;",
    "unconfirmed brand affiliation is NEVER vendor fraud.",
    "You PROPOSE classifications; the platform validates and scores them — never assume a proposal will count.",
    "If you are unsure which weight_key applies, or none fits, return proposed_weight_key: 'UNKNOWN' with your reason in",
    "mapping_justification, and set counter_evidence to 'N/A — key not proposed'. Do NOT guess — an honest UNKNOWN beats a",
    "misclassification the firewall will reject anyway.",
    "Per item you MUST include: mapping_justification (why this maps to the key), counter_evidence (what cuts against it;",
    "'None found' if nothing), certainty (verified|inferred|unknown), and confidence (high|medium|low).",
    "Return STRICT JSON: { evidence_items: [{ evidence_id, statement, proposed_weight_key, supporting_source_ids,",
    "mapping_justification, counter_evidence, certainty, confidence }], reasoning_notes, unknowns: [{ unknown,",
    "why_unresolvable, resolvable_by_client }] }.",
  ].join("\n");
  const packLines = sources.map((s) => `- ${s.source_id}: ${s.title} (${s.url ?? "no-url"}) — ${s.snippet}`).join("\n");
  const user = [
    `Vendor: ${ctx.vendor_name ?? "unknown"}  Website: ${ctx.vendor_website ?? "unknown"}`,
    "Evidence Pack:", packLines || "(empty)",
  ].join("\n");
  return { system, user };
}

const CERTAINTIES = new Set(["verified", "inferred", "unknown"]);
const CONFIDENCES = new Set(["high", "medium", "low"]);
export function parseTrack1Output(json: unknown): ParsedTrack1 {
  const o = (json ?? {}) as { evidence_items?: unknown; reasoning_notes?: unknown; unknowns?: unknown; _parse_error?: boolean };
  if (o._parse_error || !Array.isArray(o.evidence_items)) {
    return { items: [], reasoning_notes: "could not parse model output", unknowns: [], parse_failed: true };
  }
  const items: ProposedEvidenceItem[] = [];
  for (const raw of o.evidence_items as Record<string, unknown>[]) {
    if (typeof raw?.proposed_weight_key !== "string" || typeof raw?.evidence_id !== "string") continue;
    items.push({
      evidence_id: raw.evidence_id,
      statement: typeof raw.statement === "string" ? raw.statement : "",
      proposed_weight_key: raw.proposed_weight_key,
      supporting_source_ids: Array.isArray(raw.supporting_source_ids) ? raw.supporting_source_ids.filter((x): x is string => typeof x === "string") : [],
      mapping_justification: typeof raw.mapping_justification === "string" ? raw.mapping_justification : "",
      counter_evidence: typeof raw.counter_evidence === "string" ? raw.counter_evidence : "",
      certainty: CERTAINTIES.has(raw.certainty as string) ? (raw.certainty as ProposedEvidenceItem["certainty"]) : "unknown",
      confidence: CONFIDENCES.has(raw.confidence as string) ? (raw.confidence as ProposedEvidenceItem["confidence"]) : "low",
    });
  }
  return {
    items,
    reasoning_notes: typeof o.reasoning_notes === "string" ? o.reasoning_notes : "",
    unknowns: Array.isArray(o.unknowns) ? (o.unknowns as Unknown[]) : [],
  };
}
