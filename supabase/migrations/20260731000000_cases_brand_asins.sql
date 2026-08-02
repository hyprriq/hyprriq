-- ── ASIN intake (tracker §1.3, Keepa ruling 4 — founder-ruled 2026-07-28: Scale = 5 brands,
-- 1 ASIN per brand). FOUNDER-RUN, same as every migration. Pre-verified ABSENT 2026-07-30
-- (read-only probe). Shape: {brand: ASIN} — one ASIN per brand, enforced in code by
-- lib/portal/asinIntake.ts (the guard reads PLAN_BRAND_CAPS; clients.max_brands_per_credit
-- is NULL everywhere and is NOT the authority). Until this runs, the submit route's
-- brand_asins persist fails loud-but-non-fatal and the value rides the pipeline payload. ──

ALTER TABLE cases ADD COLUMN IF NOT EXISTS brand_asins jsonb;

COMMENT ON COLUMN cases.brand_asins IS 'ASIN per brand {brand: ASIN} — Scale-tier intake (tracker 1.3, Keepa ruling 4); written by the submit route, read downstream by Keepa. NULL = none provided.';
