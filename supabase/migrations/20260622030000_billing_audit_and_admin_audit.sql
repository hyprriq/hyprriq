-- ============================================================
-- Migration: billing_audit + admin_audit_log (Items 5 & 4)
-- Spec: HyprrIQ_ClaudeCode_ClientProfile_TrackSchema_Deletion.md
--
-- billing_audit: written by the Stripe webhook on every plan-state change.
--   Surfaced in admin client detail as "Billing History".
--   retention_override: keep a row for financial/tax compliance even when the
--   client is hard-deleted (Item 4) — set TRUE instead of deleting.
--
-- admin_audit_log: high-sensitivity admin actions (e.g. account deletion).
--   Separate from the generic per-row audit_log and from billing_audit.
--   Both tables are admin-only at the RLS layer.
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS billing_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL REFERENCES clients(id),
  old_plan text,
  new_plan text,
  event text NOT NULL CHECK (event IN (
    'upgrade', 'downgrade', 'cancel', 'resume', 'new_subscription', 'one_time_purchase')),
  stripe_event_id text,
  source text NOT NULL DEFAULT 'stripe',
  notes text,
  retention_override boolean NOT NULL DEFAULT false, -- keep for tax/finance even after client erasure
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_audit_client ON billing_audit(client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL CHECK (action IN ('client_deleted')),
  admin_id text NOT NULL,            -- Clerk user ID of the admin who performed the action
  target_client_id text,             -- the deleted client's id (no FK: row is gone after deletion)
  target_email text,                 -- captured for the record; survives the deletion
  reason text,
  metadata jsonb,                    -- e.g. counts of cascaded rows destroyed
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON admin_audit_log(created_at DESC);

ALTER TABLE billing_audit   ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY billing_audit_admin ON billing_audit FOR ALL
  USING (is_current_user_admin());
CREATE POLICY admin_audit_log_admin ON admin_audit_log FOR ALL
  USING (is_current_user_admin());

COMMIT;
