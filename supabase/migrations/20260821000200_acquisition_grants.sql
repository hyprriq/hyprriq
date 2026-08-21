-- ⛔ DESCRIBE-AND-STOP — THE FOUNDER RUNS THIS (via Supabase MCP, as usual). Phase 1 of the
-- acquisition-grant build (founder-ruled 2026-08-21; redemption-limit ruling: BOTH layers).
-- Phase 2 (code) lands only after this is applied and read back.
--
-- ── THE RULED DESIGN THIS IMPLEMENTS ─────────────────────────────────────────────────────────
-- One mechanism, two delivery modes: an INVITE LINK (unguessable token in a URL, auto-applies at
-- registration) and a COUPON CODE (the same grant, typed at checkout, broadcastable). Grant
-- value: ONE free full report — all five assessment areas plus category compliance — which by
-- the plan-and-credit-together ruling means the redemption sets plan_type (default 'scale_499',
-- the full-report tier) AND adds 1 credit in the SAME atomic step: a bare credit on a plan-less
-- account would deliver the $99 three-area report, the exact outcome the ruling rejected.
-- plan_category is forced to 'one_time' regardless of the granted tier: no billing tail, no
-- subscription machinery, no renewal emails (every scheduled sender keys off the COLUMN).
-- Expiry: 30 days from issue (default in the schema; the admin UI can shorten, never remove).
-- Attribution now, commission later: redemption stamps clients.referred_by (column already
-- exists, unwritten until now) with the grant's referrer — a field, not a commission system.
--
-- ── REDEMPTION LIMITS (founder-ruled 2026-08-21: BOTH) ───────────────────────────────────────
--   1. Per grant: max_redemptions — a leaked link cannot be redeemed a hundred times. DEFAULT 1
--      (the tester grants about to be sent); settable at creation per campaign.
--   2. Per email: ONE grant per email address, ever — one person cannot collect several under
--      the same address. The redeeming client's email is captured on the redemption row and a
--      unique index on lower(redeemer_email) enforces it (partial: rows with an empty email —
--      lazy-provisioned accounts Clerk gave no address — fall through to layer 3 rather than
--      colliding with each other).
--   3. Per account: ONE grant per client account, ever — grant_redemptions.client_id is UNIQUE.
--   4. In the RPC: a client who already HAS a plan is refused ('already_has_plan') — the grant
--      is an acquisition tool; an existing client redeeming one either downgrade-shadows their
--      tier or hands a paying client a free credit.
--
-- RLS: ENABLED, ZERO policies on both tables — service-role only, like marketing_contacts.
-- The RPC follows H6: ALL credit arithmetic in atomic SQL; row-locked so two concurrent
-- redemptions of the last slot cannot both succeed.

begin;

create table if not exists public.acquisition_grants (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('invite_link', 'coupon_code')),
  token text not null unique,            -- link slug (unguessable) or coupon code (stored uppercase)
  label text not null,                   -- admin display name, e.g. "Jan — BBQ influencer"
  referrer text,                         -- who redemptions are attributed to; defaults to label at redemption
  granted_plan_type text not null default 'scale_499'
    check (granted_plan_type in ('single_99', 'single_149', 'growth_279', 'scale_499')),
  credits integer not null default 1 check (credits between 1 and 12),
  max_redemptions integer not null default 1 check (max_redemptions between 1 and 1000),
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_by text not null,              -- operator clerk id
  disabled_at timestamptz,               -- admin kill switch, immediate
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.grant_redemptions (
  id uuid primary key default gen_random_uuid(),
  grant_id uuid not null references public.acquisition_grants(id),
  client_id text not null references public.clients(id),
  redeemer_email text not null default '',   -- captured at redemption; the one-per-email grain
  redeemed_at timestamptz not null default now()
);

-- Limit 3: one acquisition grant per client account, EVER.
create unique index if not exists grant_redemptions_one_per_client_uidx
  on public.grant_redemptions (client_id);
-- Limit 2: one acquisition grant per EMAIL, ever (partial: empty emails fall through to limit 3).
create unique index if not exists grant_redemptions_one_per_email_uidx
  on public.grant_redemptions (lower(redeemer_email)) where redeemer_email <> '';
create index if not exists grant_redemptions_grant_idx on public.grant_redemptions (grant_id);

alter table public.acquisition_grants enable row level security;
alter table public.grant_redemptions enable row level security;

-- ── THE ATOMIC REDEMPTION (H6 pattern: credit arithmetic lives in SQL, race-free) ────────────
-- Returns a status word the route maps to client-facing copy:
--   'ok' · 'invalid_token' · 'disabled' · 'expired' · 'exhausted' · 'no_client' ·
--   'already_has_plan' · 'already_redeemed' · 'email_already_used'
create or replace function public.redeem_acquisition_grant(p_token text, p_client_id text)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  g public.acquisition_grants%rowtype;
  c_plan text;
  c_email text;
  redemption_count integer;
begin
  select * into g from public.acquisition_grants
    where token = p_token and deleted_at is null
    for update;                       -- serializes concurrent redemptions of the same grant
  if not found then return 'invalid_token'; end if;
  if g.disabled_at is not null then return 'disabled'; end if;
  if g.expires_at <= now() then return 'expired'; end if;

  select count(*) into redemption_count from public.grant_redemptions where grant_id = g.id;
  if redemption_count >= g.max_redemptions then return 'exhausted'; end if;

  select plan_type, lower(trim(coalesce(email, ''))) into c_plan, c_email
    from public.clients where id = p_client_id and deleted_at is null for update;
  if not found then return 'no_client'; end if;
  if c_plan is not null then return 'already_has_plan'; end if;
  if exists (select 1 from public.grant_redemptions where client_id = p_client_id) then
    return 'already_redeemed';
  end if;
  if c_email <> '' and exists (
    select 1 from public.grant_redemptions where lower(redeemer_email) = c_email
  ) then
    return 'email_already_used';
  end if;

  insert into public.grant_redemptions (grant_id, client_id, redeemer_email)
    values (g.id, p_client_id, c_email);

  -- Plan AND credit together (the ruling): the full-report tier, one-time category (no billing
  -- tail), credits added — and attribution stamped, set-if-null so an existing referrer is
  -- never overwritten.
  update public.clients set
    plan_type = g.granted_plan_type,
    plan_category = 'one_time',
    billing_status = 'active',
    credits_available = credits_available + g.credits,
    referred_by = coalesce(referred_by, g.referrer, g.label)
  where id = p_client_id;

  return 'ok';
end
$function$;

commit;

-- ── READ-BACKS (run after; all must hold) ────────────────────────────────────────────────────
--
-- 1. Both tables exist with RLS on and ZERO policies:
--      select relname, relrowsecurity from pg_class
--        where relname in ('acquisition_grants','grant_redemptions');       -- both true
--      select policyname from pg_policies
--        where tablename in ('acquisition_grants','grant_redemptions');     -- ZERO rows
--
-- 2. BOTH ruled redemption-limit indexes exist:
--      select indexname from pg_indexes where tablename='grant_redemptions'
--        and indexname in ('grant_redemptions_one_per_client_uidx',
--                          'grant_redemptions_one_per_email_uidx');         -- TWO rows
--
-- 3. The RPC exists and refuses garbage without erroring:
--      select public.redeem_acquisition_grant('no-such-token', 'no-such-client');
--        -- expect: 'invalid_token' (a plain word, never an exception)
--
-- 4. The check constraints hold:
--      select conname from pg_constraint
--        where conrelid='public.acquisition_grants'::regclass and contype='c';
--        -- expect rows covering kind, granted_plan_type, credits, max_redemptions
