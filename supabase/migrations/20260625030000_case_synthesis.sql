-- ============================================================
-- Migration 3/5 — case_synthesis (NEW) — Intelligence Synthesis Engine output
-- Tech Arch v1.4 §2.4 + ADR-G005 + founder enhancements #2/#5/#6.
--
-- Layer 3 (LLM reasoning) writes this; Modules 1–8 are internal/role-gated, only
-- Module 9 (decision_snapshot) + vendor_questions are client-facing (surfaced via
-- a server query that selects ONLY those columns — RLS here is admin-only).
-- cases.id is uuid (only clients.id is text), so case_id is uuid.
--
-- Determinism + replay (enhancements #2/#5/#6): evidence_hash + the full version
-- vector + ios_version make "same evidence + same IOS → same synthesis" replayable.
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS case_synthesis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid UNIQUE NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Internal reasoning (Modules 1–8) — role-gated, never client-facing
  normalized_evidence jsonb,    -- Module 1
  claim_attributions jsonb,     -- Module 2
  assertions jsonb,             -- Module 3
  contradictions jsonb,         -- Module 4
  hypotheses jsonb,             -- Module 5
  risk_gaps jsonb,              -- Module 6
  doubt_calibration jsonb,      -- Module 7

  -- Client-facing
  vendor_questions jsonb,       -- Module 8
  decision_snapshot jsonb,      -- Module 9 (the only reasoning output the client sees)

  -- Determinism + reproducibility
  evidence_hash text,           -- hash of the normalized evidence set (cache + replay key)

  -- Full version vector (enhancement #5) + IOS release (enhancement #6)
  prompt_version text,
  rubric_version text,
  synthesis_version text,
  corpus_version text,          -- determinism-relevant only when ADR-G006 read-side (G6) lands
  configuration_version text,
  model_provider text,          -- e.g. 'anthropic'
  model_version text,           -- e.g. 'claude-opus-4-8'
  ios_version text,             -- the Intelligence Operating System release, e.g. 'HyprrIQ IOS v1.2'

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_case_synthesis_evidence_hash ON case_synthesis(evidence_hash) WHERE deleted_at IS NULL;

ALTER TABLE case_synthesis ENABLE ROW LEVEL SECURITY;
-- Admin-only: synthesis reasoning is the IP (ADR-G005 visibility model). The
-- client-facing decision_snapshot is exposed by a server query that selects only
-- decision_snapshot + vendor_questions — never the reasoning modules.
CREATE POLICY case_synthesis_admin ON case_synthesis FOR ALL
  USING (is_current_user_admin());

DROP TRIGGER IF EXISTS case_synthesis_updated_at ON case_synthesis;
CREATE TRIGGER case_synthesis_updated_at BEFORE UPDATE ON case_synthesis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
