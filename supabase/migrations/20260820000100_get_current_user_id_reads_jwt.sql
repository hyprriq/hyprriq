-- ⛔ DESCRIBE-AND-STOP — THE FOUNDER RUNS THIS, and only AFTER the two dashboard steps in
-- ADR-RLS-001 (Clerk confirmed as a Supabase third-party auth provider). Written 2026-08-20.
--
-- ── WHAT THIS CHANGES ────────────────────────────────────────────────────────────────────────
-- get_current_user_id() today reads ONLY a GUC:
--     SELECT current_setting('app.current_user_id', true)
-- The GUC cannot be set safely per-request over PostgREST's pooled connections (ADR-RLS-001:
-- session-scope leaks across tenants, txn-scope never reaches the query). So client identity must
-- come from the VERIFIED Clerk JWT, which PostgREST exposes at request.jwt.claims once the
-- third-party auth provider is configured. This teaches the function to read the JWT `sub` FIRST,
-- keeping the GUC as a fallback so any legitimate server-side txn-local path is unaffected.
--
-- ── WHY IT IS SAFE TO RUN EVEN BEFORE THE PROVIDER IS ON ─────────────────────────────────────
-- With no provider, request.jwt.claims is NULL for client traffic → the JWT branch yields NULL →
-- the function falls back to the GUC and behaves EXACTLY as today (NULL for anon/authenticated,
-- every client policy grants nothing). The anon adversarial suite stays green. It only becomes
-- LIVE once a verified Clerk token starts arriving.
--
-- ── WHY plpgsql WITH AN EXCEPTION GUARD (a deliberate change from the SQL original) ──────────
-- This function is called by EVERY RLS policy. If it can throw, every policy check throws and the
-- WHOLE portal goes down. request.jwt.claims::jsonb would error on any non-JSON value. The guard
-- makes a malformed/empty claim degrade to "no identity" (→ GUC fallback → NULL), never an error.
-- Same hardening as before otherwise: STABLE, SECURITY DEFINER, search_path pinned to public.

begin;

create or replace function public.get_current_user_id()
returns text
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  claims text := current_setting('request.jwt.claims', true);
  sub text;
begin
  -- The VERIFIED Clerk JWT subject, when a third-party token is present.
  if claims is not null and claims <> '' then
    begin
      sub := nullif(claims::jsonb ->> 'sub', '');
    exception when others then
      sub := null;  -- malformed claims must NEVER take the portal down
    end;
  end if;
  -- Fall back to the GUC (legitimate server-side txn-local callers; back-compat).
  return coalesce(sub, nullif(current_setting('app.current_user_id', true), ''));
end
$function$;

commit;

-- ── READ-BACKS (run after; all must hold) ────────────────────────────────────────────────────
--
-- 1. GUC path parity (pre-provider behavior unchanged):
--      begin;
--        select set_config('app.current_user_id','user_TEST', true);
--        select public.get_current_user_id();          -- expect: user_TEST
--      rollback;
--
-- 2. No JWT, no GUC → NULL, never an error:
--      select public.get_current_user_id();            -- expect: NULL
--
-- 3. The anon adversarial suite is still green:
--      npx tsx --tsconfig tsconfig.json --env-file=.env.local scripts/rls-adversarial.ts
--
-- 4. AFTER the provider is on, a real Clerk token sees ONLY its own rows — proven by the JWT
--    probe Claude lands with createUserScopedClient() (ADR-RLS-001 step 5).
