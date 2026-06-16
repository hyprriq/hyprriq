# HyprrIQ — Deployment Runbook (Session 1)

**Status: VERIFIED LIVE — confirmed 2026-06-16 via `/api/health`:**
```json
{"status":"ok","checks":{"database":{"ok":true},"storage":{"ok":true}}}
```

| Thing | State |
|---|---|
| Code (scaffold, schema file, clients, proxy) | ✅ built, tested, pushed to `staging` (`de08e9a`) |
| Database **applied to Supabase** | ✅ confirmed — `/api/health` queries `clients` live |
| Storage buckets (`case-documents`, `reports`) | ✅ confirmed present |
| Env vars **in Vercel** | ✅ confirmed — deploy booted + Supabase service-role key resolved |
| Vercel staging deploy green | ✅ confirmed |

Session 1 infrastructure is fully live. Steps below are kept as a runbook/reference for redeploys or a fresh environment — not action items anymore.

---

## STEP 1 — Apply the database migration to Supabase  (REQUIRED)

The schema is in `supabase/migrations/20260601000000_initial_schema.sql`. Pick ONE:

**Option A — Dashboard (simplest, no CLI login):**
1. supabase.com → `hyprriq` project → **SQL Editor** → New query.
2. Paste the **entire** migration file. Run.
3. Expect "Success. No rows returned."

**Option B — CLI:**
```bash
cd portal
npx supabase login                                   # opens browser
npx supabase link --project-ref mjkacjrrrmlwlwkienvq
npx supabase db push
```

Then run the verification queries in **STEP 3**.

---

## STEP 2 — Add environment variables to Vercel  (REQUIRED for staging)

Yes — **every variable in `.env.local` must also exist in Vercel**, or the deployed app can't boot. The Clerk keys are needed at build *and* runtime; without them the build fails.

Vercel → `hyprriq` project → **Settings → Environment Variables**. Add each for the **Preview** (staging) environment (and Production later):

| Variable | Needed for | Public? |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk — **build + runtime** | yes (build-inlined) |
| `CLERK_SECRET_KEY` | Clerk — runtime | no |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase clients | yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase browser client | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase server/admin | **no — secret** |
| `INNGEST_EVENT_KEY` | Inngest send | no |
| `INNGEST_SIGNING_KEY` | Inngest `/api/inngest` serve | no |

Notes:
- The 3 Supabase vars may already be present if the Vercel↔Supabase connector ran earlier (Roadmap A2). Confirm; add any missing.
- After adding/changing env vars, **trigger a redeploy** (Vercel → Deployments → Redeploy) — env changes don't apply to an existing build.
- `NEXT_PUBLIC_*` are inlined into the client bundle. The non-public ones are server-only — never expose `SUPABASE_SERVICE_ROLE_KEY` or `CLERK_SECRET_KEY` to the browser.

---

## STEP 3 — Verify the database (after Step 1)

Run in Supabase → SQL Editor:

```sql
-- (a) Tables — expect EXACTLY 20.
-- NOTE: filter to BASE TABLE, else the 2 views make it read 22.
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- (b) RLS — expect rowsecurity = true for all 20.
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' ORDER BY tablename;

-- (c) Indexes — expect 35+.
SELECT indexname, tablename FROM pg_indexes
WHERE schemaname = 'public' ORDER BY tablename, indexname;

-- (d) Clerk-compatible id + case_number trigger:
INSERT INTO clients (id, email, billing_status)
VALUES ('user_test_clerk001', 'verify@test.com', 'active');
INSERT INTO cases (client_id, submission_type, vendor_name)
VALUES ('user_test_clerk001', 'full_review', 'Test Vendor Co');
SELECT id, case_number, client_id FROM cases WHERE client_id = 'user_test_clerk001';
--   case_number should look like AWI-2606-001 ; client_id is text.
DELETE FROM cases    WHERE client_id = 'user_test_clerk001';
DELETE FROM clients  WHERE id        = 'user_test_clerk001';
```

Spot-check in **Table Editor**: 20 tables; `clients.id` type = **text** (not uuid); `cases.case_number` has a **UNIQUE** constraint; RLS shows **enabled** on every table. (RLS is on if the migration ran — it's `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for all 20.)

---

## STEP 4 — Verify the Vercel staging deploy (after Step 2 redeploy)

- Vercel → `hyprriq` → Deployments → the `staging` build should be **green**.
- The preview URL is auto-generated (e.g. `hyprriq-git-staging-<scope>.vercel.app`) — **copy the real one from the dashboard**; `staging-hyprriq.vercel.app` is a guess and may not resolve.
- Visiting `/` shows the (still default) marketing page — that's expected. `(portal)`/`(admin)` have no pages yet.
- Hit `https://<preview-url>/api/health` → should return `{"status":"ok","timestamp":"..."}`.

---

## STEP 5 — Optional now, REQUIRED by Session 3

These are not consumed by any Session 1 code, so they don't block the deploy. Do them when convenient (or at Session 3).

**PgBouncer / connection pooling (Tech Arch §2):**
- Settings → Database → Connection Pooling → enable, **Transaction** mode.
- The pooled connection string can be saved as `DATABASE_URL` in `.env.local` for later use. ⚠️ **Nothing reads `DATABASE_URL` yet** — supabase-js talks to the REST API, not the pooler. It becomes relevant when we add a direct Postgres client (e.g. the `SET LOCAL app.current_user_id` RLS bridge). Setting it now is harmless and forward-looking.

**Storage buckets (needed for Session 3 upload):**
- Storage → New Bucket → `case-documents` → **PRIVATE**.
- Storage → New Bucket → `reports` → **PRIVATE**.
- ⚠️ **Do NOT add the `auth.uid()`-style storage RLS policy described in the original plan.** With Clerk there is no Supabase Auth JWT, so `auth.uid()` is null and that policy won't work. File access will be enforced **in the API routes** (service role + verified Clerk `userId`) in Session 3. Creating the buckets PRIVATE is enough for now.

---

## Quick reference — local dev

```bash
cd portal
npm run dev          # http://localhost:3000
npm test             # run unit tests once
npm run test:watch   # TDD loop
npm run build        # production build (must stay green before any push)
npm run lint         # must stay clean before any push
```

Branch model: work on `staging`, never push straight to `main`. CI gate before every push: `lint` + `build` + `test` all green.
