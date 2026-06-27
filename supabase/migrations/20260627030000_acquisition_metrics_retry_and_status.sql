-- ============================================================
-- Migration — acquisition retry auditability (CTO pre-freeze addition).
-- Adds retry_count + final_status to case_acquisition_metrics so retries and the resolved outcome
-- of each plugin's calls are persisted. Additive + nullable; run before the 5.1a validation.
-- ============================================================
BEGIN;

ALTER TABLE case_acquisition_metrics ADD COLUMN IF NOT EXISTS retry_count integer;
ALTER TABLE case_acquisition_metrics ADD COLUMN IF NOT EXISTS final_status text;

COMMIT;

-- VERIFY (run separately):
-- select column_name from information_schema.columns
--   where table_name = 'case_acquisition_metrics' order by ordinal_position;  -- expect retry_count + final_status present
