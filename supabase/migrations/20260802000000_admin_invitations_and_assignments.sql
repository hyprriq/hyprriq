-- ════════════════════════════════════════════════════════════════════════════════════════
-- ADMIN FOUNDATIONS (2026-08-02) — staff invitations + client partitioning. ADDITIVE ONLY.
-- ⛔ FOUNDER-RUN (describe-and-stop). Pre-conditions verified from source: neither table
-- exists (no migration mentions them). Code FAILS CLOSED until this runs: invitations API
-- 500s loudly; scoped sub-users see an EMPTY client list (never everything); super_admin
-- (the founder) is entirely unaffected — zero behavior change for current operators.
-- ════════════════════════════════════════════════════════════════════════════════════════

-- (a) Staff invitations (WordPress-style). Claim is keyed on the invitee's CLERK-VERIFIED
--     email at first admin visit; only sub_user rows can ever be minted from these.
CREATE TABLE IF NOT EXISTS admin_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,                          -- always stored lowercase (API normalizes)
  capabilities text[] NOT NULL DEFAULT '{}',    -- validated in code against CAPABILITIES
  invited_by text NOT NULL,                     -- Clerk user id of the inviting super admin
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_user_id text,                        -- Clerk user id that claimed it
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS admin_invitations_email_idx ON admin_invitations (email);
ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_invitations_admin ON admin_invitations;
CREATE POLICY admin_invitations_admin ON admin_invitations FOR ALL USING (is_current_user_admin());

-- (b) Client partitioning: which clients a sub_user may see/act on. Absence of rows for a
--     scoped operator = sees nothing (fail closed in code). super_admin / view_all_clients
--     never consult this table.
CREATE TABLE IF NOT EXISTS staff_client_assignments (
  admin_user_id text NOT NULL,                  -- Clerk user id (admin_permissions.user_id)
  client_id text NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  assigned_by text NOT NULL,                    -- the super admin who assigned
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (admin_user_id, client_id)
);
CREATE INDEX IF NOT EXISTS staff_client_assignments_client_idx ON staff_client_assignments (client_id);
ALTER TABLE staff_client_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_client_assignments_admin ON staff_client_assignments;
CREATE POLICY staff_client_assignments_admin ON staff_client_assignments FOR ALL USING (is_current_user_admin());

-- READ-BACK VERIFICATION (run after; never trust "Success. No rows returned"):
--   SELECT table_name FROM information_schema.tables
--     WHERE table_name IN ('admin_invitations','staff_client_assignments');   -- expect 2 rows
--   SELECT count(*) FROM admin_invitations;                                   -- expect 0
--   SELECT count(*) FROM staff_client_assignments;                            -- expect 0
