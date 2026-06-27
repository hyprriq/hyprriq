import type { AcquisitionPlugin, AcquisitionQuery, RawSource } from "@/lib/research/acquisition/types";
import { buildProvenance } from "@/lib/research/acquisition/provenance";

const ENDPOINT = "https://www.whoisxmlapi.com/whoisserver/WhoisService";
const PROVIDER = "WhoisXMLAPI";
const PROVIDER_VERSION = "whoisserver-v2";

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
  async acquire(query: AcquisitionQuery): Promise<RawSource[]> {
    const key = process.env.WHOIS_API_KEY;
    if (!key) return [];
    const url = `${ENDPOINT}?apiKey=${key}&domainName=${encodeURIComponent(query.input)}&outputFormat=JSON`;
    try {
      const res = await fetch(url);
      if (!res.ok) return []; // graceful degradation — case proceeds, track records an unknown
      const data = await res.json();
      const norm = normalizeWhoisXml(query.input, data);
      if (!norm) return [];
      return [{
        url: `whois:${norm.domain}`,
        title: `WHOIS ${norm.domain}`,
        snippet: `Domain age ${norm.domain_age_days ?? "unknown"} days; created ${norm.created_date ?? "unknown"}.`,
        raw: data,
        provenance: buildProvenance({
          url: null, pluginId: "whois", provider: PROVIDER, providerVersion: PROVIDER_VERSION,
          collectedAt: new Date().toISOString(), freshnessDays: 0,
        }),
      }];
    } catch {
      return [];
    }
  },
};
