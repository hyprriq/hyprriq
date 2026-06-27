import type { AcquisitionPlugin, AcquisitionQuery, RawSource } from "@/lib/research/acquisition/types";
import { buildProvenance } from "@/lib/research/acquisition/provenance";

const ENDPOINT = "https://google.serper.dev/search";
const MAX_RESULTS = 5; // per-query budget
const PROVIDER = "Serper";
const PROVIDER_VERSION = "search-v1";

export const serperPlugin: AcquisitionPlugin = {
  id: "serper",
  capabilities: [
    "business_registry", "linkedin_presence", "bbb_listing", "marketplace_signals",
    "dealer_page", "trade_directory", "scam_reports", "address_verification", "contact_consistency",
  ],
  async acquire(query: AcquisitionQuery): Promise<RawSource[]> {
    const key = process.env.SERPER_API_KEY;
    if (!key) return [];
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "X-API-KEY": key, "Content-Type": "application/json" },
        body: JSON.stringify({ q: query.input }),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { organic?: { title: string; link: string; snippet?: string }[] };
      const now = new Date().toISOString();
      return (data.organic ?? []).slice(0, MAX_RESULTS).map((o) => ({
        url: o.link,
        title: o.title,
        snippet: o.snippet ?? "",
        raw: o,
        provenance: buildProvenance({
          url: o.link, pluginId: "serper", provider: PROVIDER, providerVersion: PROVIDER_VERSION,
          collectedAt: now, freshnessDays: null,
        }),
      }));
    } catch {
      return [];
    }
  },
};
