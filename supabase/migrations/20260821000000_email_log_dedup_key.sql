-- ── EMAIL IDEMPOTENCY BELT (ADR-EMAIL-001) — AS APPLIED. ──
--
-- The founder ran this 2026-08-21 via Supabase MCP (not this file); this file was then rewritten
-- to match the LIVE database exactly (verified live: information_schema + pg_indexes), so the
-- repo record and production can never disagree. Differences from the described version, both
-- founder improvements kept: the index carries a `deleted_at is null` predicate (a soft-deleted
-- ledger row frees its key) and the `_uidx` suffix.
--
-- email_log.dedup_key is the by-construction idempotency for the Stripe-driven and scheduled
-- email classes (emails 4–7). One send per fact — dedup_key shapes per the ADR:
--   payment_failed:{invoice_id} · cancelled:{subscription_id}
--   low_credit_{threshold}:{client_id}:{cycle_anchor} · renewal:{client_id}:{renewal_date}
--   welcome:{user_id} (belt behind the create-path guard)
-- A unique-violation means "already sent" and the sender skips silently.

alter table public.email_log add column if not exists dedup_key text;

create unique index if not exists email_log_template_dedup_key_uidx
  on public.email_log (template, dedup_key)
  where dedup_key is not null and deleted_at is null;

-- READ-BACKS (both verified live 2026-08-21):
--   select column_name from information_schema.columns
--     where table_schema='public' and table_name='email_log' and column_name='dedup_key';
--   select indexname from pg_indexes
--     where schemaname='public' and tablename='email_log' and indexname='email_log_template_dedup_key_uidx';
