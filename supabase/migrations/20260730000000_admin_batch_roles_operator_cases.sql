-- ════════════════════════════════════════════════════════════════════════════════════════
-- ADMIN BATCH (2026-07-30) — role hierarchy + operator-run cases. ADDITIVE ONLY.
-- ⛔ FOUNDER-RUN (describe-and-stop). Verified against live schema before writing:
--   · admin_permissions does NOT exist (probe: relation error)
--   · cases.origin / cases.operator_meta do NOT exist
--   · clients.role/is_admin exist (20260620 applied; the transitional fallback reads them)
-- Idempotent: safe on an environment that already matches.
-- ════════════════════════════════════════════════════════════════════════════════════════

-- (a) The permission table. Roles live on their OWN identities (Clerk user ids) — NEVER on
--     client rows (identity ruling 2026-07-30). manage-users is the super_admin ROLE, not a cap.
CREATE TABLE IF NOT EXISTS admin_permissions (
  user_id text PRIMARY KEY,             -- Clerk user id
  email text NOT NULL,                  -- label only; gating NEVER compares emails
  role text NOT NULL CHECK (role IN ('super_admin', 'sub_user')),
  capabilities text[] NOT NULL DEFAULT '{}',
  disabled boolean NOT NULL DEFAULT false,
  created_by text,                      -- the super admin who created this row
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_permissions_admin ON admin_permissions;
CREATE POLICY admin_permissions_admin ON admin_permissions FOR ALL USING (is_current_user_admin());

-- (b) Case provenance — paid-through-Stripe vs operator-run, answerable with ONE query forever:
--     SELECT case_number FROM cases WHERE origin = 'operator';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'client_paid'
  CHECK (origin IN ('client_paid', 'operator'));
ALTER TABLE cases ADD COLUMN IF NOT EXISTS operator_meta jsonb;  -- {operator_id, client_name, company_name}

-- (c) The house attribution row for operator-run cases (cases.client_id is NOT NULL → operator
--     cases attribute HERE; the run path never reads or writes credits, so this row's credit
--     fields are inert by construction — NOT an unlimited-credit hack).
INSERT INTO clients (id, email, full_name, company_name, plan_type, plan_category, credits_available, billing_status, role)
SELECT 'operator-house', 'operator@hyprriq.internal', 'HyprrIQ Operator', 'Hyprr Retail LLC', 'scale_499', 'subscription', 0, 'active', 'client'
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE id = 'operator-house');

-- (d) SUPER-ADMIN SEED — RUN LATER, WHEN THE MAILBOX + CLERK ACCOUNT EXIST (template; the
--     founder fills the real Clerk user id for g@hyprriq.com):
-- INSERT INTO admin_permissions (user_id, email, role, capabilities, created_by)
--   VALUES ('<clerk-user-id-of-g@hyprriq.com>', 'g@hyprriq.com', 'super_admin', '{}', 'seed');
-- And the full-access sub-user for gautamnaidu.p@gmail.com (created via the admin UI once the
-- super admin exists, or seeded the same way with role 'sub_user' and capabilities
-- '{view_cases,review_publish,run_case,rerun,adjust_credits,view_billing}').

-- READ-BACK VERIFICATION (run after; never trust "Success. No rows returned"):
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name='cases' AND column_name IN ('origin','operator_meta');        -- expect 2 rows
--   SELECT table_name FROM information_schema.tables WHERE table_name='admin_permissions'; -- expect 1
--   SELECT id, role, credits_available FROM clients WHERE id='operator-house';       -- expect 1 row, 0 credits
