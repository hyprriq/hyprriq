-- ============================================================
-- HyprrIQ — Session F migration
-- 1. Align plan_type enums to LOCKED pricing (single_99 / growth_279 / scale_499)
--    The initial schema shipped the pre-pricing-update enum
--    (starter_79, dossier_197, growth_249, scale_499, agency_999).
--    Locked pricing (2026-06-18) + lib/content/pricing.ts use
--    single_99 / growth_279 / scale_499. Writes of single_99/growth_279
--    would violate the old CHECK, so realign both clients and cases here.
-- 2. Add clients.onboarding_completed (first-login onboarding guard).
-- 3. Create support_requests (Support Centre, Change Request, Admin Queue)
--    with SR-YYYYMMDD-NNN generation + RLS.
--
-- PRE-FLIGHT CONFIRMED (2026-06-19): 0 rows in clients/cases carry retired
-- plan_type values (starter_79/dossier_197/growth_249/agency_999). If that ever
-- changes, remap before running — the ADD CONSTRAINT below would otherwise fail.
--
-- Wrapped in a single transaction: if any statement fails (e.g. the constraint
-- swap), the whole migration rolls back — no half-applied state where plan_type
-- is left with no constraint.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. plan_type realignment
-- ------------------------------------------------------------
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_plan_type_check;
ALTER TABLE clients ADD CONSTRAINT clients_plan_type_check
  CHECK (plan_type IN ('single_99','growth_279','scale_499'));

ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_plan_type_check;
ALTER TABLE cases ADD CONSTRAINT cases_plan_type_check
  CHECK (plan_type IN ('single_99','growth_279','scale_499'));

-- ------------------------------------------------------------
-- 2. onboarding guard column
-- ------------------------------------------------------------
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- ------------------------------------------------------------
-- 3. support_requests
-- ------------------------------------------------------------
-- SR number generator: SR-YYYYMMDD-NNN, NNN = per-day sequence.
-- Count-based (low volume); the UNIQUE constraint on sr_number is the
-- correctness backstop — a rare concurrent collision fails the INSERT
-- and is safe to retry.
CREATE OR REPLACE FUNCTION generate_sr_number()
RETURNS TRIGGER AS $$
DECLARE
  day_key text := to_char(NOW(), 'YYYYMMDD');
  seq int;
BEGIN
  IF NEW.sr_number IS NULL OR NEW.sr_number = '' THEN
    SELECT COUNT(*) + 1 INTO seq
      FROM support_requests
      WHERE sr_number LIKE 'SR-' || day_key || '-%';
    NEW.sr_number := 'SR-' || day_key || '-' || lpad(seq::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sr_number text UNIQUE NOT NULL DEFAULT '',
  client_id text NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  case_id uuid REFERENCES cases(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'general' CHECK (type IN (
    'change_request','billing','technical','general','other')),
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN (
    'open','in_progress','resolved','closed')),
  admin_response text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER set_sr_number BEFORE INSERT ON support_requests
  FOR EACH ROW EXECUTE FUNCTION generate_sr_number();

CREATE TRIGGER support_requests_updated_at BEFORE UPDATE ON support_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_support_requests_client ON support_requests(client_id, status);
CREATE INDEX idx_support_requests_open ON support_requests(status)
  WHERE status = 'open';
CREATE INDEX idx_support_requests_case ON support_requests(case_id);

-- RLS: clients see/manage their own; admins see all (same pattern as cases)
ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_requests_own ON support_requests FOR ALL
  USING (client_id = get_current_user_id());
CREATE POLICY support_requests_admin ON support_requests FOR ALL
  USING (is_current_user_admin());

-- ------------------------------------------------------------
-- 4. Atomic credit deduction (no read-modify-write race on submit)
-- ------------------------------------------------------------
-- Decrements credits atomically iff the client has enough. Returns the NEW
-- balance, or NULL when the client has insufficient credits (caller treats
-- NULL as "402 insufficient credits"). SECURITY DEFINER + server-only caller.
CREATE OR REPLACE FUNCTION deduct_client_credits(p_client_id text, p_amount int)
RETURNS integer AS $$
  UPDATE clients
     SET credits_available = credits_available - p_amount,
         credits_used_this_cycle = credits_used_this_cycle + p_amount
   WHERE id = p_client_id
     AND credits_available >= p_amount
  RETURNING credits_available;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Refund path (used only if case creation fails after a successful deduct).
CREATE OR REPLACE FUNCTION refund_client_credits(p_client_id text, p_amount int)
RETURNS integer AS $$
  UPDATE clients
     SET credits_available = credits_available + p_amount,
         credits_used_this_cycle = greatest(0, credits_used_this_cycle - p_amount)
   WHERE id = p_client_id
  RETURNING credits_available;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

COMMIT;
