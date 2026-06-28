-- ============================================================
-- Migration — case_track_results.questions_to_ask (Phase 5.1c, Track 2).
-- Client-facing "questions to ask your vendor" — rich objects {question, reason, blocking_weight_key}
-- generated from Track 2 authorization gaps. Rendered on the case "Questions to Ask" tab.
-- Additive + nullable; no existing data affected.
-- ============================================================
BEGIN;
ALTER TABLE case_track_results ADD COLUMN IF NOT EXISTS questions_to_ask jsonb;
COMMIT;

-- VERIFY (run separately):
-- select column_name from information_schema.columns
--   where table_name = 'case_track_results' and column_name = 'questions_to_ask';  -- expect 1 row
