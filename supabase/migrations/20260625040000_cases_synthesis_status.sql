-- ============================================================
-- Migration 4/5 — cases: synthesis pipeline status (Tech Arch v1.4 §2.2).
-- Adds cases.synthesis_status and widens the cases.status CHECK with
-- 'synthesis_running'. We PRESERVE all existing status values (awaiting_client,
-- manual_override_required, qa_in_progress are live in our data/code — v1.4's
-- doc dropped them but we keep them, per the selective-reconciliation rule).
-- ============================================================
BEGIN;

ALTER TABLE cases ADD COLUMN IF NOT EXISTS synthesis_status text NOT NULL DEFAULT 'pending'
  CHECK (synthesis_status IN ('pending','running','complete','failed','manual_required'));

ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_status_check;
ALTER TABLE cases ADD CONSTRAINT cases_status_check CHECK (status IN (
  'pending_intake','intake_complete','queued','awaiting_client','research_running',
  'synthesis_running',                       -- NEW (v1.4)
  'awaiting_review','manual_override_required','qa_in_progress','approved',
  'delivered','complete','cancelled'));

COMMIT;
