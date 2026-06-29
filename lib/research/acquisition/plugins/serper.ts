import type { AcquisitionPlugin, AcquisitionQuery, AcquisitionResult, RawSource } from "@/lib/research/acquisition/types";
import { buildProvenance } from "@/lib/research/acquisition/provenance";
import { withRetry } from "@/lib/research/acquisition/retry";

const ENDPOINT = "https://google.serper.dev/search";
const MAX_RESULTS = 5; // per-query budget
const PROVIDER = "Serper";
const PROVIDER_VERSION = "search-v1";
// Estimated per-query cost (USD). Override with SERPER_COST_PER_QUERY for exact billing.
const COST_PER_QUERY = Number(process.env.SERPER_COST_PER_QUERY ?? 0.0003);

export const serperPlugin: AcquisitionPlugin = {
  id: "serper",
  capabilities: [
    "business_registry", "linkedin_presence", "bbb_listing", "marketplace_signals",
    "dealer_page", "trade_directory", "scam_reports", "address_verification", "contact_consistency",
    "brand_authorization", "reseller_certificate", "b2b_archetype", // Track 2
  ],
  async acquire(query: AcquisitionQuery): Promise<AcquisitionResult> {
    const key = process.env.SERPER_API_KEY;
    if (!key) return { sources: [], retry_count: 0, final_status: "skipped", cost_usd: 0 };
    return withRetry(async () => {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "X-API-KEY": key, "Content-Type": "application/json" },
        body: JSON.stringify({ q: query.input }),
      });
      if (res.status === 429) return { sources: [], status: "rate_limited", retryable: true, cost_usd: 0 };
      if (res.status >= 500) return { sources: [], status: "server_error", retryable: true, cost_usd: 0 };
      if (!res.ok) return { sources: [], status: "permanent_error", retryable: false, cost_usd: 0 };
      const data = (await res.json()) as { organic?: { title: string; link: string; snippet?: string }[] };
      const now = new Date().toISOString();
      const sources: RawSource[] = (data.organic ?? []).slice(0, MAX_RESULTS).map((o) => ({
        url: o.link,
        title: o.title,
        snippet: o.snippet ?? "",
        raw: o,
        provenance: buildProvenance({
          url: o.link, pluginId: "serper", provider: PROVIDER, providerVersion: PROVIDER_VERSION,
          collectedAt: now, freshnessDays: null,
        }),
      }));
      return { sources, status: sources.length ? "ok" : "empty", retryable: false, cost_usd: COST_PER_QUERY };
    });
  },
};
