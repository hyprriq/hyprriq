-- ============================================================
-- H2 — Fail-loud failure states (ADR-G007). FOUNDER-RUN.
-- Adds two TERMINAL-FAILURE states to cases.status:
--   research_failed   — pipeline exhausted retries (onFailure) or watchdog swept a wedge
--   submission_failed — submit-time enqueue failed; credit refunded; not listed to client
-- Purely additive: old code never writes them, so there is NO deploy window —
-- run any time before the H2 code deploys.
-- ============================================================
BEGIN;
ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_status_check;
ALTER TABLE cases ADD CONSTRAINT cases_status_check CHECK (status IN (
  'pending_intake','intake_complete','queued','awaiting_client',
  'research_running','awaiting_review','manual_override_required',
  'qa_in_progress','approved','delivered','complete','cancelled',
  'research_failed','submission_failed'));
COMMIT;

-- ============================================================
-- POST-APPLY VERIFICATION (founder runs; confirm before the H2 code merges)
-- ============================================================
-- V-1: expect the 14-state list including research_failed + submission_failed:
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'cases_status_check';
-- V-2: expect 0 rows (no existing case violates the new list — sanity, should be trivially true):
--   SELECT status, count(*) FROM cases GROUP BY status ORDER BY 2 DESC;
