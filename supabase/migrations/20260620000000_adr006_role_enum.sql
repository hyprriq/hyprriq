-- ============================================================
-- ADR-006: admin role model — enum now, permissions later
-- Additive + transaction-wrapped. Adds clients.role ('client'|'admin'|'founder'),
-- backfills from the existing is_admin boolean, and makes the RLS admin check
-- role-aware while KEEPING is_admin as a transitional fallback.
--
-- ⚠ APPLY THIS FIRST, then the app code is swapped to read `role` (selecting a
-- column that doesn't exist yet would break the deployed app — so code swap is a
-- separate follow-up after this runs clean). is_admin is intentionally retained;
-- drop it only after the code swap is deployed + verified.
-- ============================================================

BEGIN;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'client'
  CHECK (role IN ('client', 'admin', 'founder'));

-- Backfill: today the only elevated user is the founder.
UPDATE clients SET role = 'founder' WHERE is_admin = true AND role = 'client';

-- RLS admin gate is now role-aware (OR is_admin during the transition window).
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.clients
    WHERE id = get_current_user_id()
      AND (role IN ('admin', 'founder') OR is_admin = true)
      AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMIT;
