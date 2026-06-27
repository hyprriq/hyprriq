import type { AcquisitionPlugin, AcquisitionQuery, AcquisitionResult, RawSource } from "@/lib/research/acquisition/types";
import { buildProvenance } from "@/lib/research/acquisition/provenance";
import { withRetry } from "@/lib/research/acquisition/retry";

const ENDPOINT = "https://www.whoisxmlapi.com/whoisserver/WhoisService";
const PROVIDER = "WhoisXMLAPI";
const PROVIDER_VERSION = "whoisserver-v2";
// Estimated per-lookup cost (USD). Override with WHOIS_COST_PER_LOOKUP for exact billing.
const COST_PER_LOOKUP = Number(process.env.WHOIS_COST_PER_LOOKUP ?? 0.002);

// Provider-agnostic boundary (CTO §2): ONLY this adapter understands provider-specific JSON.
// Everything downstream consumes NormalizedWhois → RawSource. Swapping to RDAP/WhoisFreaks later
// changes only this normalizer, never the intelligence layer.
interface NormalizedWhois { domain: string; domain_age_days: number | null; created_date: string | null }

function normalizeWhoisXml(domain: string, data: unknown): NormalizedWhois | null {
  const rec = (data as { WhoisRecord?: { estimatedDomainAge?: number; createdDate?: string } }).WhoisRecord;
  if (!rec) return null;
  return { domain, domain_age_days: rec.estimatedDomainAge ?? null, created_date: rec.createdDate ?? null };
}

export const whoisPlugin: AcquisitionPlugin = {
  id: "whois",
  capabilities: ["domain_age", "registration_date"],
  async acquire(query: AcquisitionQuery): Promise<AcquisitionResult> {
    const key = process.env.WHOIS_API_KEY;
    if (!key) return { sources: [], retry_count: 0, final_status: "skipped", cost_usd: 0 };
    const url = `${ENDPOINT}?apiKey=${key}&domainName=${encodeURIComponent(query.input)}&outputFormat=JSON`;
    return withRetry(async () => {
      const res = await fetch(url);
      if (res.status === 429) return { sources: [], status: "rate_limited", retryable: true, cost_usd: 0 };
      if (res.status >= 500) return { sources: [], status: "server_error", retryable: true, cost_usd: 0 };
      if (!res.ok) return { sources: [], status: "permanent_error", retryable: false, cost_usd: 0 };
      const data = await res.json();
      const norm = normalizeWhoisXml(query.input, data);
      if (!norm) return { sources: [], status: "empty", retryable: false, cost_usd: COST_PER_LOOKUP };
      const sources: RawSource[] = [{
        url: `whois:${norm.domain}`,
        title: `WHOIS ${norm.domain}`,
        snippet: `Domain age ${norm.domain_age_days ?? "unknown"} days; created ${norm.created_date ?? "unknown"}.`,
        raw: data,
        provenance: buildProvenance({
          url: null, pluginId: "whois", provider: PROVIDER, providerVersion: PROVIDER_VERSION,
          collectedAt: new Date().toISOString(), freshnessDays: 0,
        }),
      }];
      return { sources, status: "ok", retryable: false, cost_usd: COST_PER_LOOKUP };
    });
  },
};
