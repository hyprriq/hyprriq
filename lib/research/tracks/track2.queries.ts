import type { TrackContext } from "@/lib/research/contracts";
import type { ResearchQuestion } from "@/lib/research/acquisition/types";

// Track 2 capability surface (Supply Chain Relationship). Active capabilities map to a
// ResearchQuestion + plugin; future plugins are declared available:false (flip + add the plugin when
// it ships). Track 2 is BRAND-SCOPED — each submitted brand gets its own authorization-discovery
// queries so evidence can be isolated per brand downstream.
export interface Track2Capability {
  capability_key: string;
  available: boolean;
  question: ResearchQuestion | null;
  plugin: string | null;
  reason_unavailable?: string;
}

const FUTURE = "Plugin not yet built — planned for Phase 5.x";
export const TRACK2_CAPABILITIES: Track2Capability[] = [
  { capability_key: "brand_authorization", available: true, question: "brand_authorization", plugin: "serper" },
  { capability_key: "distributor_relationship", available: true, question: "trade_directory", plugin: "serper" },
  { capability_key: "reseller_certificate", available: true, question: "reseller_certificate", plugin: "serper" },
  { capability_key: "brand_dealer_locator", available: true, question: "dealer_page", plugin: "serper" },
  { capability_key: "grey_market", available: true, question: "marketplace_signals", plugin: "serper" },
  { capability_key: "b2b_archetype", available: true, question: "b2b_archetype", plugin: "serper" },
  { capability_key: "brand_direct_api", available: false, question: null, plugin: null, reason_unavailable: FUTURE },
  { capability_key: "distributor_registry", available: false, question: null, plugin: null, reason_unavailable: FUTURE },
];

// Per (capability × brand) Serper query template. (reseller_certificate is public DISCOVERY only — a
// publicly-stated reseller relationship; an UPLOADED cert/LOA routes to the Compliance layer, ADR-T2-001.)
function inputFor(capability_key: string, vendor: string, brand: string): string | null {
  switch (capability_key) {
    case "brand_authorization": return `${vendor} authorized distributor ${brand}`;
    case "distributor_relationship": return `${vendor} ${brand} distribution agreement`;
    case "reseller_certificate": return `${vendor} ${brand} reseller certificate`;
    case "brand_dealer_locator": return `${brand} authorized dealers distributors`;
    case "grey_market": return `${vendor} ${brand} grey market unauthorized`;
    case "b2b_archetype": return `${brand} authorized distributor only B2B`;
    default: return null;
  }
}

export function buildTrack2Requests(ctx: TrackContext): { question: ResearchQuestion; input: string }[] {
  const vendor = ctx.vendor_name ?? "";
  const brands = ctx.brands_submitted ?? [];
  const reqs: { question: ResearchQuestion; input: string }[] = [];
  for (const brand of brands) {
    for (const cap of TRACK2_CAPABILITIES) {
      if (!cap.available || !cap.question) continue;
      const input = inputFor(cap.capability_key, vendor, brand);
      if (input == null) continue;
      reqs.push({ question: cap.question, input });
    }
  }
  return reqs;
}
