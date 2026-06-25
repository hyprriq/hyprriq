-- ============================================================
-- Migration 2/5 — reconcile track_key 'intake' → 'intake_scope_guard'
-- (Tech Arch v1.4 §2.3 + ADR-G004 canonical track_key values).
--
-- TRANSITIONAL CHECK: the new constraint allows BOTH 'intake' and
-- 'intake_scope_guard' so neither the current orchestrator (still writes
-- 'intake') nor the updated skeleton code (writes 'intake_scope_guard') breaks
-- during the Phase-1→Phase-2 window. Existing rows are migrated to the canonical
-- value now. A later cleanup migration drops 'intake' once the code swap ships.
--
-- PRE-FLIGHT: SELECT DISTINCT track_key FROM case_track_results;  -- expect 'intake' present
-- ============================================================
BEGIN;

ALTER TABLE case_track_results DROP CONSTRAINT IF EXISTS case_track_results_track_key_check;

UPDATE case_track_results SET track_key = 'intake_scope_guard' WHERE track_key = 'intake';

ALTER TABLE case_track_results ADD CONSTRAINT case_track_results_track_key_check
  CHECK (track_key IN (
    'intake','intake_scope_guard',   -- 'intake' transitional; dropped post code-swap cleanup
    'supplier_identity','supply_chain_relationship',
    'brand_risk_assessment','documentation_review','sourcing_logic'));

COMMIT;
