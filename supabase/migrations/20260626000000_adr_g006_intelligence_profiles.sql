-- ============================================================
-- Migration — ADR-G006 Institutional Memory: write-side profile tables
--
-- Replaces the dormant supplier_cache / brand_cache (initial-schema cache tables,
-- NO code readers/writers) with the corpus tables Tech Arch v1.4 §2.5 + ADR-G006
-- "WHAT G3 MUST WRITE NOW" require: vendor_intelligence + brand_intelligence.
--
-- WHY NOW: memory cannot be reconstructed retroactively. The write-side discipline
-- must fire from the FIRST real case (Phase 5) so the corpus is clean when the G6
-- read-side is built. writeIntelligence() (lib/data/intelligence.ts) becomes a real
-- upsert against these tables once this is applied.
--
-- ⚠ DESTRUCTIVE: drops supplier_cache + brand_cache (and their policies/indexes/
-- triggers via CASCADE). They are caches with no code references; any rows are lost.
--
-- RLS: ADMIN-ONLY (the corpus is proprietary IP; only the server/service-role reads
-- it — unlike the old caches' authenticated-read). Matches the case_synthesis model.
-- Lookup key on both: *_name_normalized (UNIQUE) — produced by normalizeName(),
-- which is the fixed universal key for all memory matching (ADR-G006).
-- ============================================================
BEGIN;

DROP TABLE IF EXISTS supplier_cache CASCADE;
DROP TABLE IF EXISTS brand_cache CASCADE;

-- ── vendor_intelligence — one row per unique normalized vendor, updated each case ──
CREATE TABLE IF NOT EXISTS vendor_intelligence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name text NOT NULL,
  vendor_name_normalized text UNIQUE NOT NULL,           -- lookup key (normalizeName)
  vendor_type text,
  registration_status text,
  domain_age_days integer,
  known_brand_relationships text[] NOT NULL DEFAULT '{}', -- append: brands seen with this vendor
  overall_risk_signal text CHECK (overall_risk_signal IN (
    'pass','infer','flag','soft_fail','hard_fail','n_a')),  -- latest track_verdict_signal
  risk_history jsonb NOT NULL DEFAULT '[]'::jsonb,        -- append: {case_id, date, signal, key_findings}
  case_count integer NOT NULL DEFAULT 0,
  last_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_vendor_intelligence_normalized
  ON vendor_intelligence(vendor_name_normalized) WHERE deleted_at IS NULL;

ALTER TABLE vendor_intelligence ENABLE ROW LEVEL SECURITY;
CREATE POLICY vendor_intelligence_admin ON vendor_intelligence FOR ALL
  USING (is_current_user_admin());

DROP TRIGGER IF EXISTS vendor_intelligence_updated_at ON vendor_intelligence;
CREATE TRIGGER vendor_intelligence_updated_at BEFORE UPDATE ON vendor_intelligence
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── brand_intelligence — one row per unique normalized brand, updated each case ──
CREATE TABLE IF NOT EXISTS brand_intelligence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name text NOT NULL,
  brand_name_normalized text UNIQUE NOT NULL,            -- lookup key (normalizeName)
  marketplace_posture text,
  enforcement_history jsonb NOT NULL DEFAULT '[]'::jsonb, -- append: {date, event, source}
  known_distributors text[] NOT NULL DEFAULT '{}',        -- append: confirmed distributor names
  partner_program_status text,
  risk_trend text,
  case_count integer NOT NULL DEFAULT 0,
  last_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_brand_intelligence_normalized
  ON brand_intelligence(brand_name_normalized) WHERE deleted_at IS NULL;

ALTER TABLE brand_intelligence ENABLE ROW LEVEL SECURITY;
CREATE POLICY brand_intelligence_admin ON brand_intelligence FOR ALL
  USING (is_current_user_admin());

DROP TRIGGER IF EXISTS brand_intelligence_updated_at ON brand_intelligence;
CREATE TRIGGER brand_intelligence_updated_at BEFORE UPDATE ON brand_intelligence
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ── POST-APPLY VERIFICATION (run separately; confirm APPLIED, not just that pre-flight ran) ──
-- select table_name from information_schema.tables
--   where table_name in ('vendor_intelligence','brand_intelligence');           -- expect 2 rows
-- select table_name from information_schema.tables
--   where table_name in ('supplier_cache','brand_cache');                        -- expect 0 rows
-- select column_name from information_schema.columns
--   where table_name = 'vendor_intelligence' order by ordinal_position;          -- expect 12 cols
