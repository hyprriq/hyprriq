-- ============================================================
-- Migration: ADR-G001 — case_track_results becomes the single authoritative
--            track table for all Track 0–5 research operations.
-- Ref: hyprriq_phase_de_g_brief v1.1 §0 (ADR-G001/G002/G003) + ADR-G001 Governance.
--
-- WHY DROP+CREATE: the F.11 scaffold case_track_results (20260622020000) is EMPTY
--   and its columns (track_number/status/source/findings_json/retry_count) diverge
--   from the ADR-G001 authoritative schema. Recreating is cleaner than an ALTER that
--   would leave dead columns. research_findings (original schema, Table 3) is the
--   earlier version of this same table and is backfilled below — near 1:1.
--
-- PRE-FLIGHT (run first, must hold before applying):
--   SELECT count(*) FROM case_track_results;  -- EXPECT 0 (no writer exists yet)
--   SELECT count(*) FROM research_findings;   -- informational: backfill source count
-- If case_track_results count > 0, STOP and flag — do not drop a populated table.
-- ============================================================
BEGIN;

DROP TABLE IF EXISTS case_track_results CASCADE;

CREATE TABLE case_track_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Track identity. track_key is the canonical reference for prompts, orchestration,
  -- reporting, PDFs, QA, analytics. track_number kept alongside per founder decision.
  track text NOT NULL CHECK (track IN (
    'track_0','track_1','track_2','track_3','track_4','track_5')),
  track_key text NOT NULL CHECK (track_key IN (
    'intake','supplier_identity','supply_chain_relationship',
    'brand_risk_assessment','documentation_review','sourcing_logic')),
  track_number int NOT NULL CHECK (track_number BETWEEN 0 AND 5),

  -- Source + AI output (ADR-G001)
  source_mode text NOT NULL DEFAULT 'ai_generated'
    CHECK (source_mode IN ('ai_generated','manual_override')),
  ai_output_json jsonb,
  attempt_number int NOT NULL DEFAULT 1,           -- 1 = first, 2 = Tier-2 alternate rerun
  alternate_approach_used boolean NOT NULL DEFAULT false,

  -- Manual override (Tier 3)
  manual_notes text,
  manual_urls text[],
  manual_screenshot_paths text[],

  -- Compiled output — the report generator reads ONLY this column (source-agnostic)
  compiled_findings_json jsonb,

  -- Confidence (ADR-G003): numeric 0–15 + universal band
  confidence_score int CHECK (confidence_score BETWEEN 0 AND 15),
  confidence_band text CHECK (confidence_band IN ('low','moderate','high','verified')),
  finding_certainty text CHECK (finding_certainty IN ('verified','inferred','unknown')),

  -- Founder review gate (ADR-G002): no report until every required track is approved|edited
  founder_review_status text NOT NULL DEFAULT 'pending'
    CHECK (founder_review_status IN ('pending','approved','edited','rejected')),
  founder_reviewed_at timestamptz,
  founder_edit_notes text,
  founder_override_json jsonb,

  -- Track failure state
  manual_review_required boolean NOT NULL DEFAULT false,
  manual_review_reason text,

  -- Prompt governance (ADR-G001 GR5): reports must stay reproducible/explainable
  prompt_version text,
  rubric_version text,
  model_name text,
  model_version text,
  token_count int,
  execution_time_ms int,
  cost_usd numeric(10,4),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  UNIQUE (case_id, track, attempt_number)   -- allows a Tier-2 attempt_number=2 rerun
);

CREATE INDEX idx_ctr_case ON case_track_results(case_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ctr_founder_review ON case_track_results(founder_review_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_ctr_track_key ON case_track_results(track_key) WHERE deleted_at IS NULL;

-- RLS: mirror research_findings posture — client reads its OWN case rows (Evidence tab),
-- admin full access. (Column-scoping for client reads is enforced at the query layer,
-- consistent with the rest of the app; column-level hardening is a later RLS task.)
ALTER TABLE case_track_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY ctr_own ON case_track_results FOR SELECT
  USING (EXISTS (SELECT 1 FROM cases WHERE id = case_id AND client_id = get_current_user_id()));
CREATE POLICY ctr_admin ON case_track_results FOR ALL
  USING (is_current_user_admin());

CREATE TRIGGER case_track_results_updated_at BEFORE UPDATE ON case_track_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---- Backfill from legacy research_findings (deterministic even if 0 rows) ----
INSERT INTO case_track_results (
  case_id, track, track_key, track_number, source_mode, ai_output_json,
  manual_notes, manual_urls, manual_screenshot_paths, compiled_findings_json,
  confidence_band, finding_certainty, manual_review_required, manual_review_reason,
  founder_review_status, attempt_number, created_at, deleted_at
)
SELECT
  rf.case_id,
  rf.track,
  CASE rf.track
    WHEN 'track_0' THEN 'intake'
    WHEN 'track_1' THEN 'supplier_identity'
    WHEN 'track_2' THEN 'supply_chain_relationship'
    WHEN 'track_3' THEN 'brand_risk_assessment'
    WHEN 'track_4' THEN 'documentation_review'
    WHEN 'track_5' THEN 'sourcing_logic'
  END,
  CAST(substring(rf.track FROM 'track_(\d)') AS int),
  rf.source_mode,
  rf.ai_output_json,
  rf.manual_notes, rf.manual_urls, rf.manual_screenshot_paths,
  rf.compiled_findings_json,
  rf.confidence,                  -- legacy high/moderate/low → valid confidence_band values
  rf.finding_certainty,
  rf.manual_review_required, rf.manual_review_reason,
  -- manual_override rows = founder already reviewed by the act of entering them (ADR-G003 Tier-3)
  CASE WHEN rf.source_mode = 'manual_override' THEN 'approved' ELSE 'pending' END,
  1,
  rf.created_at, rf.deleted_at
FROM research_findings rf
ON CONFLICT (case_id, track, attempt_number) DO NOTHING;

-- ---- Deprecate research_findings (legacy; no new writes; drop after Phase G stabilizes) ----
COMMENT ON TABLE research_findings IS
  'LEGACY (ADR-G001): superseded by case_track_results. No new writes. Scheduled for removal after Phase G stabilization + verification.';

COMMIT;
