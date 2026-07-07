-- ============================================================
-- H6 — Money & corpus (ADR-G007). FOUNDER-RUN.
-- A: atomic credit RPCs (webhook top-up + rollover) + retire reset_client_credits
-- B: intelligence_events — append-only per-case corpus ledger (source of truth;
--    vendor/brand_intelligence become recomputable rollups)
-- C: vendor_intelligence gains resolved_domain
-- D: case_outcomes — checkpoint columns + seed rows for already-delivered cases
-- DEPLOY WINDOW: run this, deploy H6 code, then run scripts/cleanup-corpus.ts --apply
-- (backfill+rebuild) BEFORE re-running any case.
-- ============================================================
BEGIN;

-- ── Part A — money ──
-- Top-up: pure atomic increment (a top-up is NOT usage — credits_used_this_cycle untouched).
CREATE OR REPLACE FUNCTION add_client_credits(p_client_id text, p_amount int)
RETURNS integer AS $$
  UPDATE clients SET credits_available = credits_available + p_amount
   WHERE id = p_client_id
  RETURNING credits_available;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Renewal rollover (invoice.paid, billing_reason=subscription_cycle). Cap + cycle credits are
-- PARAMETERS passed from lib/constants/plans.ts — plan names/numbers hardcoded in SQL is exactly
-- the drift that killed reset_client_credits. Keyed by stripe_customer_id (what the invoice has).
CREATE OR REPLACE FUNCTION rollover_client_credits(p_stripe_customer_id text, p_rollover_cap int, p_cycle_credits int)
RETURNS integer AS $$
  UPDATE clients SET
    credits_available = LEAST(credits_available, p_rollover_cap) + p_cycle_credits,
    credits_used_this_cycle = 0
   WHERE stripe_customer_id = p_stripe_customer_id
  RETURNING credits_available;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- B4: zero code callers; keys retired plan names (growth_249/agency_999) — would zero a
-- growth_279 client if ever called. Retired, not fixed: the webhook owns renewal credit math.
DROP FUNCTION IF EXISTS reset_client_credits(text);
-- OQ-2 RULED YES (founder, 2026-07-06): only reader was reset_client_credits; duplicates
-- PLAN_ROLLOVER_LIMIT (the TS single source of truth) — drift source removed.
ALTER TABLE clients DROP COLUMN IF EXISTS rollover_limit;

-- ── Part B — intelligence_events (ADR-G007: append-only corpus events) ──
CREATE TABLE IF NOT EXISTS intelligence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  attempt_number int NOT NULL,
  event_type text NOT NULL DEFAULT 'investigation_completed'
    CHECK (event_type IN ('investigation_completed')),  -- extensible by migration, per real need
  entered_name text,
  resolved_name text NOT NULL,                -- researchIdentityFor(ctx).name — WHO was researched
  vendor_name_normalized text NOT NULL,       -- normalizeName(resolved_name) — rollup join key
  resolved_domain text,
  identity_unconfirmed boolean NOT NULL DEFAULT false,  -- recorded as TRUTH; rollups exclude
  identity_failed boolean NOT NULL DEFAULT false,       -- H2 class: track 1 acquisition/llm failure
  brands text[] NOT NULL DEFAULT '{}',                  -- display strings as submitted
  brands_normalized text[] NOT NULL DEFAULT '{}',       -- normalizeName() of each — brand rollup key
  signals jsonb NOT NULL DEFAULT '{}'::jsonb,           -- track_key → track_verdict_signal
  verdict text,                                          -- this attempt's ceiled verdict
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_id, attempt_number, event_type)          -- Inngest retry/replay idempotency
);
CREATE INDEX IF NOT EXISTS idx_intelligence_events_vendor ON intelligence_events(vendor_name_normalized);
CREATE INDEX IF NOT EXISTS idx_intelligence_events_case ON intelligence_events(case_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_events_brands ON intelligence_events USING gin(brands_normalized);

-- Append-only AT THE DB (service role included): UPDATE/DELETE raise. Founder escape hatch for a
-- ruled correction: DROP TRIGGER, fix, re-create (audit-log it) — deliberate friction.
CREATE OR REPLACE FUNCTION intelligence_events_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'intelligence_events is append-only (ADR-G007)';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS intelligence_events_no_mutate ON intelligence_events;
CREATE TRIGGER intelligence_events_no_mutate
  BEFORE UPDATE OR DELETE ON intelligence_events
  FOR EACH ROW EXECUTE FUNCTION intelligence_events_immutable();

ALTER TABLE intelligence_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY intelligence_events_admin ON intelligence_events FOR ALL
  USING (is_current_user_admin());

-- ── Part C — corpus gains the domain key seed ──
ALTER TABLE vendor_intelligence ADD COLUMN IF NOT EXISTS resolved_domain text;

-- ── Part D — case_outcomes wiring ──
ALTER TABLE case_outcomes ADD COLUMN IF NOT EXISTS checkpoint_30_sent_at timestamptz;
ALTER TABLE case_outcomes ADD COLUMN IF NOT EXISTS checkpoint_90_sent_at timestamptz;
-- Seed the already-delivered cases (Morendelli, AWI-2607-021, AWI-2607-023). reported_by stays
-- NULL until a real outcome is recorded — 'system' would misstate who reported.
INSERT INTO case_outcomes (case_id, verdict_at_delivery)
SELECT id, verdict FROM cases
 WHERE status IN ('delivered','complete') AND deleted_at IS NULL
ON CONFLICT (case_id) DO NOTHING;

COMMIT;

-- ============================================================
-- POST-APPLY VERIFICATION (founder runs each; confirm before H6 code merges)
-- ============================================================
-- A-1 expect 3 rows (add/rollover/deduct present), reset gone:
--   SELECT routine_name FROM information_schema.routines
--   WHERE routine_name IN ('add_client_credits','rollover_client_credits','deduct_client_credits','reset_client_credits');
-- A-2 (OQ-2) expect 0 rows:
--   SELECT column_name FROM information_schema.columns WHERE table_name='clients' AND column_name='rollover_limit';
-- B-1 expect 15 columns:
--   SELECT count(*) FROM information_schema.columns WHERE table_name='intelligence_events';
-- B-2 append-only proof — the UPDATE must ERROR 'intelligence_events is append-only':
--   INSERT INTO intelligence_events (case_id, attempt_number, resolved_name, vendor_name_normalized)
--     SELECT id, 999, 'PROBE', 'probe' FROM cases LIMIT 1;
--   UPDATE intelligence_events SET verdict='x' WHERE attempt_number=999;   -- must ERROR
--   -- then remove the probe:
--   -- ALTER TABLE intelligence_events DISABLE TRIGGER intelligence_events_no_mutate;
--   -- DELETE FROM intelligence_events WHERE attempt_number=999;
--   -- ALTER TABLE intelligence_events ENABLE TRIGGER intelligence_events_no_mutate;
-- C-1 expect 1 row:
--   SELECT column_name FROM information_schema.columns WHERE table_name='vendor_intelligence' AND column_name='resolved_domain';
-- D-1 expect 3 rows, verdicts matching the delivered cases, outcome fields NULL:
--   SELECT case_id, verdict_at_delivery, outcome_type, reported_by FROM case_outcomes;
