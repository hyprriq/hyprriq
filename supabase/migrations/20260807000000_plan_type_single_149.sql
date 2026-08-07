-- ── PRICING LADDER (founder-ruled 2026-08-07) — the single_149 tier joins the plan_type
-- CHECKs on clients AND cases. ⛔ FOUNDER-RUN (describe-and-stop; NOT run via MCP by standing
-- law). ADDITIVE: widens the allowed set only; existing rows untouched. ORDER MATTERS: run
-- THIS before setting the STRIPE_PRICE_SINGLE_149 env var — a checkout completing before this
-- runs would fail provisioning at the CHECK. Until both founder steps happen, the tier is
-- visible but not purchasable (checkout returns 503 for an unset price env — never a broken
-- charge).

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_plan_type_check;
ALTER TABLE clients ADD CONSTRAINT clients_plan_type_check
  CHECK (plan_type IN ('single_99', 'single_149', 'growth_279', 'scale_499'));

ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_plan_type_check;
ALTER TABLE cases ADD CONSTRAINT cases_plan_type_check
  CHECK (plan_type IN ('single_99', 'single_149', 'growth_279', 'scale_499'));

-- READ-BACK VERIFICATION (run after; never trust "Success. No rows returned"):
--   SELECT conrelid::regclass AS tbl, pg_get_constraintdef(oid)
--     FROM pg_constraint WHERE conname IN ('clients_plan_type_check','cases_plan_type_check');
--   -- expect BOTH rows to list all four plan values
--   SELECT DISTINCT plan_type FROM clients;   -- existing rows unchanged
