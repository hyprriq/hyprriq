-- ── EMAIL IDEMPOTENCY BELT (ADR-EMAIL-001) — DESCRIBED-AND-STOPPED: the founder runs this. ──
--
-- email_log gains dedup_key: the by-construction idempotency for the Stripe-driven and
-- scheduled email classes (emails 4–7 BLOCK on this — payment-failed, low-credit ×2, renewal
-- reminder). One send per fact: dedup_key examples per the ADR —
--   payment_failed:{invoice_id} · cancelled:{subscription_id}
--   low_credit_{threshold}:{client_id}:{billing_cycle_anchor} · renewal:{subscription_id}:{period_end}
--   welcome:{user_id} (the belt behind the create-path guard already live)
-- The partial unique index turns "already sent" into a unique-violation the sender treats as
-- skip-silently — a daily job can fire forever and the key absorbs it.

alter table public.email_log add column if not exists dedup_key text;

create unique index if not exists email_log_template_dedup_key
  on public.email_log (template, dedup_key)
  where dedup_key is not null;

-- READ-BACKS (run after; both must return one row):
--   select column_name from information_schema.columns
--     where table_schema='public' and table_name='email_log' and column_name='dedup_key';
--   select indexname from pg_indexes
--     where schemaname='public' and tablename='email_log' and indexname='email_log_template_dedup_key';
