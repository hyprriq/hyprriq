-- ============================================================
-- Add 'cancelling' to clients.billing_status — the distinct state for a
-- subscription set to cancel_at_period_end (still active + usable until the
-- period ends, but won't renew). Additive + transaction-wrapped.
--
-- ⚠ APPLY THIS BEFORE testing cancel: the webhook writes billing_status
-- 'cancelling' on customer.subscription.updated, which would violate the old
-- CHECK until this runs.
-- ============================================================

BEGIN;

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_billing_status_check;
ALTER TABLE clients ADD CONSTRAINT clients_billing_status_check
  CHECK (billing_status IN ('active', 'past_due', 'cancelled', 'trialling', 'cancelling'));

COMMIT;
