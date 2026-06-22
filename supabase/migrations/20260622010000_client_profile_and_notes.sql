-- ============================================================
-- Migration: Expanded client profile + admin internal notes
-- Spec: HyprrIQ_ClaudeCode_ClientProfile_TrackSchema_Deletion.md (Items 1 & 2)
-- ADDITIVE ONLY. All columns nullable (or boolean DEFAULT false). No data rewrite.
--
-- NOTE: clients.marketplace ALREADY EXISTS (legacy, unused, Amazon-only enum).
--   We add primary_marketplace (broader value set) per spec; the legacy column is
--   left untouched and slated for a later cleanup ADR.
--
-- internal_notes is admin-only. RLS is row-level (clients_self grants the client
--   their own row), so column protection is enforced at the QUERY layer: the
--   client-facing data layer never SELECTs internal_notes/notes_updated_at.
-- ============================================================
BEGIN;

-- Contact details (may differ from the Clerk user who pays)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_name  text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_phone text;

-- Business profile
ALTER TABLE clients ADD COLUMN IF NOT EXISTS primary_marketplace text
  CHECK (primary_marketplace IN (
    'amazon_us','amazon_uk','amazon_de','amazon_ca','amazon_au','amazon_mx',
    'walmart_us','ebay_us','shopify','tiktok_shop','wholesale_only','other'));
ALTER TABLE clients ADD COLUMN IF NOT EXISTS marketplace_other_name text; -- only when primary_marketplace = 'other'
ALTER TABLE clients ADD COLUMN IF NOT EXISTS sells_on_amazon  boolean DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS sells_on_walmart boolean DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS amazon_store_name  text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS walmart_store_name text;

-- Formal billing details (separate from the Stripe card address)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_company_name  text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_address_line1 text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_address_line2 text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_city    text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_state   text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_zip     text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_country text;

-- Tax / compliance (Settings-page only, never collected during onboarding)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS vat_number text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ein_number text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tax_id     text;

-- Admin-only internal notes
ALTER TABLE clients ADD COLUMN IF NOT EXISTS internal_notes   text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes_updated_at timestamptz;

COMMIT;
