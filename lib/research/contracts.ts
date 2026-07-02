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

// Phase 5.1c.5 — Track 0.5 Supplier Identity Resolution. The resolve-identity stage runs after
// Track 0, before the finding-track fan-out, and resolves the supplier's identity ONCE from
// vendor_name + optional vendor_website + (when needed) identity-discovery research. Tracks consume
// resolved_domain (Track 2+ vendorHost) instead of raw vendor_website. Designed as the seed of a
// future reusable Supplier Intelligence Profile (ADR-G006) — kept extensible, no coupling beyond it.
// Structured, machine-readable record of HOW the resolver decided — formalizes what resolution_notes
// says in prose. Kept for future dispute resolution + as an extensible seed of the ADR-G006 profile.
export interface ResolutionAudit {
  winner: string | null;      // the resolved domain, or null when not resolved (ambiguous/unresolved)
  score: number;              // winning/leading candidate score (0 for provided fast-path + unresolved)
  runner_up: string | null;   // second-ranked candidate domain (near-miss, for audit/dispute)
  runner_up_score: number;
  matched_by: string[];       // signals that fired for the leader (name_match|registry_hit|self_identifies|address_consistent), or ["provided"]
  warnings: string[];         // advisory, non-blocking flags (e.g. provided website conflicts with the vendor name) — surfaced to the reviewer/UX, never escalates
}

export interface SupplierIdentity {
  original_input: { name: string; website: string | null }; // RAW client input — ALWAYS preserved/logged (point 4)
  resolved_name: string;                  // canonical; tracks use THIS, not original_input (point 3)
  resolved_domain: string | null;         // feeds vendorHost when identity_confidence === "high"
  candidate_domains: string[];
  registration_signals: string[];
  identity_confidence: "high" | "medium" | "low";
  identity_unconfirmed: boolean;          // ONLY for genuine multi-candidate ambiguity / no resolution — NOT typos
  resolution_method: "provided" | "resolved_dominant" | "normalized" | "ambiguous" | "unresolved";
  resolution_notes: string;
  resolution_audit: ResolutionAudit;      // structured decision record (winner/score/runner_up/matched_by)
}

// What a track receives (Layer 1 input).
export interface TrackContext {
  case_id: string;
  vendor_name: string | null;
  vendor_website: string | null;
  supplier_identity?: SupplierIdentity; // Phase 5.1c.5 — resolved identity (Track 0.5); tracks read resolved_domain
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
// object: the question, the gap it addresses, the weight_key an answer would unlock, and a priority
// (high = affects the authorization determination; medium = strengthens confidence; low = useful, not blocking).
export interface QuestionToAsk {
  question: string;
  reason: string;
  blocking_weight_key: string;
  priority: "high" | "medium" | "low";
  brand: string; // ADR-T2-002 — which submitted brand this question concerns ("" = vendor-level / unspecified)
}

// Analyst/review-team question added during admin review (cases.additional_questions). SEPARATE from
// the immutable AI QuestionToAsk (never mixed at the data layer — merged only in the view-model with a
// source tag). No status field (client-response feature is future + out of scope).
export interface AdditionalQuestion {
  id: string;                              // client-generated; targets edit/delete
  question: string;
  reason?: string;
  brand?: string;
  priority?: "high" | "medium" | "low";
  required?: boolean;                      // blocking (must be answered) vs helpful
  created_by: string;                      // Clerk user id of the analyst
  created_at: string;                      // ISO
  history?: AdditionalQuestionEdit[];      // prior versions preserved on edit (never silent overwrite)
}

// One preserved prior version of an AdditionalQuestion, snapshotted before an edit overwrites it.
export interface AdditionalQuestionEdit {
  edited_at: string;
  edited_by: string;
  previous_question: string;
  previous_reason?: string;
  previous_brand?: string;
  previous_priority?: "high" | "medium" | "low";
  previous_required?: boolean;
}

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
  // ADR-T2-002 — Track 2 lane-isolated narrative. brand_relationship_finding is the LLM's scoped
  // conclusion (positives-first, per-brand, never a purchase implication); the three *_note/disclaimer
  // fields are code-templated boundary notes (identity ↑ / authorization = this lane / marketplace ↓).
  brand_relationship_finding?: string;
  identity_scope_note?: string;
  authorization_scope_note?: string;
  marketplace_eligibility_disclaimer?: string;
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
