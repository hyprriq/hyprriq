-- ============================================================
-- Migration — vendor_intelligence.entered_names (Spec-B — client-entered aliases).
-- WHY: Track 0.5 now keys the institutional-memory corpus on the RESOLVED identity (resolved_name),
--   NEVER the entered name — fixing an ACTIVE pollution bug. For the globaldist case (client entered
--   "Bosch", website resolved "Global Distribution LLC"), the old code wrote a "bosch" vendor row for
--   what is really Global Distribution LLC, corrupting the corpus. This column records the entered
--   name(s) as aliases so ADR-G006 can later learn "this supplier is often mis-entered as X".
--   Write-side persistence ONLY — the memory engine / query layer / admin browse views stay deferred (G6).
-- ORDERING (IMPORTANT — opposite of a DROP): run this migration BEFORE deploying the paired code. The new
--   writeIntelligence writes `entered_names`, so the column must exist first; deploying the code before
--   the column exists would make every memory write fail. Additive, NOT NULL DEFAULT '{}' — safe anytime.
-- ============================================================
BEGIN;
ALTER TABLE vendor_intelligence ADD COLUMN IF NOT EXISTS entered_names text[] NOT NULL DEFAULT '{}';
COMMIT;

-- VERIFY (run separately):
-- select column_name from information_schema.columns
--   where table_name = 'vendor_intelligence' and column_name = 'entered_names';  -- expect 1 row
