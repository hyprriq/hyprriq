-- ══════════════════════════════════════════════════════════════════════════════════════════
-- PURCHASED CREDITS NEVER EXPIRE (item 3 of the 2026-08-22 four-item batch) — AS APPLIED.
--
-- The founder ran this 2026-08-22 from the session deliverable's describe-and-stop block; this
-- file was then written to match the LIVE database exactly (verified live via read-only MCP
-- queries the same day: information_schema.columns for the column+default, pg_proc.prosrc for
-- all four function bodies), so the repo record and production can never disagree.
--
-- THE DEFECT THIS KILLED: rollover_client_credits clipped the WHOLE balance at the plan cap —
-- credits a client paid for separately were silently destroyed at renewal. Now:
--   · clients.purchased_credits (int, NOT NULL, DEFAULT 0, CHECK >= 0) is the floor — the
--     portion of credits_available that was PAID FOR separately.
--   · add_purchased_credits lands paid top-ups: balance AND floor together. add_client_credits
--     stays for grants/corrections (plan-class; may expire).
--   · rollover clips ONLY the plan portion; purchased credits ride through untouched.
--   · consumption is PLAN-FIRST: expiring credits burn before paid ones (the deduct clamp).
--   · adjust keeps rule-(b) balance-only semantics; the floor merely never exceeds the balance.
-- The load-bearing expressions below are FIXTURE-LOCKED (lib/data/credits.cycle.test.ts) — the
-- TS cycle proof asserts these exact formulas, so SQL and repo cannot drift silently.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS purchased_credits int NOT NULL DEFAULT 0
  CHECK (purchased_credits >= 0);

CREATE OR REPLACE FUNCTION add_purchased_credits(p_client_id text, p_amount int)
RETURNS integer AS $$
  UPDATE clients SET
    credits_available = credits_available + p_amount,
    purchased_credits = purchased_credits + p_amount
   WHERE id = p_client_id
  RETURNING credits_available;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION rollover_client_credits(p_stripe_customer_id text, p_rollover_cap int, p_cycle_credits int)
RETURNS integer AS $$
  UPDATE clients SET
    credits_available = LEAST(credits_available - purchased_credits, p_rollover_cap)
                        + purchased_credits + p_cycle_credits,
    credits_used_this_cycle = 0
   WHERE stripe_customer_id = p_stripe_customer_id
  RETURNING credits_available;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION deduct_client_credits(p_client_id text, p_amount int)
RETURNS integer AS $$
  UPDATE clients
     SET credits_available = credits_available - p_amount,
         purchased_credits = LEAST(purchased_credits, credits_available - p_amount),
         credits_used_this_cycle = credits_used_this_cycle + p_amount
   WHERE id = p_client_id
     AND credits_available >= p_amount
  RETURNING credits_available;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION adjust_client_credits(p_client_id text, p_delta int)
RETURNS integer AS $$
  UPDATE clients
     SET credits_available = credits_available + p_delta,
         purchased_credits = LEAST(purchased_credits, credits_available + p_delta)
   WHERE id = p_client_id
     AND credits_available + p_delta >= 0
  RETURNING credits_available;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- READ-BACKS (all verified live 2026-08-22, read-only):
--   select column_default from information_schema.columns
--     where table_name='clients' and column_name='purchased_credits';   -- 0
--   select proname from pg_proc where proname in
--     ('add_purchased_credits','rollover_client_credits','deduct_client_credits','adjust_client_credits');
--     -- 4 rows; prosrc of each matches the bodies above verbatim
--   Functional proof: founder-run with real numbers same day (buy-3 → renewal → 3 survived the clip).
