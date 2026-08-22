-- ══════════════════════════════════════════════════════════════════════════════════════════
-- PARTNER REQUESTS (founder-ruled 2026-08-22, item 1 of the four-item batch) — ⛔ FOUNDER-RUN
-- ONLY. Not applied by any automated path. Until this runs, /api/partner-request answers 503
-- and the /partners form shows the honest "not open yet" line (the newsletter fail-soft
-- pattern); the admin panel shows "table not migrated yet". Nothing breaks.
--
-- WHAT THIS IS: the /partners in-page request form files a REQUEST here — a row, never a grant.
-- Ruled hard: nothing in this flow creates, reserves, or promises a grant. The founder reads
-- requests in /admin/acquisition and issues grants by hand from the existing grants panel.
--
-- SHAPE: one open request per address (partial unique on lower(email) WHERE status='new') — a
-- resubmission while a request is pending updates nothing and makes no admin noise; after a
-- decision (contacted/declined) the same address may request again. RLS ENABLED with ZERO
-- policies — service-role only, exactly the marketing_contacts posture.

create table if not exists public.partner_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  -- What they do — mirrors ROLE_OPTIONS in lib/content/partnerRequest.ts (the one option source).
  role text not null check (role in ('va', 'agency', 'consultant', 'other')),
  -- Rough sourcing volume — mirrors CLIENTS_BAND_OPTIONS in the same module.
  clients_band text not null check (clients_band in ('1-2', '3-10', '11-50', '50+')),
  note text,
  status text not null default 'new' check (status in ('new', 'contacted', 'declined')),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

-- One OPEN request per address; decided requests free the address for a future ask.
create unique index if not exists idx_partner_requests_open_email
  on public.partner_requests (lower(email)) where status = 'new';

alter table public.partner_requests enable row level security;

-- READ-BACK VERIFICATION (run after; never trust "Success. No rows returned"):
--   select relrowsecurity from pg_class where relname = 'partner_requests';          -- true
--   select policyname from pg_policies where tablename = 'partner_requests';         -- ZERO rows
--   select count(*) from information_schema.columns
--     where table_name = 'partner_requests';                                         -- 9
--   select indexname from pg_indexes
--     where tablename = 'partner_requests'
--       and indexname = 'idx_partner_requests_open_email';                           -- one row
-- FUNCTIONAL PROBE (proves the one-open-request rule, then cleans up):
--   insert into partner_requests (name, email, role, clients_band) values ('Probe', 'probe@example.com', 'va', '1-2');
--   insert into partner_requests (name, email, role, clients_band) values ('Probe', 'PROBE@example.com', 'va', '1-2');
--     -- must ERROR: duplicate key value violates unique constraint (case-folded)
--   delete from partner_requests where email = 'probe@example.com';
