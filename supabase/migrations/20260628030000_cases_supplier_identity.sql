-- ============================================================
-- Migration — cases.supplier_identity (Track 0.5 Supplier Identity Resolution).
-- Stores the resolved SupplierIdentity object (original_input, resolved_name/domain, candidates,
-- confidence, resolution_method, notes) produced by the resolve-identity stage. Surfaces the
-- resolution to the manual-review human and seeds the future Supplier Intelligence Profile
-- (ADR-G006). Does NOT version or alter the Evidence Pack, weights, verdict logic, or firewall —
-- it is an upstream input record only. Additive + nullable; no existing data affected.
-- ============================================================
BEGIN;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS supplier_identity jsonb;
COMMIT;

-- VERIFY (run separately):
-- select column_name from information_schema.columns
--   where table_name = 'cases' and column_name = 'supplier_identity';  -- expect 1 row
