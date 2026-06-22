-- ============================================================
-- Migration: let billing_audit survive a client hard-delete (Item 4)
-- Spec: HyprrIQ_ClaudeCode_ClientProfile_TrackSchema_Deletion.md
--
-- Account deletion is a HARD delete (GDPR erasure), but billing_audit rows may be
-- retained for financial/tax compliance (retention_override = true). The original
-- FK (client_id NOT NULL REFERENCES clients(id), default RESTRICT) would BLOCK the
-- client delete while any audit row exists. Relax it:
--   - client_id becomes nullable
--   - FK becomes ON DELETE SET NULL (retained rows keep their data; client_id nulls)
--   - client_email_snapshot preserves who the row belonged to, for legal/finance
--
-- Run AFTER 20260622030000. The deletion route writes client_email_snapshot +
-- retention_override before deleting the client, so the row is identifiable after.
-- ============================================================
BEGIN;

ALTER TABLE billing_audit ALTER COLUMN client_id DROP NOT NULL;

ALTER TABLE billing_audit DROP CONSTRAINT IF EXISTS billing_audit_client_id_fkey;
ALTER TABLE billing_audit ADD CONSTRAINT billing_audit_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

ALTER TABLE billing_audit ADD COLUMN IF NOT EXISTS client_email_snapshot text;

COMMIT;
