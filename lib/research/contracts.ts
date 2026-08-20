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

// Spec-B — a name/website mismatch is a first-class INTELLIGENCE SIGNAL, never a validation error and
// never fraud. Full enum defined now so it can grow WITHOUT a schema change; only a SUBSET has handlers
// today (name_is_brand, name_website_mismatch, multiple_entities, website_dead). The other five are
// reserved — no handler until a real case needs each.
export type IdentityDiscrepancyKind =
  | "name_is_brand"          // client typed a brand into the vendor-name slot (globaldist: name=Bosch, brand=Bosch)
  | "name_website_mismatch"  // name ≠ website; the website resolved a dominant real entity
  | "multiple_entities"      // name AND website each resolve to DIFFERENT plausible legit entities → escalate
  | "website_dead"           // website did not resolve to a real entity → escalate (never fraud)
  // reserved (defined, NOT implemented — handlers added per real case):
  | "website_redirect" | "holding_company" | "subsidiary" | "dba" | "alias";

export interface IdentityDiscrepancy {
  kind: IdentityDiscrepancyKind;
  entered_name: string;                   // what the client typed (preserved separately from original_input)
  resolved_name: string;                  // who we actually resolved
  resolved_domain: string | null;
  client_note: string;                    // plain client-facing copy — NO track/internal jargon
}

// SB-1 (SO-2) — Track 0.5 research-call instrumentation: H2's llm_failed discipline for the resolver.
// A model failure / empty pack is a recorded STATE that escalates truthfully — never a website_dead
// intelligence signal (OQ-A: infra failures carry no client-facing discrepancy). Additive + optional:
// identity records stored before SB-1 simply lack it.
export interface ResolutionResearchRecord {
  subject: string;            // what was researched (the anchor domain, or the vendor name)
  role: "website" | "name";  // which Spec-B research slot this call filled
  sources: number;            // pack size the model reasoned over (0 = could not research at all)
  llm_failed: boolean;        // model call threw or returned unparseable output (H2 semantics)
  audit?: ResolutionAudit;    // SB-2 (SO-4) — the INNER resolver audit for this call (score/margin/winner); pre-SB-2 records lack it
}

export interface SupplierIdentity {
  original_input: { name: string; website: string | null }; // RAW client input — ALWAYS preserved/logged (point 4)
  resolved_name: string;                  // canonical; tracks use THIS, not original_input (point 3)
  resolved_domain: string | null;         // feeds vendorHost when identity_confidence === "high"
  candidate_domains: string[];
  registration_signals: string[];
  identity_confidence: "high" | "medium" | "low";  // legacy single axis — kept working for the matched/backward-compat path
  identity_unconfirmed: boolean;          // ONLY for genuine multi-candidate ambiguity / no resolution — NOT typos
  resolution_method: "provided" | "resolved_dominant" | "normalized" | "resolved_from_website" | "ambiguous" | "unresolved";
  resolution_notes: string;
  resolution_audit: ResolutionAudit;      // structured decision record (winner/score/runner_up/matched_by)
  // Spec-B two-dimension confidence — split "who is the supplier" from "was the client's input consistent".
  // A mismatch = HIGH resolution_confidence + LOW input_consistency (we know who they are; the client mislabeled).
  // input_consistency NEVER lowers resolution_confidence and NEVER touches the verdict/confidence score.
  resolution_confidence?: "high" | "medium" | "low";
  input_consistency?: "high" | "medium" | "low";
  identity_discrepancy?: IdentityDiscrepancy | null; // informational flag; surfaced client+admin+memory; zero verdict effect
  resolution_research?: ResolutionResearchRecord[];  // SB-1 (SO-2) — per-call research instrumentation ([] = zero-research fast path)
}

// What a track receives (Layer 1 input).
export interface TrackContext {
  case_id: string;
  vendor_name: string | null;
  vendor_website: string | null;
  supplier_identity?: SupplierIdentity; // Phase 5.1c.5 — resolved identity (Track 0.5); tracks read resolved_domain
  attempt_number?: number; // H1 — this execution's investigation attempt (1 = first run; re-runs increment). Orchestration plumbing, not a research input.
  // H7 (OQ-D, founder-ruled) — REPLAY: judge the frozen record again. When set, tracks load attempt
  // N's stored packs instead of live acquisition, and the pipeline reuses the case's frozen
  // supplier_identity instead of live resolution. The result is a genuine NEW attempt (ledger
  // event + audit marker; delivered rows untouched per H1) — never a silent shadow operation.
  replay_from_attempt?: number;
  // DISPUTE/ESCALATION RE-RUN (founder-ruled 2026-07-13) — the system regenerating its OWN answer
  // from the same facts: same case inputs (vendor, brands, already-uploaded documents), fresh
  // research, a genuine NEW attempt (H1). Same verdict EXPECTED — verdict stability is the feature;
  // a would-be flip is SURFACED in the audit log, never silently adopted. DISTINCT from "request
  // further investigation": there a human adds NEW intelligence on top and the verdict may
  // legitimately change; here nothing new is added, so it must not. When set, stageFinalize takes
  // the deliberate NO-ADVANCE path — the live case pointer (verdict/status/track statuses/
  // supplier_identity/delivered_*) is never advanced and the case is never auto-delivered,
  // regardless of status (the AWI-2607-022 pointer-advance lesson made structural). Adoption of
  // the new attempt is a separate, deliberate founder step. No credit is charged — this re-runs an
  // existing PAID case. Used RARELY (client dispute / refund defense / applying a ruled fix to one
  // case); never a routine step — the product promise is that the FIRST delivered verdict is
  // complete and defensible.
  dispute_rerun?: true;
  brands_submitted: string[];
  marketplace: string;
  plan_type: PlanType;
}

// ── Track 5 (sub-gate B, founder-ruled 2026-07-14) — the sourcing-logic arbitration contract. ──
// CONTRACT-FROZEN (OQ-B2): the contradiction record is the v2.1 Synthesis Module-4 shape, so Track 5
// and the future synthesis engine share ONE contract. Revisitable ONLY at the synthesis gate via a
// contract-version bump (the pack-version pattern) — never silently.
export const SOURCING_CONTRADICTION_CONTRACT_VERSION = "m4c-1.0.0";
// OQ-D summary rule (founder-ruled 2026-07-14, pre-freeze): the arbitration CONCLUSION is as
// sensitive as the reasoning — the client-visible summary of a track_5 row is this NEUTRAL
// constant (written by the non_voting branch AND enforced again at the client read; the
// descriptive line lives in reasoning_notes, which only admin surfaces read).
// EXACT CLIENT STRING FOUNDER-RULED 2026-07-14 (standing copy bar — the prior internal wording
// "non-voting arbitration dimension — not scored" was analyst jargon on a client card).
export const SOURCING_CLIENT_SUMMARY = "Consistency check — informational; does not affect the verdict";
export interface SourcingContradictionRecord {
  contradiction_type: string;
  assertion_a: { track_key: string; statement: string; evidence_ids: string[] };
  assertion_b: { track_key: string; statement: string; evidence_ids: string[] };
  interpretation: string;
  // Capped at "high" BY CODE: Track 5 must never be able to arm computeVerdict's critical-
  // contradiction lock, even if these records were ever piped toward Module 4 naively (test-locked).
  risk_level: "low" | "medium" | "high";
  // Always false from Track 5 v1 — load-bearing is Module 4's judgment at the synthesis gate;
  // the record carries the raw tension, not the arbitration verdict.
  is_load_bearing: boolean;
}
export interface SourcingLogicOutput {
  contract_version: typeof SOURCING_CONTRADICTION_CONTRACT_VERSION;
  flags: string[];
  b2b_archetype_flag: boolean;
  b2b_brands: string[];
  scenario_coherence: { assessment: "consistent" | "tension" | "insufficient_data"; basis: string };
  contradiction_count: number;
  contradictions: SourcingContradictionRecord[];
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
  reasoning_notes: string;                          // INTERNAL — the operator's scratchpad. NEVER client-facing.
  // ── CLIENT-FACING (founder-ruled 2026-08-19). Added because `summary` was assigned FROM
  // reasoning_notes, so clients read the model's workings. The VERDICT NEVER READS THIS FIELD —
  // that is the boundary that keeps the frozen ruling intact: signals, weights, thresholds and
  // vetoes are untouched. Optional so older stored outputs still type-check; the writer falls back
  // to code-owned copy, NEVER to reasoning_notes.
  client_summary?: string;
  unknowns: Unknown[];
  suggested_signal?: TrackSignal; // QA ONLY — never the verdict input (enhancement #1)
  weight_validation?: WeightValidation[];          // Phase 5.1b — Track 1 firewall audit (plumbed to the row)
  track_validation_report?: Record<string, unknown>; // Phase 5.1b — deterministic regression artifact (jsonb)
  acquisition_failed?: boolean;                    // Phase 5.1b — pack had 0 sources: do NOT score / write memory; escalate
  llm_failed?: boolean;                            // H2 — model call failed or unparseable: do NOT score / write memory; escalate (mirror of acquisition_failed)
  not_implemented?: boolean;                       // H3 — dimension not built yet: a deliberate ABSENCE — n_a + skipped, never scored, never escalated
  nothing_to_review?: boolean;                     // Track 4 (OQ-A3) — the dimension is BUILT but this case has nothing for it (zero uploads): an absence, n_a + skipped, never escalated, never soft_fail (the N2 lesson)
  research_identity?: { name: string; alias: string | null }; // H4 — WHO this track actually investigated (Truth & Record: auditable per attempt)
  // H7 (SO-4) — hard-fail consensus record: which veto keys were re-checked, which were dropped for
  // lack of two-pass agreement, and whether the confirmation call itself failed (OQ-A: veto kept +
  // human confirms). Rides into compiled_findings_json — part of the frozen per-attempt record.
  hard_fail_consensus?: { checked: string[]; dropped: string[]; second_call_failed: boolean };
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
  // Track 3 (2026-07-10 gate) — brand-risk scoped narrative + the analyst quartet (OQ-D: STORED and
  // rendered admin-side only this gate; advisory reasoning, NEVER scored — the LLM↔code boundary holds).
  brand_risk_finding?: string;
  analyst_reading?: { most_likely: string; alternative: string; confidence: "high" | "medium" | "low"; what_would_change_my_mind: string };
  // Track 3 (founder-ruled 2026-08-20) — resolved brand names: what each submitted token was taken
  // to mean ("nitendo" → "Nintendo"). Writes cases.brands_confirmed; the PDF cover renders them.
  // An added output field the verdict never reads (the client_summary ruling's boundary).
  resolved_brands?: { submitted: string; resolved: string }[];
  // Track 4 (sub-gate A) — documentation narrative (ships like brand_relationship_finding, HARD-scanned at delivery).
  documentation_finding?: string;
  // Track 5 (sub-gate B, founder-ruled) — NON-VOTING arbitration layer. non_voting routes the
  // output through stageFindingTrack's structural n_a branch (NEVER deriveTrackSignal — an empty
  // evidence set would hit the empty-set floor and vote soft_fail). sourcing_logic carries the
  // flags + coherence + contract-frozen contradiction records into compiled_findings_json
  // (ADMIN-ONLY until the client-surface/PDF gate — the OQ-D rule; stripped from the delivered
  // payload like analyst_reading).
  non_voting?: true;
  sourcing_logic?: SourcingLogicOutput;
}

// Phase 5.1b — Track 1 weight-validation firewall audit (proposed → validated, with the gate that
// decided + the firewall version). Persisted to case_track_results.weight_validation. The locked
// EvidenceItem.weight_key stays = the VALIDATED key only; proposed/rejected live here.
export type RejectionReason =
  | "registry" | "track" | "no_valid_citation" | "provenance" | "authority"
  | "corroboration" | "contradiction" | "contradiction_equal_authority" | "llm_returned_unknown"
  | "consensus"; // H7 SO-4 — hard-fail dropped for lack of two-pass extraction consensus
export type ValidationGate =
  | "grounding" | "registry" | "track" | "provenance" | "authority" | "corroboration" | "contradiction"
  | "consensus"; // H7 SO-4
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
// S-0 (founder-signed 2026-07-16) — m4c-1.1.0, READER side: Module 4's stored records carry the
// full m4c shape plus an additive `origin`. Track 5's WRITER stays on m4c-1.0.0 (frozen at the
// sub-gate B freeze); this reader accepts both. All fields beyond the first two are OPTIONAL and
// verdict-inert: computeVerdict reads only {is_load_bearing, risk_level}, and post-S-0 it only
// ever sees them through certifySynthesisForVerdict (the origin cap lives there).
export const M4C_READER_CONTRACT_VERSION = "m4c-1.1.0";
export interface Module4ContradictionRecord {
  is_load_bearing: boolean;
  risk_level: string;
  origin?: "track5_m4c" | "synthesis";
  contradiction_type?: string;
  assertion_a?: { track_key?: string; statement?: string; evidence_ids?: string[] };
  assertion_b?: { track_key?: string; statement?: string; evidence_ids?: string[] };
  interpretation?: string;
}
// ── S-1 (sitting S-1a, founder-ruled 2026-07-17) — THE NINE MODULE CONTRACTS (gate spec B2;
// SO-S1-1 signed + re-affirmed). TYPES ONLY — the engine sittings (S-1b..e) produce them.
// SynthesisOutput's legacy module fields stay UNTOUCHED below (the frozen S-0 lock test constructs
// them loosely; narrowing them would require editing a frozen file) — the typed contracts here
// assign INTO those fields one-way, and every stored addition is an OPTIONAL ADDITIVE sibling
// (S-0's certification rebuilds from scratch, so no sibling can ever reach the verdict —
// source-verified 2026-07-17). ──

// The d7-1.0.0 matrix output enum (fixed; the founder's matrix chooses the value — never the LLM).
export const DOUBT_LEVELS = ["minimal", "targeted", "elevated", "broad"] as const;
export type DoubtLevel = (typeof DOUBT_LEVELS)[number];

// M1 — the A1-widened record (assembled by CODE, S-1b). THE Q3 LAW ENCODED STRUCTURALLY:
// `accepted` is the hash anchor (computeEvidenceHash's input projection, byte-identical);
// the extension rides BESIDE it and never feeds the hash.
export interface RejectedWithGate {
  evidence_id: string;
  proposed_weight_key: string;
  gate: ValidationGate | null;            // the gate that refused it (null: llm_returned_unknown)
  rejection_reason: RejectionReason | null;
  validation_version: string;
  source_track: TrackKey;
  tag?: "asserted_but_unverifiable";      // A1 — corroboration-rejected items carry the ruled tag
}
export interface M1RecordExtension {
  rejected_with_gate: RejectedWithGate[];
  unknowns: (Unknown & { source_track: TrackKey })[];
  advisory_metadata: { b2b_only_detected: boolean; b2b_only_brands: string[] };
  identity_audit: SupplierIdentity | null;
  consensus_records: ({ source_track: TrackKey } & NonNullable<TrackOutput["hard_fail_consensus"]>)[];
  // Mirrors DiversityCapResult (sourceDiversity.ts) — inlined so the contracts spine stays
  // dependency-free (sourceDiversity imports from here; a type import back would cycle).
  diversity_records: { source_track: TrackKey; signal: TrackSignal; capped: boolean; cap_reason: string | null; distinct_sources: number }[];
}
export interface WidenedM1Record { accepted: NormalizedEvidence; extension: M1RecordExtension }

// M2 — Claim Attribution (Call A). NAMING LAW (founder, 2026-07-17): per-claim attribution takes
// DISTINCT names from M1's per-track PROVENANCE-CLASS fields — same names here would rebuild the
// `elevated` collision on a verdict-adjacent surface (source-scan-locked in s1a.contracts.test.ts).
export interface ClaimAttribution {
  evidence_id: string;
  claim: string;
  claim_attributed_to: string;            // an LLM judgment about the claim, not a provenance class
  attributed_party_benefits: boolean;     // does the attributed party benefit from it being believed?
  corroboration: "independent" | "cross_source" | "none_found";
  weight: "standalone" | "low_until_corroborated"; // the M2 weight law + firewall-wins law lock this by CODE (S-1c)
}

// M3 — Assertion Engine (Call A). brand = the A8 scope field ("" = vendor-level, the QuestionToAsk
// convention). Partition only — aggregation is OQ-S4's ruling, applied at M9.
export interface SynthesisAssertion {
  assertion_id: string;
  assertion: string;
  brand: string;
  status: "supported" | "refuted" | "unresolved";
  supporting_evidence: string[];          // evidence_ids — must resolve to M1 (code-validated, S-1c)
  contradicting_evidence: string[];
  confidence: "high" | "medium" | "low";
}

// M5 — Hypothesis Engine (Call B). Exactly one "leading" and length ≤3 are CODE rules (S-1d), not types.
export interface SynthesisHypothesis {
  label: string;
  interpretation: string;
  supporting_evidence: string[];
  contradicting_evidence: string[];
  likelihood: "leading" | "alternative";
}
// A6 (ADDENDUM-1, APPROVED — S-1f Step 3) — the per-hypothesis WATCH CONDITION: the scorable
// record of what each hypothesis committed to, written at synthesis time so G4 can score it later.
// WRITE-SIDE and UNBACKFILLABLE (G006's law). Every text field is carried VERBATIM from M5 or is
// null — code derives structure, never meaning. `prediction_correct`/`scored_at` are the SCORING
// HOOK: always null at write time; G4 owns the scoring half. Storage rides the EXISTING
// case_synthesis.hypotheses jsonb (no migration — addendum-1's expectation, confirmed in code).
// ADDITIVE-ONLY change to the S-1a frozen contracts, made under A6's standing approval.
export interface HypothesisWatchCondition {
  watch_id: string;                             // deterministic, M5-ordinal: `wc-1`, `wc-2`, …
  hypothesis_label: string;                     // M5 label, VERBATIM
  likelihood: "leading" | "alternative";        // as recorded at synthesis time
  rests_on: string[];                           // M5 supporting_evidence ids, VERBATIM
  disconfirmed_by: string[];                    // M5 contradicting_evidence ids, VERBATIM
  what_would_change_the_leader: string | null;  // set-level LLM text — LEADING hypothesis only
  prediction_correct: boolean | null;           // SCORING HOOK — null at write time (G4 fills)
  scored_at: string | null;                     // SCORING HOOK — null at write time (G4 fills)
}
export interface HypothesisSet {
  hypotheses: SynthesisHypothesis[];
  what_would_change_the_leader: string;
  watch_conditions?: HypothesisWatchCondition[]; // A6 — absent on every pre-S-1f-Step-3 row
}

// M6 — Risk Gap Detection (Call B). B3's law (plan-excluded = limitation, never a material gap)
// is a CODE filter at S-1d; the cause-selects-the-law mapping consumes dimension_run_record.
export interface RiskGap { gap_id: string; unknown: string; why_it_matters: string; is_material: boolean; resolvable_by_client: boolean }

// M7 — Proportional Doubt Calibration (Call C). doubt_level is computed by the founder-authored
// d7-1.0.0 matrix from the recorded inputs — the LLM writes doubt_focus + rationale only (the
// derivation rule binds rationale; B4-EXT). The gap axis is LLM-DERIVED under the ruled fallback —
// the axis marker + chosen levels ride the record so calibration stays auditable and G4-tunable.
export interface DoubtGapInputs {
  axis: "llm_derived";                    // the fallback ruling's truthful label, on the record
  unresolved_assertions: number;          // M3 `unresolved` count (LLM-written statuses)
  stored_unknowns: number;                // stored track unknowns (LLM-written)
  gap_level: "none" | "narrow" | "material" | "wide";
}
export interface DoubtCostInputs {
  enforcement_posture_signals: string[];  // OQ-S1 (a): observable enforcement stakes ONLY
  veto_grade_keys_present: string[];
  brands_at_issue: number;
  cost_level: "low" | "significant" | "severe";
}
export interface DoubtCalibration {
  doubt_level: DoubtLevel;
  doubt_focus: string;
  rationale: string;
  gap_inputs?: DoubtGapInputs;            // optional — stub/rejudge/frozen constructors omit them
  cost_inputs?: DoubtCostInputs;
}

// OQ-S4 (i) carrier — brand_evidence_status: a CODE-merged sibling, NEVER the M9 LLM call's output
// (the two-authorship-classes home ruling). TWO states (ruled 2026-07-17): absence is NEVER a
// clearance — ADR-G004's law at brand granularity; renders as a limitation at the client-surface gate.
export const BRAND_EVIDENCE_STATUS_STATES = ["adverse_findings_attributed", "no_adverse_findings_attributed"] as const;
export type BrandEvidenceStatusState = (typeof BRAND_EVIDENCE_STATUS_STATES)[number];
export interface BrandEvidenceStatusEntry {
  brand: string;                          // from cases.brands_submitted ONLY — the unconditional roster lock (S-1e)
  status: BrandEvidenceStatusState;
  driving: boolean;                       // which brand drives the verdict band — LLM-attributed on multi-brand cases
  attribution: "llm_attributed";          // the ruled honest label, riding every entry
}

// dimension_run_record — the deterministic CASE-level execution record (ruled cause-preserving,
// 2026-07-17). NOT the complement of B3's plan-excluded list (gate spec M6 states which concept is
// which). All CODE: plan_excluded = row absent (orchestrator omission + the plan registry); the
// other causes are the stored H3 flags, verbatim. The cause selects the client sentence's LAW
// (B3 / H2 / OQ-A3).
export const DIMENSION_RUN_CAUSES = ["plan_excluded", "acquisition_failed", "llm_failed", "nothing_to_review", "not_implemented"] as const;
export type DimensionRunCause = (typeof DIMENSION_RUN_CAUSES)[number];
export interface DimensionRunEntry {
  dimension: TrackKey;
  state: "assessed" | "not_assessed";
  cause: DimensionRunCause | null;        // null iff assessed (code rule, S-1e)
}

// R2 — per-call schema_fallback persistence (a silent tolerant-parsing fallback is invisible in
// prod, and A5's backtest would see variance it cannot attribute). The four ruled calls (B7).
export interface SchemaFallbackRecord { call_a: boolean; call_b: boolean; call_b_refuter: boolean; call_c: boolean }

export interface SynthesisOutput {
  module_1_normalized_evidence: unknown[];
  module_2_claim_attributions: unknown[];
  module_3_assertions: unknown[];
  module_4_contradictions: Module4ContradictionRecord[];
  // The hypothesis set stays deliberately LOOSE here (`unknown[]`) so legacy rows and the retired
  // stub still parse — unchanged. A6 adds only the optional watch-condition record beside it.
  module_5_hypotheses: { hypotheses: unknown[]; what_would_change_the_leader: string; watch_conditions?: HypothesisWatchCondition[] };
  module_6_risk_gaps: unknown[];
  module_7_doubt_calibration: { doubt_level: string; doubt_focus: string; rationale: string; gap_inputs?: DoubtGapInputs; cost_inputs?: DoubtCostInputs };
  module_8_vendor_questions: string[];
  module_9_decision_snapshot: DecisionSnapshot;
  // ── S-1a ADDITIVE SIBLINGS (all optional — legacy rows and the stub lack them; S-0's
  // certification rebuilds from scratch so none can reach the verdict; B4-EXT presumes each a
  // leak until its row proves otherwise). ──
  module_1_extension?: M1RecordExtension;
  brand_evidence_status?: BrandEvidenceStatusEntry[];
  dimension_run_record?: DimensionRunEntry[];
  schema_fallbacks?: SchemaFallbackRecord;
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
