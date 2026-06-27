-- ============================================================
-- Migration — Phase 5.1a acquisition persistence
-- Stores the raw Evidence Pack per case/track (replay + future cache invalidation)
-- and per-plugin acquisition metrics (cost optimization + calibration).
-- Admin-only RLS (service-role writes; corpus/ops data, never client-facing).
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS case_evidence_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  track_key text NOT NULL,
  pack jsonb NOT NULL,                 -- RawSource[] with full provenance + lifecycle
  collected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_case_evidence_packs_case ON case_evidence_packs(case_id) WHERE deleted_at IS NULL;
ALTER TABLE case_evidence_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY case_evidence_packs_admin ON case_evidence_packs FOR ALL USING (is_current_user_admin());

CREATE TABLE IF NOT EXISTS case_acquisition_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  track_key text NOT NULL,
  plugin_id text NOT NULL,
  latency_ms integer,
  api_cost_usd numeric(10,5),
  tokens_used integer,
  evidence_items_returned integer,
  evidence_items_consumed integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_case_acq_metrics_case ON case_acquisition_metrics(case_id);
ALTER TABLE case_acquisition_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY case_acquisition_metrics_admin ON case_acquisition_metrics FOR ALL USING (is_current_user_admin());

COMMIT;

-- ── POST-APPLY VERIFICATION (run separately; confirm APPLIED, not just that pre-flight ran) ──
-- select table_name from information_schema.tables
--   where table_name in ('case_evidence_packs','case_acquisition_metrics');   -- expect 2 rows
-- select column_name from information_schema.columns
--   where table_name = 'case_acquisition_metrics' order by ordinal_position;  -- expect 11 cols
