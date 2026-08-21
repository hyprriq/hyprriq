-- ── MARKETING CONSENT LEDGER (ADR-EMAIL-001) — DESCRIBED-AND-STOPPED: the founder runs this. ──
--
-- The app collects, a tool sends: this table is the consent record the signup box writes
-- (/api/newsletter) and the permanent /unsubscribe route updates. Captured from day one because
-- consent evidence cannot be reconstructed later. The app NEVER sends a campaign.
--
-- RLS is ENABLED with NO policies — deny-by-default for anon/authenticated; only the
-- service-role server client (the two routes above) reaches it. unsubscribe_status is set to
-- 'unsubscribed' by the tokenized route and NOTHING in the app ever flips it back.

create table if not exists public.marketing_contacts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  consent_status text not null,          -- 'express' from the labeled signup box
  consent_ts timestamptz not null,       -- when consent was given (never overwritten on re-submit)
  source text not null,                  -- where the address came from (provenance for any future CRM import)
  unsubscribe_status text not null default 'active',  -- 'active' | 'unsubscribed' (irreversible via the route)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.marketing_contacts enable row level security;

-- READ-BACKS (run after):
--   select relrowsecurity from pg_class where relname='marketing_contacts';   -- must be true
--   select count(*) from public.marketing_contacts;                            -- 0 on a fresh run
--   select policyname from pg_policies where tablename='marketing_contacts';   -- must return ZERO rows
