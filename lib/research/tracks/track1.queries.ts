import { inferJurisdiction, registryQuery, tradeBodyQuery, type Jurisdiction } from "@/lib/research/jurisdiction";
import type { TrackContext } from "@/lib/research/contracts";
import type { ResearchQuestion } from "@/lib/research/acquisition/types";
import { researchIdentityFor } from "@/lib/research/researchIdentity";

// Track 1 capability surface. Active capabilities map to a ResearchQuestion + plugin; future plugins
// are declared with available:false (declared only — flip to true + add the plugin when it ships).
export interface Track1Capability {
  capability_key: string;
  available: boolean;
  question: ResearchQuestion | null;
  plugin: string | null;
  reason_unavailable?: string;
}

const FUTURE = "Plugin not yet built — planned for Phase 5.x";
export const TRACK1_CAPABILITIES: Track1Capability[] = [
  { capability_key: "domain_age", available: true, question: "domain_age", plugin: "whois" },
  { capability_key: "business_registry", available: true, question: "business_registry", plugin: "serper" },
  { capability_key: "linkedin_presence", available: true, question: "linkedin_presence", plugin: "serper" },
  { capability_key: "bbb_listing", available: true, question: "bbb_listing", plugin: "serper" },
  { capability_key: "address_verification", available: true, question: "address_verification", plugin: "serper" },
  { capability_key: "scam_reports", available: true, question: "scam_reports", plugin: "serper" },
  { capability_key: "secretary_of_state_direct", available: false, question: null, plugin: null, reason_unavailable: FUTURE },
  { capability_key: "duns_registry", available: false, question: null, plugin: null, reason_unavailable: FUTURE },
  { capability_key: "vat_gst_registry", available: false, question: null, plugin: null, reason_unavailable: FUTURE },
  { capability_key: "google_business_profile", available: false, question: null, plugin: null, reason_unavailable: FUTURE },
  { capability_key: "import_records", available: false, question: null, plugin: null, reason_unavailable: FUTURE },
  { capability_key: "trademark_registry", available: false, question: null, plugin: null, reason_unavailable: FUTURE },
];

function host(website: string | null): string | null {
  if (!website) return null;
  try { return new URL(website.startsWith("http") ? website : `https://${website}`).hostname; } catch { return null; }
}

// Per-capability query template. domain_age uses the host directly; the rest are Serper search strings.
// phone_verifiable + contact consistency are NOT separate queries — the LLM surfaces them from the
// registry / address / LinkedIn / BBB results during interpretation.
function inputFor(capability_key: string, vendor: string, h: string | null, j: Jurisdiction): string | null {
  switch (capability_key) {
    case "domain_age": return h;
    // ── JURISDICTION-AWARE (2026-08-20). WAS: "<vendor> business registration secretary of state".
    // "Secretary of state" is a US-ONLY concept, asked of every supplier on earth. A UK company is
    // at Companies House, a German one at the Handelsregister — neither appears under a US term, so
    // government_registration (+4, the largest positive in the identity table) was unreachable for
    // them, and the report told the client "no government registration record was found" as though
    // it were a finding about the supplier. When the country is unknown we ask the NEUTRAL question,
    // never the US one.
    case "business_registry": return registryQuery(vendor, j);
    case "linkedin_presence": return `${vendor} LinkedIn company`;
    // ── THE KEY IS `bbb_or_trade_association` AND THIS ONLY ASKED ABOUT THE BBB, so
    // trade-association evidence was unfindable for EVERY supplier, US included. The BBB does not
    // exist outside the US/Canada, so asking non-US suppliers about it was a guaranteed miss.
    case "bbb_listing": return tradeBodyQuery(vendor, j);
    case "address_verification": return `${vendor} address phone contact`;
    case "scam_reports": return `${vendor} scam complaints reviews fraud`;
    default: return null;
  }
}

export function buildTrack1Requests(ctx: TrackContext): { question: ResearchQuestion; input: string }[] {
  // H4 — investigate the RESOLVED entity (audit N1): the client's raw entry is never the research
  // subject once Track 0.5 confirmed who the supplier is. researchIdentityFor is the single
  // decision point shared with the prompts.
  const vendor = researchIdentityFor(ctx).name;
  // OQ-2 retrofit — prefer the Track 0.5 resolved_domain (high-confidence identity) for the domain_age
  // (whois) lookup; fall back to the raw website. Behaviorally identical when a website was provided
  // (resolved_domain == its host), and strictly ADDITIVE when it was blank (Track 1 gains domain-age it
  // never had). resolved_domain is null when identity didn't resolve → falls back to vendor_website.
  const h = host(ctx.supplier_identity?.resolved_domain ?? ctx.vendor_website);
  // WHERE IS THIS SUPPLIER? Inferred from the resolved domain, then the resolved address, then the
  // marketplace as a last resort. It changes only WHAT WE ASK — never what an answer is worth.
  const j = inferJurisdiction({
    domain: ctx.supplier_identity?.resolved_domain ?? ctx.vendor_website ?? null,
    address: (ctx.supplier_identity as { resolved_address?: string } | null)?.resolved_address ?? null,
    marketplace: ctx.marketplace ?? null,
  });
  const reqs: { question: ResearchQuestion; input: string }[] = [];
  for (const cap of TRACK1_CAPABILITIES) {
    if (!cap.available || !cap.question) continue;
    const input = inputFor(cap.capability_key, vendor, h, j);
    if (input == null) continue; // e.g. domain_age with no website
    reqs.push({ question: cap.question, input });
  }
  return reqs;
}
