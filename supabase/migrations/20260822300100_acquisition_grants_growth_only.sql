-- ══════════════════════════════════════════════════════════════════════════════════════════
-- GRANTS ARE growth_279, ENFORCED AT THE DATABASE (2026-08-22 second-batch ruling) — AS APPLIED.
--
-- The founder ran this 2026-08-22 from the session deliverable; this file matches the LIVE
-- database exactly (verified live via read-only MCP the same day: pg_get_constraintdef shows
-- CHECK ((grant_plan_type = 'growth_279'::text)) NOT VALID; both column defaults are gone;
-- zero live unredeemed grants carry another tier). NOT VALID is deliberate: historical
-- revoked/redeemed rows keep their true record; every NEW row must be growth_279.
-- The app layer already writes only GRANT_PLAN_TYPE (lib/data/grants.ts) — this is the same
-- ruling at the layer below, so a raw SQL insert cannot re-open the door either.

ALTER TABLE acquisition_grants DROP CONSTRAINT IF EXISTS acquisition_grants_grant_plan_type_check;
ALTER TABLE acquisition_grants ADD CONSTRAINT acquisition_grants_grant_plan_type_check
  CHECK (grant_plan_type = 'growth_279') NOT VALID;

-- Same defect class at the DB layer as the createGrant `??` fallbacks: silent value defaults.
-- A raw insert now states grant_credits and max_redemptions or fails.
ALTER TABLE acquisition_grants ALTER COLUMN grant_credits DROP DEFAULT;
ALTER TABLE acquisition_grants ALTER COLUMN max_redemptions DROP DEFAULT;

-- READ-BACKS (all verified live 2026-08-22):
--   select pg_get_constraintdef(oid) from pg_constraint
--     where conrelid='public.acquisition_grants'::regclass
--       and conname='acquisition_grants_grant_plan_type_check';
--     -- CHECK ((grant_plan_type = 'growth_279'::text)) NOT VALID
--   select column_default from information_schema.columns
--     where table_name='acquisition_grants' and column_name in ('grant_credits','max_redemptions');
--     -- both NULL
--   select count(*) from acquisition_grants
--     where grant_plan_type <> 'growth_279' and revoked_at is null and redemption_count = 0;  -- 0
