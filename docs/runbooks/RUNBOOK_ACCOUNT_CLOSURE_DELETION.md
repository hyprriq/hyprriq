# Runbook — deletion within 30 days of account closure

**Who runs this:** the founder, by hand. **When:** every account closure — there is no automation
behind this promise; forgetting it is the breach.
**The commitment (published):** Data Policy "How long we keep it" + "What happens when you close
your account", Refund Policy §1 — reports, uploads, case records and account details removed
**within 30 days after the account closes**. Transaction/invoice records are the only exception
(kept 7 years — they live in Stripe and in `billing_audit`, which the delete flow retains by design).

## When the 30-day clock starts

- A subscriber cancels → clock starts at the **end of the paid period** (their plan runs to the end,
  credits usable until then — Refund Policy §1).
- A dormant one-time account got the 24-month notice and 30 more days passed with no response →
  clock starts the day you close it.
- A direct "delete my data" email to legal@ → the policy promises deletion **and confirmation
  within 30 days** of the ask. Same steps, plus a confirmation reply at the end.

Put a dated entry in your own calendar the day any of these happens. That calendar entry is the
mechanism — nothing else will remind you.

## Steps

1. **Find the account:** /admin/clients → open the client. Note their email exactly (you will type
   it to confirm) and whether they have delivered reports.
2. **Check the download warning happened.** The cancel flow prompts them to download reports; for a
   dormancy closure the 24-month notice email was the warning (`email_log` template
   `dormant_notice`). Don't delete the same day they cancel — the paid period runs first.
3. **Run the delete:** on the client's admin page use **Delete this client** — type their email to
   confirm. This one action (route: `app/api/admin/clients/[id]/route.ts`) removes: storage files in
   `case-documents` and `reports`, `uploaded_files`, `cases` and everything cascading from them,
   the `clients` row, and the Clerk login. It **retains** `billing_audit` (with an email snapshot) and
   writes the `admin_audit_log` record that proves who deleted what, when.
4. **If the delete fails with a foreign-key error naming `intelligence_events`:** expected for any
   client whose research completed — the corpus ledger references their cases with ON DELETE
   RESTRICT and is append-only at the DB. Today's manual path (Supabase SQL editor, in this order):

   ```sql
   -- 1) see what blocks (their case ids)
   select ie.id, ie.case_id from intelligence_events ie
     join cases c on c.id = ie.case_id where c.client_id = '<CLIENT_ID>';
   -- 2) founder escape hatch (documented in migration 20260708000000): lift the append-only
   --    trigger, remove their events, put the trigger back
   alter table intelligence_events disable trigger intelligence_events_no_mutate;
   delete from intelligence_events using cases c
     where intelligence_events.case_id = c.id and c.client_id = '<CLIENT_ID>';
   alter table intelligence_events enable trigger intelligence_events_no_mutate;
   -- 3) read-back: expect zero rows
   select count(*) from intelligence_events ie
     join cases c on c.id = ie.case_id where c.client_id = '<CLIENT_ID>';
   ```

   Then run step 3 again. (This costs corpus events. A schema change that would keep the corpus
   rows while freeing the delete is described in the 2026-08-22 describe-and-stop block, section C —
   your call, not yet ruled.)
5. **Scrub the send ledger** — the delete button does NOT do this, and `email_log.recipient` is an
   account detail under the policy:

   ```sql
   update email_log set recipient = 'deleted-account' where recipient = '<their email>';
   select count(*) from email_log where recipient = '<their email>';   -- read-back: 0
   ```
6. **Marketing list check:** if they asked for full deletion and `marketing_contacts` has a
   **subscribed** row for the address, delete that row. An **unsubscribed** row stays forever — the
   policy says so, it is what keeps them off future lists.

   ```sql
   select consent_status from marketing_contacts where email = '<their email>';
   ```
7. **Read-backs — run all four, expect zero rows each.** "Success. No rows returned" from a delete
   proves nothing; these counts do:

   ```sql
   select count(*) from clients where id = '<CLIENT_ID>';
   select count(*) from cases where client_id = '<CLIENT_ID>';
   select count(*) from uploaded_files where client_id = '<CLIENT_ID>';
   select count(*) from email_log where recipient = '<their email>';
   ```
8. **Record it.** The `admin_audit_log` row from step 3 is the proof of the act; for a direct
   deletion request, also reply to the requester confirming completion (the policy promises this
   within 30 days). Nothing else to write anywhere.

## What NOT to delete

- `billing_audit` rows (retained with snapshot — the 7-year transaction record) — the delete flow
  already protects them; never clean them up by hand.
- Stripe's own records — never touch; they ARE the tax/accounting record.
- Unsubscribed `marketing_contacts` rows — permanent by policy.
