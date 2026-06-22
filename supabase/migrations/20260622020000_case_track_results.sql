-- ============================================================
-- Migration: Per-track results schema (Item 3)
-- Spec: HyprrIQ_ClaudeCode_ClientProfile_TrackSchema_Deletion.md
-- Build the data structure NOW so Phase G track functions write into an existing,
-- correct shape. No admin UI / API in this pass (that lands with Phase G).
--
-- Phase G: automated track functions write here.
-- Phase H: PDF generation reads here regardless of `source`.
--
-- RLS: admin-only FOR ALL for now (no client-facing UI yet; Phase H PDF runs
--   server-side). Add a read-own SELECT policy when client-facing views exist.
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS case_track_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  track_number int NOT NULL CHECK (track_number BETWEEN 0 AND 5),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'complete', 'failed', 'manual_required', 'manual_complete')),
  source text NOT NULL DEFAULT 'pending'
    CHECK (source IN ('pending', 'automated', 'automated_retry', 'manual')),
  findings_json jsonb,
  failure_reason text,
  retry_count int NOT NULL DEFAULT 0,
  entered_by text,     -- Clerk user ID of whoever entered manual findings, if source = 'manual'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_id, track_number)   -- one result row per track per case
);

CREATE INDEX IF NOT EXISTS idx_case_track_results_case ON case_track_results(case_id);

ALTER TABLE case_track_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY case_track_results_admin ON case_track_results FOR ALL
  USING (is_current_user_admin());

DROP TRIGGER IF EXISTS case_track_results_updated_at ON case_track_results;
CREATE TRIGGER case_track_results_updated_at BEFORE UPDATE ON case_track_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
