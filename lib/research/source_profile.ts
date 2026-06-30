// Phase 5.1a — the LOCKED, code-only trust registry. Authority + freshness defaults are
// deterministic IP, updatable by code deployment ONLY (never a DB table, never an admin UI,
// never LLM-assigned). This influences reasoning QUALITY + confidence explanation only — it
// never enters deriveTrackSignal/computeVerdict (ADR-G003/G004 stay locked).
import { hostOf, domainLabel } from "./host";
export type SourceProfile =
  | "government_record" | "official_brand" | "official_company" | "registry" | "whois"
  | "marketplace" | "news" | "social" | "forum" | "user_upload" | "inference";

export type AuthorityScore = "high" | "medium" | "low";
export type CoarseSourceType = "government_record" | "vendor_self_assertion" | "third_party" | "inference";

interface ProfileDef { authority_score: AuthorityScore; freshness_expectation_days: number; source_type: CoarseSourceType }

// The registry: one place, code-only. To tune trust, edit here and deploy.
export const SOURCE_PROFILES: Record<SourceProfile, ProfileDef> = {
  government_record: { authority_score: "high",   freshness_expectation_days: 1825, source_type: "government_record" },
  registry:          { authority_score: "high",   freshness_expectation_days: 730,  source_type: "third_party" },
  whois:             { authority_score: "high",   freshness_expectation_days: 3650, source_type: "third_party" },
  official_brand:    { authority_score: "high",   freshness_expectation_days: 365,  source_type: "third_party" },
  official_company:  { authority_score: "medium", freshness_expectation_days: 365,  source_type: "vendor_self_assertion" },
  news:              { authority_score: "medium", freshness_expectation_days: 365,  source_type: "third_party" },
  marketplace:       { authority_score: "medium", freshness_expectation_days: 30,   source_type: "third_party" },
  social:            { authority_score: "low",    freshness_expectation_days: 180,  source_type: "third_party" },
  forum:             { authority_score: "low",    freshness_expectation_days: 180,  source_type: "third_party" },
  user_upload:       { authority_score: "low",    freshness_expectation_days: 90,   source_type: "vendor_self_assertion" },
  inference:         { authority_score: "low",    freshness_expectation_days: 0,    source_type: "inference" },
};

export const authorityFor = (p: SourceProfile): AuthorityScore => SOURCE_PROFILES[p].authority_score;
export const freshnessExpectationFor = (p: SourceProfile): number => SOURCE_PROFILES[p].freshness_expectation_days;
export const sourceTypeFor = (p: SourceProfile): CoarseSourceType => SOURCE_PROFILES[p].source_type;

// Deterministic domain → profile classifier. Plugin id wins for non-web plugins (whois);
// otherwise classify by host. Order matters (most specific first).
const HOST_RULES: { test: RegExp; profile: SourceProfile }[] = [
  { test: /(\.gov|\.gov\.[a-z]{2}|sos\.|sec\.gov)/i, profile: "government_record" },
  { test: /(amazon\.|ebay\.|walmart\.com|etsy\.com)/i, profile: "marketplace" },
  { test: /(bbb\.org|dnb\.com|opencorporates\.com|companieshouse)/i, profile: "registry" },
  { test: /(reddit\.com|quora\.com|forum)/i, profile: "forum" },
];
// Social domains — matched against the parsed HOSTNAME (anchored), not a substring of the full URL.
// (A loose /x\.com/ on the URL wrongly matched 'tdsynnex.com', 'netflix.com', etc.)
const SOCIAL_HOST = /(^|\.)(?:linkedin|facebook|twitter|x|instagram)\.com$/i;

// Optional metadata that lets the classifier recognise OFFICIAL domains it otherwise can't infer
// from the host alone (the web has no generic "this is the brand's own site" signal). Driven by the
// case's submitted brands + the vendor's own website — NOT a hard-coded brand→domain table.
export interface ClassifyContext {
  vendorHost?: string | null;   // the vendor's own website host (any form; normalised internally)
  brandTokens?: string[];       // normalised brand-name tokens, e.g. ["lenovo", "bosch"]
}

export function normalizeBrandToken(brand: string): string {
  return brand.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Host-parse helpers (hostOf / domainLabel) now live in ./host so the Track 0.5 resolver and this
// classifier share ONE implementation (DRY). Behavior is identical to the prior inline versions.

export function classifySource(url: string, pluginId: string, ctx?: ClassifyContext): SourceProfile {
  if (pluginId === "whois") return "whois";
  if (pluginId === "inference") return "inference";
  // Official-domain recognition (metadata-driven, most specific) — runs before the host rules so a
  // brand's / vendor's own site is tagged official rather than defaulting to "news".
  const host = hostOf(url);
  if (host && ctx) {
    const label = domainLabel(host);
    if (label && (ctx.brandTokens ?? []).includes(label)) return "official_brand";   // brand's own domain
    const vendorLabel = ctx.vendorHost ? domainLabel(hostOf(ctx.vendorHost) ?? "") : "";
    if (label && vendorLabel && label === vendorLabel) return "official_company";     // vendor's own domain
  }
  if (host && SOCIAL_HOST.test(host)) return "social"; // hostname-anchored (no x.com substring trap)
  for (const r of HOST_RULES) if (r.test.test(url)) return r.profile;
  return "news"; // default for an unclassified third-party web result
}
