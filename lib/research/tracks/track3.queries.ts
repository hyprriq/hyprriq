import type { TrackContext } from "@/lib/research/contracts";
import type { ResearchQuestion } from "@/lib/research/acquisition/types";

// Track 3 capability surface (Brand Risk Assessment). BRAND-scoped: the subject is each submitted
// brand's posture toward third-party resellers — the vendor is context, never the query subject
// (Amendment 2: a brand action against the investigated vendor specifically is ALSO Track 2's
// facet). Keepa is declared unavailable per OQ-A (founder-ruled fast-follow gate): its three keys
// carry firewall entries NOW (registry lock stays honest) but no pack source can earn them until
// the plugin ships.
export interface Track3Capability {
  capability_key: string;
  available: boolean;
  question: ResearchQuestion | null;
  plugin: string | null;
  reason_unavailable?: string;
}

const KEEPA_DEFERRED = "Keepa plugin not yet built — OQ-A (founder-ruled): scoped fast-follow gate; keepa_* / seller-count keys are inert until it ships. RIDER: revisit single-source corroboration for confirmed_amazon_restrictions at that gate.";
export const TRACK3_CAPABILITIES: Track3Capability[] = [
  { capability_key: "reseller_enforcement", available: true, question: "brand_enforcement", plugin: "serper" },
  { capability_key: "ip_complaints_cd", available: true, question: "ip_complaints", plugin: "serper" },
  { capability_key: "amazon_restriction", available: true, question: "brand_gating", plugin: "serper" },
  { capability_key: "map_policy", available: true, question: "map_policy", plugin: "serper" },
  { capability_key: "direct_b2b_channel", available: true, question: "b2b_archetype", plugin: "serper" },
  { capability_key: "keepa_history", available: false, question: null, plugin: null, reason_unavailable: KEEPA_DEFERRED },
];

// Per (capability × brand) Serper query template — brand-only subjects.
function inputFor(capability_key: string, brand: string): string | null {
  switch (capability_key) {
    case "reseller_enforcement": return `${brand} brand enforcement against resellers amazon sellers`;
    case "ip_complaints_cd": return `${brand} IP complaint cease and desist third party resellers`;
    case "amazon_restriction": return `${brand} brand gated restricted amazon third party sellers`;
    case "map_policy": return `${brand} MAP minimum advertised price policy`;
    case "direct_b2b_channel": return `${brand} sells direct only B2B distribution channel policy`;
    default: return null;
  }
}

export function buildTrack3Requests(ctx: TrackContext): { question: ResearchQuestion; input: string }[] {
  const brands = ctx.brands_submitted ?? [];
  const reqs: { question: ResearchQuestion; input: string }[] = [];
  for (const brand of brands) {
    for (const cap of TRACK3_CAPABILITIES) {
      if (!cap.available || !cap.question) continue;
      const input = inputFor(cap.capability_key, brand);
      if (input == null) continue;
      reqs.push({ question: cap.question, input });
    }
  }
  return reqs;
}
