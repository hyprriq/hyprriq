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
--   1. status gains 'approved'.
--   2. grant_id — which grant an approval produced. NULL on declined/new rows, and the panel
--      renders an approved row with a NULL grant_id as the visible remnant of a failed
--      creation, never as success.
--
-- ⚠ 'contacted' STAYS IN THE CHECK, AND THE FOUNDER'S OWN REVIEW IS WHY THIS FILE DIDN'T FAIL.
-- The first draft dropped it, written against a table measured empty on 2026-09-06 morning.
-- By evening ONE REAL ROW held status='contacted' (the founder's test, decided 16:35Z), and
-- ADD CONSTRAINT validates existing rows — the draft would have errored mid-run. The founder
-- caught the stale premise before executing: "That was true when you wrote it and is not true
-- now." The alternatives were all worse than keeping the value:
--   · backfill → 'declined' rewrites the founder's decision; → 'approved' trips the panel's
--     "approved but no grant attached" failure warning — a false alarm manufactured by a
--     migration;
--   · NOT VALID leaves the constraint permanently unvalidated — an asterisk forever.
-- So 'contacted' remains a VALID-BUT-UNISSUABLE legacy value: the API accepts only
-- approve/decline, the panel has no button for it, and the TS type marks it legacy-read-only.
-- The CHECK's job is refusing garbage, not smoothing recorded history — the divergence law,
-- one layer down.

alter table public.partner_requests
  drop constraint if exists partner_requests_status_check;

alter table public.partner_requests
  add constraint partner_requests_status_check
  check (status in ('new', 'approved', 'declined', 'contacted'));

alter table public.partner_requests
  add column if not exists grant_id uuid references public.acquisition_grants(id);

-- READ-BACK VERIFICATION (run after; never trust "Success. No rows returned"):
--   select pg_get_constraintdef(oid) from pg_constraint
--     where conname = 'partner_requests_status_check';
--       -- CHECK ((status = ANY (ARRAY['new','approved','declined','contacted'])))
--   select convalidated from pg_constraint
--     where conname = 'partner_requests_status_check';                               -- true
--   select count(*) from information_schema.columns
--     where table_name = 'partner_requests' and column_name = 'grant_id';            -- 1
--   select status, count(*) from partner_requests group by status;
--       -- the 2026-09-06 'contacted' test row survives untouched: contacted | 1
-- FUNCTIONAL PROBE (proves 'approved' is accepted and garbage refused, then cleans up):
--   insert into partner_requests (name, email, role, clients_band, status)
--     values ('Probe', 'probe-approval@example.com', 'va', '1-2', 'approved');
--   update partner_requests set status = 'nonsense'
--     where email = 'probe-approval@example.com';
--       -- must ERROR: violates check constraint "partner_requests_status_check"
--   delete from partner_requests where email = 'probe-approval@example.com';
--
-- OPTIONAL, NOT PART OF THE MIGRATION — only if you want your test row back in the queue so
-- Approve's first real exercise can run against it:
--   update partner_requests set status = 'new', decided_at = null where status = 'contacted';
