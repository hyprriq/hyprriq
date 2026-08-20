-- ⛔ DESCRIBE-AND-STOP — THE FOUNDER RUNS THIS. Written 2026-08-20 by the RLS adversarial pass.
--
-- ── THE FINDING (latent today, live the moment Clerk→GUC wiring lands) ──────────────────────
--
-- Policy `clients_self` is:
--     FOR ALL USING (id = get_current_user_id())      -- no WITH CHECK, no column restriction
--
-- FOR ALL includes UPDATE, and the `clients` row carries `role` and `is_admin` — the very columns
-- `is_current_user_admin()` reads. So a client who can satisfy `id = get_current_user_id()` can
-- UPDATE THEIR OWN ROW TO role='founder' and become an admin over every table in the schema.
--
-- PROVEN IN-DATABASE (transaction rolled back, nothing changed):
--     set local role authenticated;
--     select set_config('app.current_user_id','<a real client id>', true);
--     update clients set role='founder' where id='<that id>';   -- 1 row
--     select is_current_user_admin();                            -- true
--     -- then: 44 cases, 88 synthesis rows, 183 audit rows all visible
--
-- NOT REACHABLE TODAY, and the reason matters: nothing sets `app.current_user_id` for client
-- traffic (no pgrst.db_pre_request hook is configured), so `get_current_user_id()` returns NULL
-- for every anon/authenticated request and the policy grants nothing. The live anon suite
-- (scripts/rls-adversarial.ts) confirms it: zero rows on every client table, writes refused,
-- header injection ignored. An over-the-wire PATCH setting role='founder' returned 204 having
-- matched ZERO rows — verified against the row afterwards; the client's role is still 'client'.
--
-- ⚠ IT GOES LIVE THE INSTANT ANYONE WIRES THE GUC — which is the obvious next step to make these
-- policies functional for client traffic. Fix it BEFORE that, not after.
--
-- ── THE FIX: a self-policy that cannot touch the columns that grant power ────────────────────
-- Split the blanket FOR ALL into SELECT + a column-safe UPDATE. A client may read their own row
-- and update it; they may never change what role that row carries. WITH CHECK re-asserts the
-- ownership predicate on the NEW row too, so a client cannot rewrite `id` to point at somebody
-- else either (the same class as the case-theft attempt, which RLS already refused).

begin;

drop policy if exists clients_self on public.clients;

create policy clients_self_read on public.clients
  for select
  using (id = get_current_user_id());

create policy clients_self_update on public.clients
  for update
  using (id = get_current_user_id())
  with check (
    id = get_current_user_id()
    -- The power columns are frozen against self-edit: the values must be UNCHANGED from what the
    -- row already carries. Role changes are an admin action (the admin policy still covers them).
    and role is not distinct from (select c.role from public.clients c where c.id = get_current_user_id())
    and is_admin is not distinct from (select c.is_admin from public.clients c where c.id = get_current_user_id())
  );

commit;

-- ── READ-BACKS (run after; both must hold) ──────────────────────────────────────────────────
--
-- 1. The policies are shaped as intended:
--      select policyname, cmd, qual, with_check from pg_policies
--       where schemaname='public' and tablename='clients' order by policyname;
--    Expect: clients_admin (ALL) · clients_self_read (SELECT) · clients_self_update (UPDATE with a
--    with_check naming role and is_admin).
--
-- 2. THE ESCALATION IS REFUSED (rolled back — changes nothing):
--      begin;
--        set local role authenticated;
--        select set_config('app.current_user_id','user_3FUum7osm2AAO40gFPqixhC4jgh', true);
--        update clients set role='founder' where id='user_3FUum7osm2AAO40gFPqixhC4jgh';
--        -- expect: ERROR  new row violates row-level security policy for table "clients"
--      rollback;
--
-- 3. A LEGITIMATE self-edit still works (rolled back):
--      begin;
--        set local role authenticated;
--        select set_config('app.current_user_id','user_3FUum7osm2AAO40gFPqixhC4jgh', true);
--        update clients set company_name='Test Co' where id='user_3FUum7osm2AAO40gFPqixhC4jgh';
--        -- expect: UPDATE 1
--      rollback;
--
-- Then re-run the suite:  npx tsx --tsconfig tsconfig.json --env-file=.env.local scripts/rls-adversarial.ts
