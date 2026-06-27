import type { SourceProfile, AuthorityScore, CoarseSourceType } from "@/lib/research/source_profile";
import type { TrackKey } from "@/lib/constants/tracks";

// The questions a track can ask. Plugins declare which they answer (capability matrix).
export type ResearchQuestion =
  | "domain_age" | "registration_date" | "business_registry" | "linkedin_presence"
  | "bbb_listing" | "marketplace_signals" | "dealer_page" | "trade_directory"
  | "scam_reports" | "address_verification" | "contact_consistency";

export type AcquisitionMethod = "serper" | "whois" | "native_web_search" | "manual" | "inference";

// Code-assigned at acquisition (certainty is added later by the track LLM — see EvidenceItem).
export interface Provenance {
  source_profile: SourceProfile;
  source_type: CoarseSourceType;       // derived from source_profile
  authority_score: AuthorityScore;     // from the registry
  freshness_days: number | null;       // age of the source at acquisition (null = unknown)
  acquisition_method: AcquisitionMethod;
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
}

export interface AcquisitionMetric {
  plugin_id: string;
  latency_ms: number;
  api_cost_usd: number;
  tokens_used: number;
  evidence_items_returned: number;
  evidence_items_consumed: number;     // set later by the track; 0 at acquisition
}

export interface AcquisitionPlugin {
  id: AcquisitionMethod;
  capabilities: ResearchQuestion[];    // the questions this plugin can answer
  acquire(query: AcquisitionQuery): Promise<RawSource[]>;
}

export interface EvidencePack {
  case_id: string;
  track_key: TrackKey;
  sources: RawSource[];
  collected_at: string;
}
