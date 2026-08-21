-- ── ACQUISITION GRANTS (Phase 1) — AS APPLIED. ──
--
-- The founder created these tables 2026-08-21 via Supabase MCP from the design description (not
-- the earlier draft in this file); this file was then rewritten to match the LIVE database
-- exactly (verified live: information_schema, pg_constraint, pg_indexes), so the repo record and
-- production can never disagree. Phase 2 code is written against THIS shape.
--
-- Differences from the draft, all adopted (the live DB is the truth):
--   · token → code · kind → mode ('link'|'coupon') · granted_plan_type → grant_plan_type
--   · credits → grant_credits · label/referrer → note · disabled_at → revoked_at · no deleted_at
--   · NEW redemption_count counter (denormalized; maintained by the redemption RPC)
--   · attribution = clients.referred_by_grant_id (uuid FK — richer than the drafted text stamp;
--     clients.referred_by stays unwritten)
--   · redemption email uniqueness is PER GRANT — unique (grant_id, lower(email)) — not the
--     drafted global one-per-email/one-per-account grain. SURFACED TO THE FOUNDER as a material
--     difference (the ruling said "one person can't collect several"); upgrading to the global
--     grain is one index if ruled — see the Phase 2 report.
--   · NO redemption function was created — proposed separately as 20260821000400 (describe-and-
--     stopped): without it the counter, the max check and the plan-and-credit write have no
--     atomic home (the H6 pattern).

create table if not exists public.acquisition_grants (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  mode text not null check (mode in ('link', 'coupon')),
  grant_plan_type text not null
    check (grant_plan_type in ('single_99', 'single_149', 'growth_279', 'scale_499')),
  grant_credits integer not null default 1 check (grant_credits > 0),
  max_redemptions integer not null default 1 check (max_redemptions > 0),
  redemption_count integer not null default 0,
  expires_at timestamptz not null,
  created_by text not null,
  note text,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.grant_redemptions (
  id uuid primary key default gen_random_uuid(),
  grant_id uuid not null references public.acquisition_grants(id),
  client_id text not null,
  email text not null,
  redeemed_at timestamptz not null default now()
);

create unique index if not exists grant_redemptions_grant_email_uidx
  on public.grant_redemptions (grant_id, lower(email));
create index if not exists idx_grant_redemptions_grant on public.grant_redemptions (grant_id);
create index if not exists idx_acquisition_grants_code on public.acquisition_grants (code);

alter table public.acquisition_grants enable row level security;
alter table public.grant_redemptions enable row level security;

alter table public.clients add column if not exists referred_by_grant_id uuid references public.acquisition_grants(id);
create index if not exists idx_clients_referred_by_grant on public.clients (referred_by_grant_id)
  where referred_by_grant_id is not null;

-- READ-BACKS (all verified live 2026-08-21): RLS true + zero policies on both tables ·
-- grant_redemptions_grant_email_uidx present · clients.referred_by_grant_id present (uuid, FK).
