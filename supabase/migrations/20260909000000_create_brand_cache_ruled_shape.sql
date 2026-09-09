-- ── CREATE brand_cache IN ITS RULED SHAPE — founder-run before the cache read goes live ──────
--
-- THE DISCOVERY (2026-09-09, measured via information_schema, not assumed): brand_cache — and
-- supplier_cache beside it — EXIST ONLY IN THE INITIAL-SCHEMA FILE. The live database never got
-- them. Stage 1's fail-soft cache writer has therefore failed silently on every Keepa case
-- (console-only witness — the §0-U billing_audit class again: a swallowed error inside a
-- success path), and the "dormant columns" the cache design was built around were file-fiction.
--
-- SO THE TABLE IS BORN IN ITS RULED SHAPE (founder rulings 2026-09-09), not created from the
-- file and then corrected:
--   · NO cache_valid_days — the ruled cache design has no day-window anywhere: category reads
--     are indefinite-but-dated (fetched_at travels inside keepa_data_json to the client
--     sentence), seller reads are zero-window/always-live (reasoning recorded in
--     lib/research/keepa/categoryCache.ts). A column implying a policy nobody implements is
--     how the FILE's version sat misleading for months.
--   · NO aggregator_owned / aggregator_name — the 2026-09-08 ruling forbids ownership claims
--     (exact storefront match only, phrased as observed); columns asserting ownership would
--     contradict it structurally.
--   · Everything the stage-1 writer actually writes, nothing it does not.
--
-- ⚠ supplier_cache is NOT created here: nothing writes it, and creating unwritten tables is
-- the defect this migration exists to end. Founder to rule if/when a writer exists.
--
-- Read-backs after running:
--   select column_name from information_schema.columns
--    where table_schema='public' and table_name='brand_cache' order by ordinal_position;
--   -- expect exactly the 10 columns below; no cache_valid_days, no aggregator_*
--   select count(*) from brand_cache;   -- 0 until the next Keepa-carrying case runs

CREATE TABLE brand_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name text NOT NULL,
  brand_name_normalized text UNIQUE NOT NULL,
  seller_count_current integer,
  seller_count_peak integer,
  enforcement_cliff_detected boolean DEFAULT false NOT NULL,
  seller_count_trend text CHECK (seller_count_trend IN (
    'increasing','stable','decreasing','volatile','unknown')),
  keepa_data_json jsonb,
  last_researched_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE brand_cache ENABLE ROW LEVEL SECURITY;
-- Service-role only (the research pipeline); no client policies — nothing client-side reads
-- this table directly, projections go through the report chain.
