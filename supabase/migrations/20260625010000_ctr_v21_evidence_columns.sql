-- ============================================================
-- Migration 1/5 (Phase-1 schema reconciliation) — Tech Arch v1.4 §2.3
-- case_track_results: add the v2.1 evidence-output columns so the Synthesis
-- Engine can reason on evidence, not labels. ADDITIVE ONLY.
--
-- Code-derived signals (founder enhancement #1): the LLM returns evidence_items
-- + evidence_weights_applied + an OPTIONAL suggested_signal (QA only); CODE
-- computes the authoritative track_verdict_signal (ADR-G003 weights + hard/soft
-- fail rules). suggested_signal is never the verdict input.
-- ============================================================
BEGIN;

ALTER TABLE case_track_results ADD COLUMN IF NOT EXISTS evidence_items jsonb;          -- normalized evidence objects (claimant, claimant_benefits, …)
ALTER TABLE case_track_results ADD COLUMN IF NOT EXISTS reasoning_notes text;          -- why the track reached its signal (internal)
ALTER TABLE case_track_results ADD COLUMN IF NOT EXISTS unknowns jsonb;                -- what the track could not resolve
ALTER TABLE case_track_results ADD COLUMN IF NOT EXISTS evidence_weights_applied jsonb;-- which evidence + points the LLM applied (auditable)
ALTER TABLE case_track_results ADD COLUMN IF NOT EXISTS track_verdict_signal text
  CHECK (track_verdict_signal IN ('pass','infer','flag','soft_fail','hard_fail','n_a')); -- CODE-derived authoritative signal
ALTER TABLE case_track_results ADD COLUMN IF NOT EXISTS suggested_signal text
  CHECK (suggested_signal IN ('pass','infer','flag','soft_fail','hard_fail','n_a'));     -- LLM suggestion, QA only — never the verdict input
ALTER TABLE case_track_results ADD COLUMN IF NOT EXISTS failure_type text
  CHECK (failure_type IN ('soft','hard'));                                               -- soft = absence; hard = affirmative fraud/deception

COMMIT;
