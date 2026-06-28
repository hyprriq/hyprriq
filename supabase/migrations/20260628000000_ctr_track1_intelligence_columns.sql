-- ============================================================
-- Migration — Track 1 Intelligence audit + metrics columns (Phase 5.1b).
-- Adds to case_track_results:
--   weight_validation       jsonb   — firewall proposed→validated audit trail (per item)
--   classifications_total   int     — LLM-proposed evidence items (R5 classification metrics)
--   classifications_accepted int    — validated_weight_key non-null
--   classifications_rejected int    — rejected by a gate
--   classifications_unknown  int    — LLM returned proposed_weight_key 'UNKNOWN'
--   acceptance_rate         numeric — accepted / total (0–1)
--   track_validation_report jsonb   — deterministic regression artifact (R7)
-- All additive + nullable; no existing data affected. Run before Task 8 (persistence).
-- ============================================================
BEGIN;

ALTER TABLE case_track_results ADD COLUMN IF NOT EXISTS weight_validation jsonb;
ALTER TABLE case_track_results ADD COLUMN IF NOT EXISTS classifications_total integer;
ALTER TABLE case_track_results ADD COLUMN IF NOT EXISTS classifications_accepted integer;
ALTER TABLE case_track_results ADD COLUMN IF NOT EXISTS classifications_rejected integer;
ALTER TABLE case_track_results ADD COLUMN IF NOT EXISTS classifications_unknown integer;
ALTER TABLE case_track_results ADD COLUMN IF NOT EXISTS acceptance_rate numeric(3,2);
ALTER TABLE case_track_results ADD COLUMN IF NOT EXISTS track_validation_report jsonb;

COMMIT;

-- VERIFY (run separately):
-- select column_name from information_schema.columns
--   where table_name = 'case_track_results'
--     and column_name in ('weight_validation','classifications_total','classifications_accepted',
--       'classifications_rejected','classifications_unknown','acceptance_rate','track_validation_report')
--   order by column_name;   -- expect 7 rows
