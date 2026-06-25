-- ============================================================
-- Migration 5/5 — Agency Mode foundation (Tech Arch v1.4 §2.6 + Agency Mode Arch).
-- Build the pipeline agency-agnostic from the start: an agencies table + nullable
-- agency_id on cases and clients. NO agency UI/roles/billing yet (Phase K) — this
-- only ensures core decisions never block Agency Mode. ADDITIVE ONLY.
-- agency_id is nullable (B2C = null). FKs reference agencies(id) (uuid).
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_name text NOT NULL,
  billing_plan text CHECK (billing_plan IN ('agency_monthly','agency_yearly')),
  stripe_customer_id text,
  seat_limit integer NOT NULL DEFAULT 5,
  cases_per_month integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE clients ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES agencies(id);
ALTER TABLE cases   ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES agencies(id);

CREATE INDEX IF NOT EXISTS idx_clients_agency ON clients(agency_id) WHERE agency_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_agency   ON cases(agency_id)   WHERE agency_id IS NOT NULL;

ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
-- Admin-only until agency roles land (Phase K). Agency-scoped policies are added then.
CREATE POLICY agencies_admin ON agencies FOR ALL USING (is_current_user_admin());

COMMIT;
