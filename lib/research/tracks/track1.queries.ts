import { inferJurisdictionSet, registryQuery, tradeBodyQuery, type Jurisdiction } from "@/lib/research/jurisdiction";
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

// Per-capability query templates. domain_age uses the host directly; the rest are Serper search
// strings. phone_verifiable + contact consistency are NOT separate queries — the LLM surfaces them
// from the registry / address / LinkedIn / BBB results during interpretation.
//
// ── JURISDICTION-AWARE (2026-08-20), AND A SET (founder-directed, same day). WAS: one US question
// for every supplier on earth; THEN one jurisdiction-aware question. A vendor can hold a
// registration in one country and a presence in another — ordinary in wholesale — so the registry
// and trade-body questions are now asked ONCE PER member of the jurisdiction set (domain ccTLD +
// every address country; neutral only when the set is empty). Identical query strings dedupe.
// This changes WHAT WE ASK, never what an answer is worth.
function inputsFor(capability_key: string, vendor: string, h: string | null, js: Jurisdiction[]): string[] {
  switch (capability_key) {
    case "domain_age": return h ? [h] : [];
    case "business_registry": return [...new Set(js.map((j) => registryQuery(vendor, j)))];
    case "linkedin_presence": return [`${vendor} LinkedIn company`];
    // The KEY is `bbb_or_trade_association`: the query matches the key it feeds, and drops the BBB
    // outside the US/Canada where it does not exist.
    case "bbb_listing": return [...new Set(js.map((j) => tradeBodyQuery(vendor, j)))];
    case "address_verification": return [`${vendor} address phone contact`];
    case "scam_reports": return [`${vendor} scam complaints reviews fraud`];
    default: return [];
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
  // WHERE IS THIS SUPPLIER? A SET: the resolved domain's country plus every country the resolved
  // address supports, marketplace as a total-tie-break only. Every member gets its registry
  // question. It changes only WHAT WE ASK — never what an answer is worth.
  const js = inferJurisdictionSet({
    domain: ctx.supplier_identity?.resolved_domain ?? ctx.vendor_website ?? null,
    address: (ctx.supplier_identity as { resolved_address?: string } | null)?.resolved_address ?? null,
    marketplace: ctx.marketplace ?? null,
  });
  const reqs: { question: ResearchQuestion; input: string }[] = [];
  for (const cap of TRACK1_CAPABILITIES) {
    if (!cap.available || !cap.question) continue;
    for (const input of inputsFor(cap.capability_key, vendor, h, js)) {
      reqs.push({ question: cap.question, input });
    }
  }
  return reqs;
}
