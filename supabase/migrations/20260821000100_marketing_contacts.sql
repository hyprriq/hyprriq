-- ── MARKETING CONSENT LEDGER (ADR-EMAIL-001) — AS APPLIED. ──
--
-- The founder ran this 2026-08-21 via Supabase MCP from the spec (not this file); this file was
-- then rewritten to match the LIVE database exactly (verified live: information_schema,
-- pg_constraint, pg_indexes), so the repo record and production can never disagree. The live
-- shape supersedes the earlier described draft: consent_status is a CHECKED enum
-- (subscribed/unsubscribed/pending), the consent timestamp is consent_at, and unsubscription is
-- unsubscribed_at (null = active) rather than a status string. /api/newsletter and /unsubscribe
-- write THIS shape.
--
-- The app collects, a tool sends: the signup box writes the consent record, the tokenized
-- permanent /unsubscribe flips consent_status + stamps unsubscribed_at, and NOTHING in the app
-- ever flips an address back. RLS is ENABLED with ZERO policies — service-role only.

create table if not exists public.marketing_contacts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  consent_status text not null default 'subscribed'
    check (consent_status in ('subscribed', 'unsubscribed', 'pending')),
  consent_at timestamptz not null default now(),
  source text not null,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_marketing_contacts_status on public.marketing_contacts (consent_status);

alter table public.marketing_contacts enable row level security;

-- READ-BACKS (all verified live 2026-08-21):
--   select relrowsecurity from pg_class where relname='marketing_contacts';   -- true
--   select policyname from pg_policies where tablename='marketing_contacts';  -- ZERO rows
--   select conname from pg_constraint where conrelid='public.marketing_contacts'::regclass
--     and conname='marketing_contacts_consent_status_check';                  -- one row
