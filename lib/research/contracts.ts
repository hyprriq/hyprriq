// Deterministic contracts for the Intelligence OS (the spine every layer obeys).
// These types are stable regardless of model/provider. See
// docs/superpowers/plans/2026-06-25-intelligence-os-skeleton-plan.md §A/§C.
import type { TrackKey } from "@/lib/constants/tracks";
import type { ConfidenceBand } from "@/lib/research/confidence";
import type { PlanType } from "@/lib/constants/plans";

export type Certainty = "verified" | "inferred" | "unknown";
export type TrackSignal = "pass" | "infer" | "flag" | "soft_fail" | "hard_fail" | "n_a";
export type Verdict = "source_clear" | "usable_with_conditions" | "verify_before_purchase" | "do_not_rely";

// What a track receives (Layer 1 input).
export interface TrackContext {
  case_id: string;
  vendor_name: string | null;
  vendor_website: string | null;
  brands_submitted: string[];
  marketplace: string;
  plan_type: PlanType;
}

// Layer 1 output — evidence ONLY (the LLM never decides the authoritative signal).
export interface EvidenceItem {
  evidence_id: string;
  statement: string;
  certainty: Certainty;
  source_type: "government_record" | "vendor_self_assertion" | "third_party" | "inference";
  source_url: string | null;
  claimant: "vendor" | "brand" | "independent_registry" | "third_party" | "ai_inference";
  claimant_benefits: boolean; // true if the claimant benefits from it being believed
  supports: string;
}
export interface EvidenceWeight { evidence_type: string; points: number; note?: string }
export interface Unknown { unknown: string; why_unresolvable: string; resolvable_by_client: boolean }

export interface TrackOutput {
  track_key: TrackKey;
  evidence_items: EvidenceItem[];
  evidence_weights_applied: EvidenceWeight[];
  reasoning_notes: string;
  unknowns: Unknown[];
  suggested_signal?: TrackSignal; // QA ONLY — never the verdict input (enhancement #1)
}

// Layer 2 output
export interface NormalizedEvidenceItem extends EvidenceItem { source_track: TrackKey }
export interface NormalizedEvidence { items: NormalizedEvidenceItem[]; evidence_hash: string }

// Layer 4a — CODE-derived signal
export interface SignalResult { signal: TrackSignal; score_0_15: number; band: ConfidenceBand }

// Layer 3 output
export interface DecisionSnapshot {
  headline: string;
  leading_interpretation: string;
  the_real_risk: string;
  what_to_verify: string[];
  what_to_monitor: string[];
}
export interface SynthesisOutput {
  module_1_normalized_evidence: unknown[];
  module_2_claim_attributions: unknown[];
  module_3_assertions: unknown[];
  module_4_contradictions: { is_load_bearing: boolean; risk_level: string }[];
  module_5_hypotheses: { hypotheses: unknown[]; what_would_change_the_leader: string };
  module_6_risk_gaps: unknown[];
  module_7_doubt_calibration: { doubt_level: string; doubt_focus: string; rationale: string };
  module_8_vendor_questions: string[];
  module_9_decision_snapshot: DecisionSnapshot;
}

// Layer 4b output
export interface VerdictResult {
  verdict: Verdict;
  weighted_score: number;
  veto_fired: boolean;
  veto_reasons: string[];
  decision_confidence: "low" | "moderate" | "high"; // how flippable the verdict is
}

// Versioning + replay (enhancements #5/#6)
export interface IosVersion {
  prompt_version: string; rubric_version: string; synthesis_version: string;
  corpus_version: string; configuration_version: string;
  model_provider: string; model_version: string;
  evidence_hash: string; ios_version: string; // e.g. "HyprrIQ IOS v1.2"
}
