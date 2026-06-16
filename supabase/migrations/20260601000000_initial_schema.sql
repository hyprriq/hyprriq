-- ============================================================
-- HyprrIQ Initial Schema — v1.1
-- Generated for Session 1 Foundation Build
-- Auth: Clerk (replaces Supabase Auth — NO auth.users refs)
-- ============================================================
--
-- MANUAL STEPS REQUIRED AFTER MIGRATION RUNS:
-- 1. PGBOUNCER: Supabase Dashboard → Settings → Database →
--    Enable Connection Pooling (PgBouncer) — Transaction mode
--    Required per HyprrIQ_Technical_Architecture_v1_1.docx Section 2
-- 2. STORAGE BUCKET: Supabase Dashboard → Storage →
--    Create bucket named: case-documents
--    Set bucket to PRIVATE (not public)
--    Add RLS policy: authenticated users can read/write
--    their own files only (match on file path prefix = client_id)
-- 3. STORAGE BUCKET #2: Create bucket named: reports
--    Set to PRIVATE. Clients can read files in their own case folder.
--    Admins can read/write all.
-- ============================================================
--
-- SESSION-1 DEVIATIONS FROM SPEC (see build report for rationale):
--  A. Added SECURITY DEFINER helper is_current_user_admin() and used it in
--     all admin RLS policies. The spec's inline
--     `EXISTS (SELECT 1 FROM clients ...)` admin check causes INFINITE
--     RECURSION when used in a policy ON the clients table itself
--     (Postgres re-evaluates clients' policies while evaluating them).
--     The SECURITY DEFINER function bypasses RLS on its internal read,
--     breaking the recursion. Same logic, applied everywhere for
--     consistency and speed.
--  B. Views created WITH (security_invoker = true) so RLS of the querying
--     role applies (Supabase security best practice / linter requirement).
--  C. All functions pinned with `SET search_path = public`
--     (Supabase linter: function_search_path_mutable).
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Returns the current Clerk user id, set per-request via
-- `SET LOCAL app.current_user_id = '<clerk_user_id>'`. Returns NULL if unset.
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS text AS $$
  SELECT current_setting('app.current_user_id', true)
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- True when the current user is a non-deleted admin. SECURITY DEFINER so the
-- internal read bypasses RLS — this is what prevents infinite recursion when
-- the function is referenced inside the clients table's own policies.
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.clients
    WHERE id = get_current_user_id()
      AND is_admin = true
      AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Generic updated_at maintainer.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Case number sequence + generator: AWI-YYMM-### .
CREATE SEQUENCE IF NOT EXISTS case_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.case_number IS NULL OR NEW.case_number = '' THEN
    NEW.case_number := 'AWI-' || to_char(NOW(), 'YYMM') || '-'
      || lpad(nextval('case_number_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================
-- TABLE 1: clients
-- Clerk user_id (text, e.g. user_xxx). NOT uuid. No auth.users reference.
-- ============================================================
CREATE TABLE clients (
  id text PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  company_name text,
  plan_type text CHECK (plan_type IN (
    'starter_79','dossier_197','growth_249','scale_499','agency_999')),
  plan_category text CHECK (plan_category IN ('one_time','subscription')),
  credits_available integer DEFAULT 0 NOT NULL,
  credits_used_this_cycle integer DEFAULT 0 NOT NULL,
  renewal_date timestamptz,
  billing_status text DEFAULT 'active' CHECK (billing_status IN (
    'active','past_due','cancelled','trialling')),
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
  max_brands_per_credit integer,
  max_files_per_submission integer,
  sla_days integer,
  keepa_enabled boolean DEFAULT false NOT NULL,
  deep_scenario boolean DEFAULT false NOT NULL,
  rollover_limit integer DEFAULT 0 NOT NULL,
  marketplace text DEFAULT 'amazon_us' CHECK (marketplace IN (
    'amazon_us','amazon_uk','amazon_ca','amazon_de','amazon_au')),
  tax_id_type text CHECK (tax_id_type IN ('EIN','VAT','GST','ABN','none')),
  referral_code text UNIQUE,
  referred_by text,
  is_admin boolean DEFAULT false NOT NULL,
  last_active_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_clients_billing ON clients(billing_status)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_stripe ON clients(stripe_customer_id);
CREATE INDEX idx_clients_referral ON clients(referral_code);
CREATE INDEX idx_clients_admin ON clients(is_admin) WHERE is_admin = true;

CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE 2: cases
-- ============================================================
CREATE TABLE cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text UNIQUE NOT NULL DEFAULT '',
  client_id text NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  plan_type text CHECK (plan_type IN (
    'starter_79','dossier_197','growth_249','scale_499','agency_999')),
  plan_category text CHECK (plan_category IN ('one_time','subscription')),
  submission_type text CHECK (submission_type IN (
    'full_review','brand_only_review')),
  vendor_name text,
  vendor_name_normalized text,
  vendor_website text,
  brands_submitted text[],
  brands_from_ocr text[],
  brands_confirmed text[],
  marketplace text DEFAULT 'amazon_us' CHECK (marketplace IN (
    'amazon_us','amazon_uk','amazon_ca','amazon_de','amazon_au')),
  client_notes text,
  credits_required integer,
  credits_charged integer,
  queue_position integer,
  queue_priority integer CHECK (queue_priority IN (1,2,3)),
  estimated_research_start timestamptz,
  status text NOT NULL DEFAULT 'pending_intake' CHECK (status IN (
    'pending_intake','intake_complete','queued','awaiting_client',
    'research_running','awaiting_review','manual_override_required',
    'qa_in_progress','approved','delivered','complete','cancelled')),
  track_0_status text DEFAULT 'pending' CHECK (track_0_status IN (
    'complete','paused','escalated','pending')),
  track_1_status text DEFAULT 'pending' CHECK (track_1_status IN (
    'complete','failed','skipped','manual_required','pending')),
  track_2_status text DEFAULT 'pending' CHECK (track_2_status IN (
    'complete','failed','skipped','manual_required','pending')),
  track_3_status text DEFAULT 'pending' CHECK (track_3_status IN (
    'complete','failed','skipped','manual_required','pending')),
  track_4_status text DEFAULT 'pending' CHECK (track_4_status IN (
    'complete','failed','skipped','manual_required','pending')),
  track_5_status text DEFAULT 'pending' CHECK (track_5_status IN (
    'complete','failed','skipped','manual_required','pending')),
  verdict text DEFAULT 'pending' CHECK (verdict IN (
    'source_clear','usable_with_conditions',
    'verify_before_purchase','do_not_rely','pending')),
  confidence_score integer CHECK (confidence_score BETWEEN 0 AND 15),
  sla_deadline timestamptz,
  research_start_at timestamptz,
  delivered_at timestamptz,
  change_request_deadline timestamptz,
  change_request_used boolean DEFAULT false NOT NULL,
  daily_cap_date date,
  inngest_job_id text,
  internal_notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TRIGGER set_case_number BEFORE INSERT ON cases
  FOR EACH ROW EXECUTE FUNCTION generate_case_number();

CREATE OR REPLACE FUNCTION set_change_request_deadline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.delivered_at IS NOT NULL AND OLD.delivered_at IS NULL THEN
    NEW.change_request_deadline := NEW.delivered_at + INTERVAL '7 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER cases_change_request_deadline BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION set_change_request_deadline();

CREATE TRIGGER cases_updated_at BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_cases_client_status ON cases(client_id, status)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_cases_sla ON cases(sla_deadline)
  WHERE status NOT IN ('complete','cancelled');
CREATE INDEX idx_cases_daily_cap ON cases(daily_cap_date, status);
CREATE INDEX idx_cases_verdict ON cases(verdict) WHERE deleted_at IS NULL;
CREATE INDEX idx_cases_status ON cases(status) WHERE deleted_at IS NULL;

-- ============================================================
-- TABLE 3: research_findings
-- ============================================================
CREATE TABLE research_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  track text NOT NULL CHECK (track IN (
    'track_0','track_1','track_2','track_3','track_4','track_5')),
  source_mode text NOT NULL CHECK (source_mode IN (
    'ai_generated','manual_override')),
  ai_output_json jsonb,
  manual_notes text,
  manual_urls text[],
  manual_screenshot_paths text[],
  compiled_findings_json jsonb,
  confidence text CHECK (confidence IN ('high','moderate','low')),
  finding_certainty text CHECK (finding_certainty IN (
    'verified','inferred','unknown')),
  manual_review_required boolean DEFAULT false NOT NULL,
  manual_review_reason text,
  created_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz,
  UNIQUE(case_id, track)
);

CREATE INDEX idx_research_findings_case ON research_findings(case_id);

-- ============================================================
-- TABLE 4: uploaded_files
-- ============================================================
CREATE TABLE uploaded_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  client_id text NOT NULL REFERENCES clients(id),
  file_name text NOT NULL,
  file_type text CHECK (file_type IN (
    'invoice_pdf','invoice_image','loa_pdf','other')),
  storage_path text NOT NULL,
  file_size_bytes integer,
  virus_scan_status text DEFAULT 'pending' CHECK (virus_scan_status IN (
    'pending','clean','infected','error')),
  ocr_extracted_text text,
  ocr_vendor_names text[],
  ocr_brand_names text[],
  ocr_doc_type text CHECK (ocr_doc_type IN (
    'invoice','purchase_order','loa','retail_receipt',
    'marketplace_order','other')),
  ocr_status text DEFAULT 'pending' CHECK (ocr_status IN (
    'pending','complete','failed','unreadable')),
  uploaded_at timestamptz DEFAULT now() NOT NULL,
  delete_after timestamptz,
  deleted_at timestamptz
);

CREATE OR REPLACE FUNCTION set_file_delete_after()
RETURNS TRIGGER AS $$
BEGIN
  NEW.delete_after := NEW.uploaded_at + INTERVAL '12 months';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER uploaded_files_delete_after BEFORE INSERT ON uploaded_files
  FOR EACH ROW EXECUTE FUNCTION set_file_delete_after();

CREATE INDEX idx_uploaded_files_case ON uploaded_files(case_id);
CREATE INDEX idx_uploaded_files_client ON uploaded_files(client_id);
CREATE INDEX idx_uploaded_files_delete ON uploaded_files(delete_after)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_uploaded_files_virus ON uploaded_files(virus_scan_status)
  WHERE virus_scan_status = 'pending';

-- ============================================================
-- TABLE 5: supplier_cache
-- ============================================================
CREATE TABLE supplier_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name text NOT NULL,
  vendor_name_normalized text UNIQUE NOT NULL,
  vendor_website text,
  vendor_type text,
  legitimacy_rating text CHECK (legitimacy_rating IN (
    'verified','credible','limited','unverifiable','flagged')),
  track_1_json jsonb,
  red_flags text[],
  national_distributor boolean DEFAULT false NOT NULL,
  whois_domain_age_days integer,
  last_researched_at timestamptz,
  research_count integer DEFAULT 0 NOT NULL,
  cache_valid_days integer DEFAULT 90 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TRIGGER supplier_cache_updated_at BEFORE UPDATE ON supplier_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_supplier_cache_normalized ON supplier_cache(vendor_name_normalized);
CREATE INDEX idx_supplier_cache_type ON supplier_cache(vendor_type);
CREATE INDEX idx_supplier_cache_freshness ON supplier_cache(last_researched_at)
  WHERE deleted_at IS NULL;

-- ============================================================
-- TABLE 6: brand_cache
-- ============================================================
CREATE TABLE brand_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name text NOT NULL,
  brand_name_normalized text UNIQUE NOT NULL,
  brand_website text,
  enforcement_environment text CHECK (enforcement_environment IN (
    'reseller_friendly','controlled_distribution',
    'marketplace_controlled','aggressive_enforcement','unknown')),
  partner_programme boolean DEFAULT false NOT NULL,
  partner_programme_name text,
  seller_count_trend text CHECK (seller_count_trend IN (
    'increasing','stable','decreasing','volatile','unknown')),
  seller_count_current integer,
  seller_count_peak integer,
  enforcement_cliff_detected boolean DEFAULT false NOT NULL,
  aggregator_owned boolean DEFAULT false NOT NULL,
  aggregator_name text,
  keepa_data_json jsonb,
  track_3_json jsonb,
  last_researched_at timestamptz,
  research_count integer DEFAULT 0 NOT NULL,
  cache_valid_days integer DEFAULT 30 NOT NULL,
  enforcement_history jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TRIGGER brand_cache_updated_at BEFORE UPDATE ON brand_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_brand_cache_normalized ON brand_cache(brand_name_normalized);
CREATE INDEX idx_brand_cache_env ON brand_cache(enforcement_environment)
  WHERE deleted_at IS NULL;

-- ============================================================
-- TABLE 7: audit_log
-- ============================================================
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  old_value jsonb,
  new_value jsonb,
  actor_id text,
  actor_type text NOT NULL CHECK (actor_type IN ('client','admin','system')),
  created_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- ============================================================
-- TABLE 8: client_events
-- ============================================================
CREATE TABLE client_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'login','case_submitted','report_downloaded','change_request',
    'billing_event','support_contact')),
  case_id uuid REFERENCES cases(id) ON DELETE SET NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

CREATE INDEX idx_client_events_client ON client_events(client_id);
CREATE INDEX idx_client_events_type ON client_events(event_type, created_at DESC);
CREATE INDEX idx_client_events_case ON client_events(case_id)
  WHERE case_id IS NOT NULL;

-- ============================================================
-- TABLE 9: case_outcomes
-- ============================================================
CREATE TABLE case_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid UNIQUE NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  verdict_at_delivery text,
  outcome_reported_at timestamptz,
  outcome_type text CHECK (outcome_type IN (
    'no_issues','ip_complaint','invoice_rejected','account_action',
    'brand_enforcement','client_stopped_using_vendor','other')),
  outcome_notes text,
  prediction_correct boolean,
  reported_by text CHECK (reported_by IN ('client','founder','system')),
  created_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

CREATE INDEX idx_case_outcomes_correct ON case_outcomes(prediction_correct);
CREATE INDEX idx_case_outcomes_type ON case_outcomes(outcome_type);

-- ============================================================
-- TABLE 10: founder_notes  (PRIVATE — never client-visible)
-- ============================================================
CREATE TABLE founder_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN (
    'brand','vendor','category')),
  entity_name text NOT NULL,
  entity_name_normalized text NOT NULL,
  note text NOT NULL,
  note_type text CHECK (note_type IN (
    'authorization','enforcement','relationship','warning','general')),
  confidence text CHECK (confidence IN ('high','moderate','low')),
  source text,
  still_valid boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TRIGGER founder_notes_updated_at BEFORE UPDATE ON founder_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_founder_notes_entity ON founder_notes(entity_name_normalized);
CREATE INDEX idx_founder_notes_type ON founder_notes(entity_type, still_valid);

-- ============================================================
-- TABLE 11: prompts
-- ============================================================
CREATE TABLE prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_name text NOT NULL CHECK (track_name IN (
    'track_0','track_1','track_2','track_3','track_4','track_5','master')),
  version text NOT NULL,
  system_prompt text NOT NULL,
  is_active boolean DEFAULT false NOT NULL,
  active_from timestamptz,
  active_to timestamptz,
  performance_notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(track_name, version)
);

CREATE TRIGGER prompts_updated_at BEFORE UPDATE ON prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_prompts_active ON prompts(track_name, is_active)
  WHERE is_active = true;

-- ============================================================
-- TABLE 12: prompt_runs
-- ============================================================
CREATE TABLE prompt_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
  track text,
  prompt_version text,
  inngest_job_id text,
  input_hash text,
  output_json jsonb,
  tokens_used integer,
  cost_usd numeric(10,6),
  error text,
  duration_ms integer,
  created_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

CREATE INDEX idx_prompt_runs_case ON prompt_runs(case_id);
CREATE INDEX idx_prompt_runs_cost ON prompt_runs(created_at DESC);
-- NOTE: a partial index with a NOW()-based predicate is not allowed
-- (predicate must be IMMUTABLE), so daily cost lookups use the plain
-- created_at index above with a WHERE created_at > now() - interval '1 day'
-- at query time.

-- ============================================================
-- TABLE 13: qa_reviews
-- ============================================================
CREATE TABLE qa_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  qa_result text NOT NULL CHECK (qa_result IN ('pass','rework','escalate')),
  issues_found text[],
  banned_language_detected boolean DEFAULT false NOT NULL,
  banned_terms_found text[],
  approved_by text,
  approved_at timestamptz,
  rework_notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

CREATE INDEX idx_qa_reviews_case ON qa_reviews(case_id);
CREATE INDEX idx_qa_reviews_result ON qa_reviews(qa_result);

-- ============================================================
-- TABLE 14: reports
-- ============================================================
CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid UNIQUE NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  pdf_path text,
  pdf_generation_method text DEFAULT 'react-pdf',
  version integer DEFAULT 1 NOT NULL,
  delivered_at timestamptz,
  download_count integer DEFAULT 0 NOT NULL,
  change_request_submitted_at timestamptz,
  change_request_notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

CREATE INDEX idx_reports_case ON reports(case_id);

-- ============================================================
-- TABLE 15: stripe_events
-- ============================================================
CREATE TABLE stripe_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  payload_json jsonb,
  processed boolean DEFAULT false NOT NULL,
  processed_at timestamptz,
  error text,
  created_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

CREATE INDEX idx_stripe_events_unprocessed ON stripe_events(processed, created_at)
  WHERE processed = false;

-- ============================================================
-- TABLE 16: daily_case_count
-- ============================================================
CREATE TABLE daily_case_count (
  date date PRIMARY KEY,
  count integer DEFAULT 0 NOT NULL,
  cap_reached boolean DEFAULT false NOT NULL,
  scale_count integer DEFAULT 0 NOT NULL,
  growth_count integer DEFAULT 0 NOT NULL,
  starter_count integer DEFAULT 0 NOT NULL,
  deleted_at timestamptz
);

-- ============================================================
-- TABLE 17: category_flags
-- ============================================================
CREATE TABLE category_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subcategory text NOT NULL,
  trigger_keywords text[] NOT NULL,
  flag_text text NOT NULL,
  policy_reference text,
  applies_to_plans text[],
  created_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

CREATE INDEX idx_category_flags_sub ON category_flags(subcategory);

-- ============================================================
-- TABLE 18: email_log
-- ============================================================
CREATE TABLE email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  template text NOT NULL,
  case_id uuid REFERENCES cases(id) ON DELETE SET NULL,
  resend_message_id text,
  sent_at timestamptz DEFAULT now() NOT NULL,
  opened_at timestamptz,
  clicked_at timestamptz,
  deleted_at timestamptz
);

CREATE INDEX idx_email_log_case ON email_log(case_id)
  WHERE case_id IS NOT NULL;
CREATE INDEX idx_email_log_recipient ON email_log(recipient);

-- ============================================================
-- TABLE 19: national_distributors
-- ============================================================
CREATE TABLE national_distributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_normalized text UNIQUE NOT NULL,
  category text,
  website text,
  notes text,
  country text DEFAULT 'US',
  created_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

CREATE INDEX idx_national_distributors_name ON national_distributors(name_normalized);

-- ============================================================
-- TABLE 20: partner_program_brands
-- ============================================================
CREATE TABLE partner_program_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name text NOT NULL,
  brand_name_normalized text UNIQUE NOT NULL,
  program_name text,
  verification_steps text,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

CREATE INDEX idx_partner_brands_name ON partner_program_brands(brand_name_normalized);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_case_count ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE national_distributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_program_brands ENABLE ROW LEVEL SECURITY;

-- clients: own row + admin sees all
CREATE POLICY clients_self ON clients FOR ALL
  USING (id = get_current_user_id());
CREATE POLICY clients_admin ON clients FOR ALL
  USING (is_current_user_admin());

-- cases
CREATE POLICY cases_own ON cases FOR ALL
  USING (client_id = get_current_user_id());
CREATE POLICY cases_admin ON cases FOR ALL
  USING (is_current_user_admin());

-- research_findings: clients read own, admins all
CREATE POLICY findings_own ON research_findings FOR SELECT
  USING (EXISTS (SELECT 1 FROM cases WHERE id = case_id AND client_id = get_current_user_id()));
CREATE POLICY findings_admin ON research_findings FOR ALL
  USING (is_current_user_admin());

-- uploaded_files
CREATE POLICY files_own ON uploaded_files FOR ALL
  USING (client_id = get_current_user_id());
CREATE POLICY files_admin ON uploaded_files FOR ALL
  USING (is_current_user_admin());

-- supplier_cache: read by authenticated, write by admin
CREATE POLICY supplier_cache_read ON supplier_cache FOR SELECT
  USING (get_current_user_id() IS NOT NULL AND get_current_user_id() != '');
CREATE POLICY supplier_cache_admin ON supplier_cache FOR ALL
  USING (is_current_user_admin());

-- brand_cache: same pattern as supplier_cache
CREATE POLICY brand_cache_read ON brand_cache FOR SELECT
  USING (get_current_user_id() IS NOT NULL AND get_current_user_id() != '');
CREATE POLICY brand_cache_admin ON brand_cache FOR ALL
  USING (is_current_user_admin());

-- audit_log: admin only
CREATE POLICY audit_log_admin ON audit_log FOR ALL
  USING (is_current_user_admin());

-- client_events: own + admin
CREATE POLICY client_events_own ON client_events FOR ALL
  USING (client_id = get_current_user_id());
CREATE POLICY client_events_admin ON client_events FOR ALL
  USING (is_current_user_admin());

-- case_outcomes: clients insert/read own, admins all
CREATE POLICY outcomes_own ON case_outcomes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM cases WHERE id = case_id AND client_id = get_current_user_id()));
CREATE POLICY outcomes_own_read ON case_outcomes FOR SELECT
  USING (EXISTS (SELECT 1 FROM cases WHERE id = case_id AND client_id = get_current_user_id()));
CREATE POLICY outcomes_admin ON case_outcomes FOR ALL
  USING (is_current_user_admin());

-- founder_notes: admin only (PRIVATE — never client-visible)
CREATE POLICY founder_notes_admin ON founder_notes FOR ALL
  USING (is_current_user_admin());

-- prompts: admin only
CREATE POLICY prompts_admin ON prompts FOR ALL
  USING (is_current_user_admin());

-- prompt_runs: admin only
CREATE POLICY prompt_runs_admin ON prompt_runs FOR ALL
  USING (is_current_user_admin());

-- qa_reviews: admin only
CREATE POLICY qa_reviews_admin ON qa_reviews FOR ALL
  USING (is_current_user_admin());

-- reports: clients read own, admins all
CREATE POLICY reports_own ON reports FOR SELECT
  USING (EXISTS (SELECT 1 FROM cases WHERE id = case_id AND client_id = get_current_user_id()));
CREATE POLICY reports_admin ON reports FOR ALL
  USING (is_current_user_admin());

-- stripe_events: admin only
CREATE POLICY stripe_events_admin ON stripe_events FOR ALL
  USING (is_current_user_admin());

-- daily_case_count: admin only
CREATE POLICY daily_cap_admin ON daily_case_count FOR ALL
  USING (is_current_user_admin());

-- category_flags: read by authenticated (needed for Track 5 lookups)
CREATE POLICY category_flags_read ON category_flags FOR SELECT
  USING (get_current_user_id() IS NOT NULL AND get_current_user_id() != '');
CREATE POLICY category_flags_admin ON category_flags FOR ALL
  USING (is_current_user_admin());

-- email_log: admin only
CREATE POLICY email_log_admin ON email_log FOR ALL
  USING (is_current_user_admin());

-- national_distributors: read by authenticated
CREATE POLICY national_dist_read ON national_distributors FOR SELECT
  USING (get_current_user_id() IS NOT NULL AND get_current_user_id() != '');
CREATE POLICY national_dist_admin ON national_distributors FOR ALL
  USING (is_current_user_admin());

-- partner_program_brands: read by authenticated
CREATE POLICY partner_brands_read ON partner_program_brands FOR SELECT
  USING (get_current_user_id() IS NOT NULL AND get_current_user_id() != '');
CREATE POLICY partner_brands_admin ON partner_program_brands FOR ALL
  USING (is_current_user_admin());

-- ============================================================
-- VIEWS  (security_invoker so the querying role's RLS applies)
-- ============================================================
CREATE VIEW v_case_dashboard
WITH (security_invoker = true) AS
SELECT
  c.id, c.case_number, c.status, c.verdict,
  c.sla_deadline, c.created_at, c.delivered_at,
  c.vendor_name, c.brands_confirmed,
  c.queue_priority, c.inngest_job_id,
  c.track_0_status, c.track_1_status, c.track_2_status,
  c.track_3_status, c.track_4_status, c.track_5_status,
  cl.email AS client_email,
  cl.company_name,
  cl.plan_type,
  EXTRACT(EPOCH FROM (COALESCE(c.delivered_at, NOW()) - c.created_at))/3600
    AS hours_elapsed,
  CASE WHEN c.sla_deadline < NOW()
       AND c.status NOT IN ('complete','cancelled','delivered')
    THEN true ELSE false END AS is_overdue
FROM cases c
JOIN clients cl ON c.client_id = cl.id
WHERE c.deleted_at IS NULL;

CREATE VIEW v_admin_queue
WITH (security_invoker = true) AS
SELECT
  c.id, c.case_number, c.status,
  c.queue_priority, c.queue_position,
  c.estimated_research_start, c.sla_deadline,
  c.vendor_name, c.inngest_job_id,
  cl.company_name, cl.plan_type,
  CASE c.queue_priority
    WHEN 3 THEN 'Scale'
    WHEN 2 THEN 'Growth'
    ELSE 'Starter'
  END AS priority_label
FROM cases c
JOIN clients cl ON c.client_id = cl.id
WHERE c.status IN (
  'queued','research_running','awaiting_review','manual_override_required')
AND c.deleted_at IS NULL
ORDER BY c.queue_priority DESC, c.created_at ASC;

-- ============================================================
-- FUNCTION: credit reset (called by Stripe webhook on renewal)
-- ============================================================
CREATE OR REPLACE FUNCTION reset_client_credits(p_client_id text)
RETURNS void AS $$
DECLARE
  v_plan text;
  v_base integer;
  v_rollover_limit integer;
  v_current integer;
  v_rollover integer;
BEGIN
  SELECT plan_type, credits_available, rollover_limit
  INTO v_plan, v_current, v_rollover_limit
  FROM clients WHERE id = p_client_id;

  v_base := CASE v_plan
    WHEN 'growth_249' THEN 3
    WHEN 'scale_499'  THEN 12
    WHEN 'agency_999' THEN 30
    ELSE 0
  END;

  v_rollover := LEAST(v_current, v_rollover_limit);

  UPDATE clients SET
    credits_available = v_base + v_rollover,
    credits_used_this_cycle = 0,
    updated_at = NOW()
  WHERE id = p_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- SEED DATA
-- ============================================================
INSERT INTO prompts (track_name, version, system_prompt, is_active)
VALUES
  ('track_0','2.0','PLACEHOLDER — load from HyprrIQ_Master_Research_Prompts_v2_0.docx',false),
  ('track_1','2.0','PLACEHOLDER — load from HyprrIQ_Master_Research_Prompts_v2_0.docx',false),
  ('track_2','2.0','PLACEHOLDER — load from HyprrIQ_Master_Research_Prompts_v2_0.docx',false),
  ('track_3','2.0','PLACEHOLDER — load from HyprrIQ_Master_Research_Prompts_v2_0.docx',false),
  ('track_4','2.0','PLACEHOLDER — load from HyprrIQ_Master_Research_Prompts_v2_0.docx',false),
  ('track_5','2.0','PLACEHOLDER — load from HyprrIQ_Master_Research_Prompts_v2_0.docx',false)
ON CONFLICT (track_name, version) DO NOTHING;

INSERT INTO daily_case_count (date, count)
VALUES (CURRENT_DATE, 0)
ON CONFLICT (date) DO NOTHING;
