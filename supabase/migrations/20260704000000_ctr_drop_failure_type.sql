-- ============================================================
-- Migration — DROP case_track_results.failure_type (vestigial column).
-- WHY: the soft/hard failure distinction is carried non-overlappingly by track_verdict_signal
--   ('n_a' = couldn't research / acquisition failure; 'soft_fail' = researched, found nothing;
--   'hard_fail' = affirmative fraud). failure_type was never written by the G2-spec'd writer
--   (verdictEngine.ts), was written only incidentally as "soft" on n_a acquisition-failure rows,
--   was never READ by any logic/render/surface (view-model omits it), and was all-NULL in prod.
-- DEPENDENCIES: only the inline column CHECK (failure_type IN ('soft','hard')), which Postgres
--   auto-drops with the column — NO index / view / RLS policy / generated column / trigger / FK
--   references it, so NO CASCADE is needed.
-- ORDERING: run AFTER the paired code change is deployed (removed the COLS select, the
--   TrackResultRow field, and the lone acquisition-failure write). Deploying that code first is
--   safe (code stops referencing the column while it still exists); running this before it would
--   break every case_track_results read (getCaseTrackResults still selects the column).
-- ============================================================
BEGIN;
ALTER TABLE case_track_results DROP COLUMN IF EXISTS failure_type;
COMMIT;

-- VERIFY (run separately):
-- select column_name from information_schema.columns
--   where table_name = 'case_track_results' and column_name = 'failure_type';  -- expect 0 rows
