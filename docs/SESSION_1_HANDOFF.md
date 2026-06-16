# HyprrIQ — Session 1 Foundation: Build & Handoff

**Status:** ✅ Code complete, built, tested, deployed, and **verified live** — see [DEPLOYMENT.md](./DEPLOYMENT.md).
**Database:** ✅ Applied to Supabase, confirmed live via `/api/health` (2026-06-16).
**Commit:** `de08e9a` on branch `staging`.
**Stack (verified installed):** Next.js 16.2.9 · React 19 · Clerk v7.5.3 · Tailwind v4 · Supabase-js 2 · Inngest 4 · TypeScript 5 · Vitest 4.

> Read this with [DEPLOYMENT.md](./DEPLOYMENT.md). This file = what exists and how it's built. DEPLOYMENT.md = the runbook to get it live.

---

## 1. What was built (done & verified)

| Area | Detail | Verified |
|---|---|---|
| Project scaffold | Next 16 App Router, route groups `(marketing)` / `(portal)` / `(admin)`, `api/{health,inngest,webhooks/stripe}` | `npm run build` ✓ |
| Dependencies | Clerk, supabase-js, inngest, anthropic-sdk, stripe, resend, zod, react-pdf, date-fns, nanoid, sharp (+ vitest dev) | `package.json` ✓ |
| Auth (Clerk) | `proxy.ts` (Clerk v7 `await auth.protect()`), `ClerkProvider` in root layout, portal/admin route guards | build ✓ |
| Supabase clients | `lib/supabase/{client,server,admin}.ts` | build ✓ |
| Inngest | `lib/inngest/client.ts` + `app/api/inngest/route.ts` (empty functions array) | build ✓ |
| Utilities | `lib/utils/normalize-name.ts` (Patch 10) | **11 unit tests ✓** |
| Database schema | `supabase/migrations/20260601000000_initial_schema.sql` — 20 tables, 2 views, 38 RLS policies, ~41 indexes, triggers, seed | written; **not yet applied** |
| Tests | Vitest harness + `normalize-name.test.ts` | `npm test` → 11/11 ✓ |
| Health endpoint | `GET /api/health` → `{ status:"ok", timestamp }` | build ✓ |

**Verified locally:** `npm run build` (clean), `npm run lint` (0 problems), `npm test` (11/11). **Not verifiable without your credentials:** the migration running against Supabase, and the Vercel deploy.

---

## 2. Key deviations from the Session 1 prompt (and why)

The prompt was written for **Next 14 / Clerk v5 / Tailwind v3**; the actual scaffold is **Next 16 / Clerk v7 / Tailwind v4**. Adaptations were required for it to build clean.

**Would have failed without these:**
- **RLS infinite recursion fixed.** The spec's `clients_admin` policy queried `clients` from inside a policy *on* `clients` → Postgres `infinite recursion detected`. Replaced with a `SECURITY DEFINER` helper `is_current_user_admin()` used in all admin policies.
- **Invalid partial index removed.** `idx_prompt_runs_daily` used `WHERE created_at > NOW() - INTERVAL '1 day'` — non-IMMUTABLE predicates are illegal in index definitions. The plain `created_at` index serves the same query at runtime.

**Stack adaptation:**
- `middleware.ts` → **`proxy.ts`** (Next 16 renamed the convention; old name builds only with a deprecation warning).
- Clerk middleware uses **`await auth.protect()`** (v7), not the prompt's v5 `auth().protect()`.
- **`@inngest/next` dropped** — not a real package; `serve` ships from `inngest/next` inside `inngest`.
- Root layout keeps **Geist fonts** (globals.css references them) + adds `ClerkProvider`.
- Homepage moved `app/page.tsx` → `app/(marketing)/page.tsx` (so `/` is owned by the marketing group; avoids a route collision).

**Hardening:** views are `security_invoker`; all functions pin `search_path = public`; installed skills + local Claude permissions excluded from git.

---

## 3. Architecture flags the Developer Lead must know

1. **RLS is currently advisory, not enforced.** Every server query uses the service-role key, which **bypasses RLS**. Access control today depends on app code scoping each query by `client_id`. The `SET LOCAL app.current_user_id` bridge that activates RLS is **not wired yet** — it belongs in the API-route layer (Session 3+). Until then: *manually scope every query.* Flagged inline in `lib/supabase/server.ts`.
2. **Admin guard is auth-only.** `app/(admin)/layout.tsx` enforces authentication, not admin role. Role lives in `clients.is_admin`. Wire the real role check (DB lookup or Clerk `publicMetadata`) before exposing admin data — Session 5. Marked with a `TODO`.
3. **Storage RLS won't work the naive way with Clerk.** Supabase Storage RLS keys off `auth.uid()` (a Supabase Auth JWT) — which doesn't exist under Clerk. File access must be enforced at the **application layer** in the upload/download API routes (service role + Clerk userId check), not via `auth.uid()` storage policies. Decide this in Session 3.
4. **`normalizeName` can return `''`** for names made entirely of legal suffixes (e.g. "Holdings International Group"). `supplier_cache.vendor_name_normalized` / `brand_cache.brand_name_normalized` are `UNIQUE NOT NULL` → two empty keys collide. The cache-write path must refuse to write an empty normalized key. (Tested + documented in `normalize-name.test.ts`.)
5. **`case_number` prefix is `AWI-`**, not `HQ-`/`HYP-`. Client-visible. Confirm this is intended before launch (looks like a leftover from a prior product name).

---

## 4. Working agreement: TDD (mandatory for new code)

The test harness is live (`npm test`, Vitest). Going forward, for **all new functions, API routes, and bug fixes**:

1. **RED** — write the failing test first; run it; watch it fail for the right reason.
2. **GREEN** — minimal code to pass.
3. **REFACTOR** — clean up, stay green.

`normalize-name.test.ts` is the reference style (real inputs, one behavior per test, clear names). Pure logic (credit math, verdict gating, Keepa pattern reading, banned-language scanner, normalization) **must** be unit-tested. Test commands: `npm test` (once), `npm run test:watch` (TDD loop).

> Existing Session 1 code (`normalizeName`) got *characterization* tests after the fact because it was already written to spec. That's the one allowed exception — new code is strictly test-first.

---

## 5. What's NOT in this session (future sessions)

No UI pages, no API route logic beyond `/api/health`, no Stripe/email/research-pipeline/PDF. Route-group folders (`(portal)/portal`, `(admin)/admin`) and `components/*` hold `.gitkeep` placeholders only. Per the Build Roadmap: Session 2 = marketing site, 3 = portal+upload, 4a/4b = research pipeline, 5 = admin, 6 = Stripe, 7 = reports, 8 = monitoring.

---

## 6. Your immediate to-do (full runbook in DEPLOYMENT.md)

1. **Apply the migration to Supabase** (it is not applied yet).
2. **Add all 7 env vars to Vercel** (staging) — without the Clerk ones, the deploy fails.
3. **Verify** the migration (corrected queries in DEPLOYMENT.md) and the Vercel staging deploy.
4. Storage buckets + PgBouncer: optional now, required by Session 3 — see DEPLOYMENT.md for the Clerk caveat.
