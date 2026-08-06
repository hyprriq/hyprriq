-- ── PERMISSION HIERARCHY (founder-ruled 2026-08-02) — the 'admin' tier joins the role CHECK.
-- ⛔ FOUNDER-RUN (describe-and-stop). ADDITIVE: widens the allowed role set only; existing
-- rows (super_admin / sub_user) are untouched. Until this runs, creating an 'admin' user
-- fails LOUDLY at the CHECK constraint (the API surfaces the DB error); super_admin and
-- sub_user flows are entirely unaffected — fail-closed, founder unaffected.

ALTER TABLE admin_permissions DROP CONSTRAINT IF EXISTS admin_permissions_role_check;
ALTER TABLE admin_permissions ADD CONSTRAINT admin_permissions_role_check
  CHECK (role IN ('super_admin', 'admin', 'sub_user'));

-- READ-BACK VERIFICATION (run after; never trust "Success. No rows returned"):
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--     WHERE conname = 'admin_permissions_role_check';
--   -- expect: CHECK ((role = ANY (ARRAY['super_admin'::text, 'admin'::text, 'sub_user'::text])))
--   SELECT user_id, role FROM admin_permissions;   -- expect the existing rows unchanged
