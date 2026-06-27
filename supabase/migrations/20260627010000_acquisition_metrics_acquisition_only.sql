-- ============================================================
-- Migration — case_acquisition_metrics is ACQUISITION-ONLY (CTO direction 2026-06-27).
-- LLM metrics (tokens, prompt cost, evidence consumed — category B) belong on case_track_results
-- alongside track output (5.1b), NOT here. Drop the mis-categorized columns. Non-blocking: the
-- code already stopped writing them. Safe to run any time before/after the 5.1a validation.
-- ============================================================
BEGIN;

ALTER TABLE case_acquisition_metrics DROP COLUMN IF EXISTS tokens_used;
ALTER TABLE case_acquisition_metrics DROP COLUMN IF EXISTS evidence_items_consumed;

COMMIT;

-- VERIFY (run separately):
-- select column_name from information_schema.columns
--   where table_name = 'case_acquisition_metrics' order by ordinal_position;  -- expect 9 cols (no tokens_used / evidence_items_consumed)
