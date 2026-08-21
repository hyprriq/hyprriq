-- ⛔ DESCRIBE-AND-STOP — THE FOUNDER RUNS THIS (via Supabase MCP). The atomic redemption for the
-- founder-created grant tables (20260821000200 as-applied shape). Written 2026-08-21.
--
-- WHY IT MUST BE SQL (H6, the house pattern — all credit arithmetic in atomic SQL): the live
-- schema has redemption_count, a max_redemptions cap, and the plan-and-credit-together ruling —
-- three writes that in application code would be check-then-write races (two concurrent
-- redemptions of a 1-cap grant could both pass the check; the counter drifts from the rows).
-- This function row-locks the grant, so the last slot can only be taken once, the counter can
-- never disagree with the redemption rows, and the client's plan+credit land in the same
-- transaction as the redemption that grants them.
--
-- Phase 2 code calls THIS and nothing else writes these tables. Until it is run, the redemption
-- routes answer a plain "not available yet" (fail-soft, the newsletter pattern) — nothing breaks.
--
-- Status words returned (the route maps them to client-facing copy):
--   'ok' · 'invalid_code' · 'revoked' · 'expired' · 'exhausted' · 'no_client' ·
--   'already_has_plan' · 'email_already_used'

begin;

create or replace function public.redeem_acquisition_grant(p_code text, p_client_id text)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  g public.acquisition_grants%rowtype;
  c_plan text;
  c_email text;
begin
  select * into g from public.acquisition_grants
    where code = p_code
    for update;                          -- serializes concurrent redemptions of the same grant
  if not found then return 'invalid_code'; end if;
  if g.revoked_at is not null then return 'revoked'; end if;
  if g.expires_at <= now() then return 'expired'; end if;
  if g.redemption_count >= g.max_redemptions then return 'exhausted'; end if;

  select plan_type, lower(trim(coalesce(email, ''))) into c_plan, c_email
    from public.clients where id = p_client_id and deleted_at is null for update;
  if not found then return 'no_client'; end if;
  -- The grant is an acquisition tool: a client who already has a plan is refused rather than
  -- downgrade-shadowed or double-funded (surfaced and accepted in the Phase 1 report).
  if c_plan is not null then return 'already_has_plan'; end if;

  begin
    insert into public.grant_redemptions (grant_id, client_id, email)
      values (g.id, p_client_id, c_email);
  exception when unique_violation then
    -- Whatever uniqueness grain the indexes enforce (per-grant today; global if later ruled),
    -- a duplicate lands here as a word, never an exception to the caller.
    return 'email_already_used';
  end;

  update public.acquisition_grants
    set redemption_count = redemption_count + 1
    where id = g.id;

  -- Plan AND credit together (the ruling): the full-report tier, one-time category (no billing
  -- tail — every scheduled sender keys off the COLUMN), credits added, attribution stamped
  -- set-if-null on the founder's referred_by_grant_id FK.
  update public.clients set
    plan_type = g.grant_plan_type,
    plan_category = 'one_time',
    billing_status = 'active',
    credits_available = credits_available + g.grant_credits,
    referred_by_grant_id = coalesce(referred_by_grant_id, g.id)
  where id = p_client_id;

  return 'ok';
end
$function$;

commit;

-- ── READ-BACKS (run after; all must hold) ────────────────────────────────────────────────────
--
-- 1. The RPC exists and refuses garbage as a WORD, never an exception:
--      select public.redeem_acquisition_grant('no-such-code', 'no-such-client');
--        -- expect: 'invalid_code'
--
-- 2. Definition sanity (security definer, pinned search_path):
--      select prosecdef, proconfig from pg_proc where proname='redeem_acquisition_grant';
--        -- expect: t · {search_path=public}
