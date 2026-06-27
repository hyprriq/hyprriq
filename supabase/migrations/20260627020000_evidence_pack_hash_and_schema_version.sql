-- ============================================================
-- Migration — Evidence Pack contract completion (CTO §3/§4/§7, pre-freeze).
-- Adds the deterministic content hash + immutable schema version to the persisted Evidence Pack
-- so the frozen contract is replayable + queryable (matches case_synthesis.evidence_hash pattern).
-- Additive + nullable; safe to run any time before the 5.1a validation.
-- ============================================================
BEGIN;

ALTER TABLE case_evidence_packs ADD COLUMN IF NOT EXISTS evidence_hash text;
ALTER TABLE case_evidence_packs ADD COLUMN IF NOT EXISTS schema_version text;

CREATE INDEX IF NOT EXISTS idx_case_evidence_packs_hash
  ON case_evidence_packs(evidence_hash) WHERE deleted_at IS NULL;

COMMIT;

-- VERIFY (run separately):
-- select column_name from information_schema.columns
--   where table_name = 'case_evidence_packs' order by ordinal_position;  -- expect evidence_hash + schema_version present
