-- ══════════════════════════════════════════════════════════════════════════════════════════
-- GRANT RECIPIENT BINDING + ISSUER BLOCK (founder-ruled 2026-09-07) — ⛔ FOUNDER-RUN ONLY.
-- ⚠ RUN THIS BEFORE DEPLOYING THE MATCHING CODE: the new Approve writes recipient_email at
-- creation; pre-migration that insert fails loud (42703) and the approval reverts. The reverse
-- order of the 20260906 migration, and stated because ordering bit us in both directions now.
--
-- WHY (the acquisition path's first real exercise, 2026-09-07): grant df72272a-… was issued to
-- g@hyprrbrands.com and redeemed by its ISSUER's admin account. Nothing refused: the intended
-- recipient existed only as free text in `note`, and created_by was never compared to the
-- redeemer. First-authenticated-click-wins was deliberate on 2026-08-21 — "the URL is the
-- secret", the founder chose the recipient by choosing where to paste — and became an omission
-- on 2026-09-06 the moment Approve made the SYSTEM choose where the link goes. This migration
-- makes the grant carry the decision the system already made.
--
-- ── TWO CHECKS, TWO LAWS — DO NOT FOLD THEM TOGETHER (founder-ruled, verbatim) ─────────────
-- "Binding is per-grant, self-dealing is per-system. A coupon may be unbound to recipients; it
-- is never redeemable by its creator." The next reader will be tempted to merge the issuer
-- check into the binding check because both refuse a redeemer — resist it: recipient_email is
-- NULLABLE (a campaign coupon legitimately has no single recipient) while the issuer block is
-- UNCONDITIONAL across both modes. One is a property of the grant; the other is a rule of the
-- system.
--
-- ALSO IN THIS FILE: billing_audit_event_check gains 'grant_redeemed'. The redemption path's
-- billing insert has violated that CHECK on every redemption since it was written (measured:
-- 1 real redemption, 0 grant_redeemed rows) and the fail-soft catch swallowed it — rule 14 in
-- a place we had not looked: a swallowed error inside a success path.

begin;

-- 1 ── the grant carries its intended recipient (nullable = unbound, the coupon-campaign case)
alter table public.acquisition_grants
  add column if not exists recipient_email text;

-- 2 ── the billing ledger accepts the event the redemption path has always tried to write
alter table public.billing_audit
  drop constraint if exists billing_audit_event_check;
alter table public.billing_audit
  add constraint billing_audit_event_check
  check (event in ('upgrade', 'downgrade', 'cancel', 'resume', 'new_subscription',
                   'one_time_purchase', 'grant_redeemed'));

-- 3 ── the RPC learns both laws
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

  -- THE ISSUER BLOCK — per-system, unconditional, BOTH modes (founder-ruled 2026-09-07).
  -- Checked before everything client-shaped: an issuer gets this word even if a binding or plan
  -- check would also have refused, because self-dealing is the finding, not the account state.
  if g.created_by = p_client_id then return 'issuer_cannot_redeem'; end if;

  -- THE BINDING — per-grant, only when a recipient was named at creation. The client's email is
  -- Clerk's verified identity, written at provisioning; the grant's is normalized at creation.
  -- Ordered before already_has_plan: "wrong account" is the actionable refusal (switch accounts),
  -- and a wrong-account holder must not learn the plan state of the account they hold.
  if g.recipient_email is not null and c_email <> g.recipient_email then
    return 'wrong_account';
  end if;

  -- The grant is an acquisition tool: a client who already has a plan is refused rather than
  -- downgrade-shadowed or double-funded (surfaced and accepted in the Phase 1 report).
  if c_plan is not null then return 'already_has_plan'; end if;

  begin
    insert into public.grant_redemptions (grant_id, client_id, email)
      values (g.id, p_client_id, c_email);
  exception when unique_violation then
    return 'email_already_used';
  end;

  update public.acquisition_grants
    set redemption_count = redemption_count + 1
    where id = g.id;

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
-- 1. Column exists:
--      select count(*) from information_schema.columns
--        where table_name='acquisition_grants' and column_name='recipient_email';    -- 1
-- 2. The billing CHECK accepts the redemption event (probe, then clean up):
--      insert into billing_audit (client_id, event, source, notes)
--        values ('probe', 'grant_redeemed', 'grant', 'constraint probe');
--      delete from billing_audit where client_id = 'probe';
-- 3. The RPC still refuses garbage as a WORD:
--      select public.redeem_acquisition_grant('no-such-code', 'no-such-client');
--        -- 'invalid_code'
-- 4. Definition sanity (security definer, pinned search_path):
--      select prosecdef, proconfig from pg_proc where proname='redeem_acquisition_grant';
--        -- t · {search_path=public}
-- 5. The issuer block, live (uses a real grant + its creator; read-only outcome, no state
--    change occurs on a refusal):
--      select public.redeem_acquisition_grant(
--        (select code from acquisition_grants order by created_at desc limit 1),
--        (select created_by from acquisition_grants order by created_at desc limit 1));
--        -- 'issuer_cannot_redeem' (or 'revoked'/'expired' if that grant is closed — both fine;
--        --  the point is it is NOT 'ok')
