-- ── OPTION A (founder-ruled 2026-07-30) — raise credits UP TO the plan allotment on upgrade.
-- FOUNDER-RUN. H6-family shape (atomic single-statement, SECURITY DEFINER, parameters from
-- lib/constants/plans.ts — never plan numbers hardcoded in SQL). GREATEST = idempotent by
-- construction: replays and duplicate webhook events are no-ops; never stacks; grants nothing
-- when the balance is already at/above the allotment. The once-per-cycle farm guard (rider 1)
-- lives in code (lib/billing/upgradeGrant.ts), keyed on billing_audit — this function is the
-- atomic write half only. Also called by checkout's activatePlan (edge-6 alignment: ONE
-- credit-raise semantic across upgrade and checkout).

CREATE OR REPLACE FUNCTION raise_credits_to_allotment(p_client_id text, p_floor int)
RETURNS integer AS $$
  UPDATE clients SET credits_available = GREATEST(credits_available, p_floor)
   WHERE id = p_client_id
  RETURNING credits_available;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;
