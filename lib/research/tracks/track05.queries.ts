import type { TrackContext } from "@/lib/research/contracts";
import type { ResearchQuestion } from "@/lib/research/acquisition/types";

// Phase 5.1c.5 — Track 0.5 identity-discovery capability surface. A focused subset/extension of
// Track 1's discovery templates, run ONLY when no vendor_website was provided (the resolver's
// fast-path skips research when one is). Every active capability reuses an EXISTING routable
// ResearchQuestion the serper/native plugins already handle — no change to the frozen acquisition
// union. Out-of-scope registry integrations (DUNS/VAT/SEC) are declared unavailable (spec OUT-of-scope).
export interface Track05Capability {
  capability_key: string;
  available: boolean;
  question: ResearchQuestion | null;
  plugin: string | null;
  reason_unavailable?: string;
}

const OUT_OF_SCOPE = "Deferred — DUNS/VAT/SEC integration explicitly out of scope this phase (spec)";
export const TRACK05_CAPABILITIES: Track05Capability[] = [
  { capability_key: "business_registry", available: true, question: "business_registry", plugin: "serper" },
  { capability_key: "official_site", available: true, question: "linkedin_presence", plugin: "serper" },
  { capability_key: "address_verification", available: true, question: "address_verification", plugin: "serper" },
  { capability_key: "duns_registry", available: false, question: null, plugin: null, reason_unavailable: OUT_OF_SCOPE },
  { capability_key: "vat_gst_registry", available: false, question: null, plugin: null, reason_unavailable: OUT_OF_SCOPE },
];

// Per-capability identity-discovery query template (vendor-name keyed; no website needed).
function inputFor(capability_key: string, vendor: string): string | null {
  switch (capability_key) {
    case "business_registry": return `${vendor} business registration official company`;
    case "official_site": return `${vendor} official company website LinkedIn`;
    case "address_verification": return `${vendor} headquarters address contact`;
    default: return null;
  }
}

export function buildIdentityRequests(ctx: TrackContext): { question: ResearchQuestion; input: string }[] {
  const vendor = (ctx.vendor_name ?? "").trim();
  if (!vendor) return []; // nothing to discover without a name
  const reqs: { question: ResearchQuestion; input: string }[] = [];
  for (const cap of TRACK05_CAPABILITIES) {
    if (!cap.available || !cap.question) continue;
    const input = inputFor(cap.capability_key, vendor);
    if (input == null) continue;
    reqs.push({ question: cap.question, input });
  }
  return reqs;
}

// Spec-B — WEBSITE-anchored discovery: research the DOMAIN itself to resolve its real operating entity
// (name ≠ website case). Same routable ResearchQuestions (serper/native); no whois in Track 0.5's plugin
// set, so realness comes from registry / official-site / LinkedIn signals on the domain.
export function buildDomainIdentityRequests(domain: string): { question: ResearchQuestion; input: string }[] {
  const d = (domain ?? "").trim();
  if (!d) return [];
  return [
    { question: "business_registry", input: `${d} company legal name business registration entity` },
    { question: "linkedin_presence", input: `${d} company LinkedIn official about` },
    { question: "address_verification", input: `${d} headquarters address contact` },
  ];
}
