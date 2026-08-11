-- ══════════════════════════════════════════════════════════════════════════════════════════
-- CREDIT / USAGE SEMANTICS (FOUNDER-RULED 2026-08-12) — ⛔ FOUNDER-RUN ONLY. NOT applied by
-- any automated path. The admin credit-adjust route FAILS CLOSED (503) until this runs.
--
-- THE FOUR LOCKED RULES (stated in docs/SAAS_ARCHITECTURE.md "Credit & usage semantics";
-- they are the basis of the refund formula and must never be re-derived from code):
--   (a) A case consuming a credit → credits_available −1, credits_used_this_cycle +1.
--       The ONLY thing that increments usage. (deduct_client_credits — UNCHANGED: it
--       implements exactly this and is called only by the consumption path.)
--   (b) Admin adjustment, either direction → credits_available ONLY. Never touches usage.
--       An adjustment is a correction, not consumption. (adjust_client_credits — CREATED HERE.
--       The old route misused deduct_client_credits for negative adjustments, permanently
--       inflating usage.)
--   (c) Refund of an UNUSED credit → claws credits_available back by 1. Usage untouched.
--       (No in-app flow yet — refunds are Stripe-dashboard-only; when built, it uses
--       rule-(b) mechanics: adjust_client_credits with a negative delta.)
--   (d) Refund on a DELIVERED report → money only. Credit stays consumed, usage stays
--       incremented — the client keeps the report. (No credit RPC involved, by rule.)
-- SYSTEM REVERSAL (the inverse of (a), not an admin act): refund_client_credits — UNCHANGED —
-- runs only when a charged submission FAILS (case never entered the pipeline): avail +N,
-- usage −N, because the consumption did not happen.
-- add_client_credits — UNCHANGED — purchases/top-ups/grants: avail only, already rule-clean.
-- ══════════════════════════════════════════════════════════════════════════════════════════

-- The rule-(b) RPC: balance-only, atomic, refuses to take the balance negative (returns NULL,
-- which the route reports as 409 insufficient_credits and audits NOTHING — no row for a no-op).
CREATE OR REPLACE FUNCTION adjust_client_credits(p_client_id text, p_delta int)
RETURNS integer AS $$
  UPDATE clients
     SET credits_available = credits_available + p_delta
   WHERE id = p_client_id
     AND credits_available + p_delta >= 0
  RETURNING credits_available;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- READ-BACK VERIFICATION (run after; never trust "Success. No rows returned"):
--   SELECT routine_name FROM information_schema.routines
--     WHERE routine_name = 'adjust_client_credits';                          -- expect 1 row
--   SELECT proargnames FROM pg_proc WHERE proname = 'adjust_client_credits'; -- {p_client_id,p_delta}
-- FUNCTIONAL PROBE (safe on any test client row):
--   SELECT adjust_client_credits('<some-client-id>', 0);   -- returns current balance, changes nothing
