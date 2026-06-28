-- ============================================================
-- Migration — cases.pipeline_version (Inngest durabilization).
-- Versions the ORCHESTRATION execution as a whole (step set / ordering / parallelism / retry /
-- workflow). It does NOT version track prompts, the Evidence Pack, the weight registry, verdict
-- logic, or source profiles — those version independently. Init "1.0.0"; bump only on an
-- orchestration-structure change. Additive + nullable; no existing data affected.
-- ============================================================
BEGIN;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS pipeline_version text;
COMMIT;

-- VERIFY (run separately):
-- select column_name from information_schema.columns
--   where table_name = 'cases' and column_name = 'pipeline_version';  -- expect 1 row
