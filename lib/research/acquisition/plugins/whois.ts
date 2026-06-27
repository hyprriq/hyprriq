import type { AcquisitionPlugin, AcquisitionQuery, RawSource } from "@/lib/research/acquisition/types";
import { buildProvenance } from "@/lib/research/acquisition/provenance";

const ENDPOINT = "https://www.whoisxmlapi.com/whoisserver/WhoisService";

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
      const data = (await res.json()) as { WhoisRecord?: { estimatedDomainAge?: number; createdDate?: string } };
      const rec = data.WhoisRecord;
      if (!rec) return [];
      const ageDays = rec.estimatedDomainAge ?? null;
      return [{
        url: `whois:${query.input}`,
        title: `WHOIS ${query.input}`,
        snippet: `Domain age ${ageDays ?? "unknown"} days; created ${rec.createdDate ?? "unknown"}.`,
        raw: data,
        provenance: buildProvenance({ url: null, pluginId: "whois", collectedAt: new Date().toISOString(), freshnessDays: 0 }),
      }];
    } catch {
      return [];
    }
  },
};
