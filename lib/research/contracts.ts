// Deterministic contracts for the Intelligence OS (the spine every layer obeys).
// These types are stable regardless of model/provider. See
// docs/superpowers/plans/2026-06-25-intelligence-os-skeleton-plan.md §A/§C.
import type { TrackKey } from "@/lib/constants/tracks";
import type { ConfidenceBand } from "@/lib/research/confidence";
import type { PlanType } from "@/lib/constants/plans";
import type { Provenance } from "@/lib/research/acquisition/types";

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
  weight_key?: string; // ADR-G003 evidence_type tag the CODE weight engine scores (Phase 5)
  provenance?: Provenance; // Phase 5.1a — full acquisition→verdict provenance chain
  brand?: string; // Phase 5.1c — Track 2 brand isolation (which submitted brand this evidence concerns)
}
export interface EvidenceWeight { evidence_type: string; points: number; note?: string }
export interface Unknown { unknown: string; why_unresolvable: string; resolvable_by_client: boolean }

// Phase 5.1c — Track 2 client-facing question (rendered on the case "Questions to Ask" tab). Rich
// object: the question, the gap it addresses, and the weight_key an answer would unlock.
export interface QuestionToAsk { question: string; reason: string; blocking_weight_key: string }

export interface TrackOutput {
  track_key: TrackKey;
  evidence_items: EvidenceItem[];
  evidence_weights_applied: EvidenceWeight[];
  reasoning_notes: string;
  unknowns: Unknown[];
  suggested_signal?: TrackSignal; // QA ONLY — never the verdict input (enhancement #1)
  weight_validation?: WeightValidation[];          // Phase 5.1b — Track 1 firewall audit (plumbed to the row)
  track_validation_report?: Record<string, unknown>; // Phase 5.1b — deterministic regression artifact (jsonb)
  acquisition_failed?: boolean;                    // Phase 5.1b — pack had 0 sources: do NOT score / write memory; escalate
  // Phase 5.1c — Track 2 advisory metadata (STORED for the analyst, NEVER scored — the signal is
  // code-derived from validated weight_keys). auth_level mirrors the master-spec Auth Level the LLM read.
  auth_level?: "A" | "B" | "C" | "D" | "E";
  auth_level_reasoning?: string;
  b2b_only_detected?: boolean;
  b2b_only_brands?: string[];
  questions_to_ask?: QuestionToAsk[];
}

// Phase 5.1b — Track 1 weight-validation firewall audit (proposed → validated, with the gate that
// decided + the firewall version). Persisted to case_track_results.weight_validation. The locked
// EvidenceItem.weight_key stays = the VALIDATED key only; proposed/rejected live here.
export type RejectionReason =
  | "registry" | "track" | "no_valid_citation" | "provenance" | "authority"
  | "contradiction" | "contradiction_equal_authority" | "llm_returned_unknown";
export type ValidationGate =
  | "grounding" | "registry" | "track" | "provenance" | "authority" | "contradiction";
export interface WeightValidation {
  evidence_id: string;
  proposed_weight_key: string;
  validated_weight_key: string | null;
  gate: ValidationGate | null;          // the gate that rejected it; null if accepted
  rejection_reason: RejectionReason | null;
  validation_version: string;           // firewall version (independent of pack schema_version)
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
  weighted_score: number;      // 0–4 (ADR-G004)
  confidence_0_15: number;     // case-level confidence on the 0–15 scale
  veto_fired: boolean;
  veto_reasons: string[];
  decision_confidence: "low" | "moderate" | "high"; // how flippable the verdict is
  derivation: VerdictDerivation; // Phase 4.5 — additive reasoning trace (single source of truth)
}

// Phase 4.5 — the reasoning trace computeVerdict() emits so the UI can EXPLAIN the verdict
// (confidence, "Why Not?") WITHOUT re-deriving ADR-G004 anywhere else.
export interface TrackContribution {
  track_key: TrackKey;
  signal: TrackSignal;
  signal_score: number; // SIGNAL_SCORE[signal] (0 when excluded)
  weight: number;       // TRACK_WEIGHTS[track_key]
  contribution: number; // signal_score * weight (pre-redistribution)
  included: boolean;    // false for n_a / absent (excluded from the score)
}
export interface VetoStep { kind: "floor" | "lock"; verdict: Verdict; reason: string }
export interface RejectedVerdict { verdict: Verdict; reason: string }
export interface VerdictDerivation {
  contributions: TrackContribution[];
  total_weight: number;
  weighted_sum: number;
  raw_score: number; // 0–4, after redistribution (= weighted_score)
  thresholds: { source_clear: number; usable_with_conditions: number; verify_before_purchase: number };
  score_verdict: Verdict;            // verdict from the score ALONE, before vetoes
  vetoes: VetoStep[];                // floors/locks that fired
  final_differs_from_score: boolean; // a veto changed the outcome
  margin: { distance: number; nearest_boundary: number }; // distance to nearest band boundary
  rejected: RejectedVerdict[];       // the 3 unchosen verdicts + deterministic reasons
}

// Versioning + replay (enhancements #5/#6)
export interface IosVersion {
  prompt_version: string; rubric_version: string; synthesis_version: string;
  corpus_version: string; configuration_version: string;
  model_provider: string; model_version: string;
  evidence_hash: string; ios_version: string; // e.g. "HyprrIQ IOS v1.2"
}
