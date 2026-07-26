-- ════════════════════════════════════════════════════════════════════════════════════════
-- Track 6 — Category Compliance (cc-1.0.0) wiring migration. ADDITIVE ONLY.
--
-- ⚠ RECONCILIATION NOTE: this file reproduces a HAND-APPLIED dashboard change on staging
-- (founder-run + founder-verified, 2026-07-23) and SUPERSEDES the uncorrected SQL in the
-- build record (docs/superpowers/plans/2026-07-23-category-compliance-track-gate.md), which
-- never raised track_number_check and would have dropped 'intake' from the track_key CHECK.
-- The constraint definitions below are the FOUNDER-VERIFIED LIVE STATE — if this file and
-- the live DB ever disagree, the live DB (and the founder's verification) wins; fix the file.
-- Idempotent: safe to run on an environment that already matches (staging).
-- ════════════════════════════════════════════════════════════════════════════════════════

-- (a) case_track_results.track — allow the Track 6 row.
ALTER TABLE case_track_results DROP CONSTRAINT IF EXISTS case_track_results_track_check;
ALTER TABLE case_track_results ADD CONSTRAINT case_track_results_track_check
  CHECK (track IN ('track_0','track_1','track_2','track_3','track_4','track_5','track_6'));

-- (b) case_track_results.track_key — allow 'category_compliance'; KEEP the legacy 'intake'
--     value (pre-rename rows carry it; dropping it would invalidate history).
ALTER TABLE case_track_results DROP CONSTRAINT IF EXISTS case_track_results_track_key_check;
ALTER TABLE case_track_results ADD CONSTRAINT case_track_results_track_key_check
  CHECK (track_key IN (
    'intake','intake_scope_guard','supplier_identity','supply_chain_relationship',
    'brand_risk_assessment','documentation_review','sourcing_logic','category_compliance'));

-- (c) case_track_results.track_number — raise the cap to 6 (the uncorrected SQL missed this;
--     without it every Track 6 row insert fails regardless of (a)/(b)).
ALTER TABLE case_track_results DROP CONSTRAINT IF EXISTS case_track_results_track_number_check;
ALTER TABLE case_track_results ADD CONSTRAINT case_track_results_track_number_check
  CHECK (track_number >= 0 AND track_number <= 6);

-- (d) cases.track_6_status — the admin dashboard status column (mirrors track_1..5).
ALTER TABLE cases ADD COLUMN IF NOT EXISTS track_6_status text DEFAULT 'pending'
  CHECK (track_6_status IN ('complete','failed','skipped','manual_required','pending'));

-- Verification (founder ran the equivalent in the dashboard, 2026-07-23):
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conrelid = 'case_track_results'::regclass AND conname LIKE '%track%';
--   -- expect: track_check with track_6 · track_key_check with category_compliance AND intake ·
--   --         track_number_check <= 6
