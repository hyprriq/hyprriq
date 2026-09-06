-- ══════════════════════════════════════════════════════════════════════════════════════════
-- PARTNER REQUEST APPROVAL (founder-ruled 2026-09-06) — ⛔ FOUNDER-RUN ONLY. Not applied by
-- any automated path. Until this runs, the Approve action on /admin/acquisition fails with an
-- honest "migration not run" message (23514 CHECK violation caught by name) — never silently.
--
-- THE RULING THIS IMPLEMENTS, in the founder's words: "The ruling was NO AUTO-GRANT. It was
-- never that approval should send nothing. What is broken is that approving does nothing at
-- all: I mark a request contacted, the system records it, and the requester hears nothing."
-- Approve = one click that creates the ruled grant, emails the requester the link, and marks
-- the request approved with a pointer to the grant it produced.
--
-- ⛔ STILL NO AUTO-ISSUE. The founder decides who gets one; nothing in the /partners form path
-- touches this. The 2026-08-22 rule "a request can never become a grant by code" narrows to
-- "…without an operator's click": the click is the decision, the code is only the courier.
--
-- WHAT CHANGES:
--   1. status gains 'approved'. 'contacted' leaves the CHECK — it was the word that made
--      approval look like it had sent something, and the table is empty (0 rows measured
--      2026-09-06), so no row is stranded by removing it.
--   2. grant_id — which grant an approval produced. NULL on declined/new rows, and the panel
--      renders an approved row with a NULL grant_id as the visible remnant of a failed
--      creation, never as success.

alter table public.partner_requests
  drop constraint if exists partner_requests_status_check;

alter table public.partner_requests
  add constraint partner_requests_status_check
  check (status in ('new', 'approved', 'declined'));

alter table public.partner_requests
  add column if not exists grant_id uuid references public.acquisition_grants(id);

-- READ-BACK VERIFICATION (run after; never trust "Success. No rows returned"):
--   select pg_get_constraintdef(oid) from pg_constraint
--     where conname = 'partner_requests_status_check';
--       -- CHECK ((status = ANY (ARRAY['new','approved','declined'])))
--   select count(*) from information_schema.columns
--     where table_name = 'partner_requests' and column_name = 'grant_id';             -- 1
-- FUNCTIONAL PROBE (proves 'approved' is accepted and 'contacted' refused, then cleans up):
--   insert into partner_requests (name, email, role, clients_band, status)
--     values ('Probe', 'probe-approval@example.com', 'va', '1-2', 'approved');
--   update partner_requests set status = 'contacted'
--     where email = 'probe-approval@example.com';
--       -- must ERROR: violates check constraint "partner_requests_status_check"
--   delete from partner_requests where email = 'probe-approval@example.com';
