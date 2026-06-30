import type { SourceProfile, AuthorityScore, CoarseSourceType, ClassifyContext } from "@/lib/research/source_profile";
import type { TrackKey } from "@/lib/constants/tracks";

// The questions a track can ask. Plugins declare which they answer (capability matrix).
export type ResearchQuestion =
  | "domain_age" | "registration_date" | "business_registry" | "linkedin_presence"
  | "bbb_listing" | "marketplace_signals" | "dealer_page" | "trade_directory"
  | "scam_reports" | "address_verification" | "contact_consistency"
  // Track 2 (supply_chain_relationship) — Serper search questions
  | "brand_authorization" | "reseller_certificate" | "b2b_archetype";

export type AcquisitionMethod = "serper" | "whois" | "native_web_search" | "manual" | "inference";

// Outcome of one acquisition call after the retry policy resolves (audit + metrics).
export type AcquisitionStatus =
  | "ok" | "empty" | "skipped" | "rate_limited" | "server_error" | "network_error" | "permanent_error";

// Code-assigned at acquisition (certainty is added later by the track LLM — see EvidenceItem).
// Full provenance chain (CTO §6): provider + version + plugin recorded so the source stays
// replayable/auditable across provider swaps (§2).
export interface Provenance {
  provider: string;                    // external service, e.g. "WhoisXMLAPI", "Serper"
  provider_version: string;            // provider API version (replay across provider swaps)
  plugin: AcquisitionMethod;           // our adapter id
  acquisition_method: AcquisitionMethod;
  source_profile: SourceProfile;
  source_type: CoarseSourceType;       // derived from source_profile
  authority_score: AuthorityScore;     // from the registry
  freshness_days: number | null;       // age of the source at acquisition (null = unknown)
  collected_at: string;                // ISO; persisted, point-in-time
  expires_at: string;                  // collected_at + profile freshness expectation; persisted
  refresh_required: boolean;           // persisted; default false at acquisition
}

export interface RawSource {
  url: string | null;
  title: string;
  snippet: string;
  raw: unknown;                        // the original provider payload (audit)
  provenance: Provenance;
}

export interface AcquisitionQuery {
  question: ResearchQuestion;
  input: string;                       // domain (whois) or search string (serper)
  case_id: string;
  track_key: TrackKey;
  classification?: ClassifyContext;    // optional official-domain metadata (Track 2+); whois/native ignore it
}

// What a plugin returns from one acquire() call: the sources plus retry/cost/status for metrics.
export interface AcquisitionResult {
  sources: RawSource[];
  retry_count: number;
  final_status: AcquisitionStatus;
  cost_usd: number;                // real per-call provider cost
}

// Acquisition-only (CTO metric category A): provider execution metrics. LLM metrics — tokens,
// prompt cost, evidence consumed (category B) — persist to case_track_results in 5.1b, NOT here.
export interface AcquisitionMetric {
  plugin_id: string;
  latency_ms: number;
  api_cost_usd: number;            // real acquisition provider cost (aggregated across this plugin's calls)
  evidence_items_returned: number;
  retry_count: number;             // total retries across this plugin's calls
  final_status: AcquisitionStatus; // worst status seen across this plugin's calls
}

export interface AcquisitionPlugin {
  id: AcquisitionMethod;
  capabilities: ResearchQuestion[];    // the questions this plugin can answer
  acquire(query: AcquisitionQuery): Promise<AcquisitionResult>;
}

// FROZEN CONTRACT (CTO §4). Every future layer (Track, Synthesis, Memory, Outcome) consumes this
// shape unchanged. schema_version is stamped immutably per pack; evidence_hash is a deterministic
// content hash over deterministically-ordered sources (§3 replayable/auditable).
export interface EvidencePack {
  schema_version: string;
  case_id: string;
  track_key: TrackKey;
  sources: RawSource[];                // deterministically ordered by finalizePack()
  evidence_hash: string;
  collected_at: string;
}
