-- ⛔ DESCRIBE-AND-STOP — THE FOUNDER RUNS THIS (via Supabase MCP). Ruled 2026-08-21 after the
-- founder verified the live table: only single_99 (2), scale_499 (2), growth_279 (1) — no stray
-- values, so the constraint applies cleanly. single_149 included in the allowed set per ruling.
--
-- WHY: clients.plan_type was free text — nothing stopped a typo'd or invented plan from landing
-- in the column and silently disabling every gate that keys off it (Track 6 gates on
-- 'scale_499'; uploads gate on plan identity; the grant RPC now writes it). The registry in
-- lib/constants/plans.ts stays the single source of truth for what the values MEAN; this makes
-- the database refuse anything outside it.
--
-- NULL passes a CHECK by SQL semantics — deliberate and correct: a fresh signup has no plan yet.

begin;

alter table public.clients
  add constraint clients_plan_type_check
  check (plan_type in ('single_99', 'single_149', 'growth_279', 'scale_499'));

commit;

-- ── READ-BACKS (run after; all must hold) ────────────────────────────────────────────────────
--
-- 1. The constraint exists with the four-value set:
--      select pg_get_constraintdef(oid) from pg_constraint
--        where conrelid='public.clients'::regclass and conname='clients_plan_type_check';
--
-- 2. A stray value is refused:
--      update public.clients set plan_type='not_a_plan' where false;  -- (shape check only)
--      -- or safely: insert into public.clients (id, email, plan_type)
--      --   values ('constraint-probe', 'x@x', 'not_a_plan');
--      -- expect: check-constraint violation; then no row exists to clean up.
--
-- 3. NULL still passes (fresh signups):
--      select count(*) from public.clients where plan_type is null;   -- runs without error
