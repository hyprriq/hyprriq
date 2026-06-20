## SCOPE — what's real vs deferred (case lifecycle), as of 2026-06-20
**REAL / working now (manual-review mode):**
- Client submit → case created (`pending_intake`), credit deducted atomically.
- Admin Founder Review queue surfaces all submitted cases (manual mode).
- Admin manual review: dimension scoring, confidence, verdict, Approve & Deliver →
  sets status `delivered` + `delivered_at` + verdict + writes findings (no PDF involved).
- Client sees verdict + Evidence/Questions/Timeline on the Case Detail page (on-screen report).
- Scope-confirmation (awaiting_client) banner + confirm-scope, change request, support, billing
  (Stripe portal/invoices when key present), plan-state gating.

**DEFERRED (research-pipeline session) — NOT built:**
- Track 0 automated intake (OCR, brand-mismatch detection) — only Inngest scaffold exists.
- Tracks 1–5 automated research — none.
- Automated status progression pending_intake→…→awaiting_review — none (founder does it manually).
- PDF report generation (React-PDF) — none. The on-screen Case Detail IS the report for now.

**Interim placeholders in place so the flow is testable end-to-end:**
- Founder manually moves a case to delivered via the review screen (no pipeline needed).
- Client "Download" relabeled "View report" → opens the on-screen report; PDF export marked "coming soon".
- Admin nav sections without real features (Outcomes/Revenue/Prompts/Settings) → clear "coming soon" pages.

## Session F.5 — Scope clarity + 3 bugs (2026-06-20)
- **Bug 1 (Approve & Deliver "does nothing")** — NOT a bug. Transition works (review API sets
  delivered; DELIVERED KPI=1 confirmed). Invisible only because there was no Delivered page to view
  it (= Bug 3). Resolved by the admin Cases pages below.
- **Bug 2 (download redirects, no PDF)** — confirmed blocked on React-PDF (deferred). Interim: client
  action relabeled "View report" → Case Detail (real on-screen report); delivered banner notes PDF
  export coming. Flagged, not a fake feature.
- **Bug 3 (admin nav not clickable)** — real UI bug. All admin nav items lacked `href` → disabled.
  Fixed: every item routes now. Built real `/admin/cases` (All/In Queue/Delivered/Action filters,
  cross-client) + `/admin/clients`; Outcomes/Revenue/Prompts/Settings → honest "coming soon" pages.
  `lib/data/admin.ts`: `getAllCasesAdmin`, `getAdminClients`.

## Session F Progress

### Done (pre-Session-F)
- [x] hyprriq.com homepage — committed `9afff3a`. On Vercel staging.
- [x] Supabase 20-table schema — migrated and live, `/api/health` returns OK.
- [x] Session C — branded auth pages — COMPLETE (commit `d710f15`, branch `staging`).
- [x] Color correction (2026-06-19): prototype blue at source in `globals.css` `@theme`.

### Session F — Done
- [x] **Migration** `supabase/migrations/20260619120000_session_f_plan_align_support_onboarding.sql`
  — aligns `clients.plan_type` AND `cases.plan_type` CHECK to `single_99/growth_279/scale_499`
  (the live schema had the retired pre-pricing enum); adds `clients.onboarding_completed`;
  creates `support_requests` (SR-YYYYMMDD-NNN gen, type/status, RLS own+admin) + atomic
  credit functions. Now wrapped in `BEGIN/COMMIT` (all-or-nothing).
  **PRE-FLIGHT (2026-06-19): 0 rows** in clients/cases carry retired plan_type values — safe.
  **Single Supabase project confirmed** (mjkacjrrrmlwlwkienvq.supabase.co = `.env.local` URL);
  no separate staging DB.
  **STATUS: APPLIED & VERIFIED on production (2026-06-19).** Ran clean ("Success. No rows
  returned"). Post-flight confirmed: support_requests table exists, clients.onboarding_completed
  present, deduct_client_credits() present. Migration-history caveat: run by hand in SQL Editor,
  so a future `supabase db push` would need `supabase migration repair` to avoid re-applying.
- [x] **Foundation**
  - `lib/constants/plans.ts` — canonical `PlanType`, `PLAN_BRAND_CAPS` (Scale=5 placeholder, TODO),
    `PLAN_CREDITS_PER_CYCLE`, prices, SLA, `creditsRequired()` / `brandCapForPlan()`.
  - `lib/data/client.ts` — `getOrCreateClient()` (lazy idempotent provisioning, see decision below),
    `getCurrentClient()`.
  - `lib/data/cases.ts` — `getClientCases()`, `filterCases()`, `getCaseById()`.
  - `components/portal/portal-shell.tsx` — shared sidebar + topbar + credits widget.
  - `components/portal/badges.tsx` — StatusBadge / VerdictBadge / CertaintyBadge (enum→client labels).

### Session F — Client screens DONE (typecheck + lint clean)
- [x] Onboarding — `/portal/onboarding` — guard + 3-step flow + `POST /api/onboarding/complete`.
- [x] Dashboard — `/portal/dashboard` — KPIs, recent cases, activity, deadlines, plan widget (live).
- [x] My Cases — `/portal/cases` — filter tabs (All/Active/Completed/Action Required via `?filter=`).
- [x] Case Detail — `/portal/cases/[id]` — scope banner (awaiting_client), real tab panels
  (Overview/Evidence/Questions/Timeline, bug fix #3), `POST /api/cases/[id]/confirm-scope`
  (optimistic-concurrency guarded). Certainty badges verified/inferred/unknown.
- [x] Submit — `/portal/submit` — 3-step, live brand-tags (cap from `PLAN_BRAND_CAPS`),
  live Credit Impact Preview, vendor-brand helper line (content/submit.ts), `POST /api/cases/submit`
  (atomic `deduct_client_credits` RPC + refund-on-failure + optional storage upload). After-submit
  inline success state shows Credit Deducted / Remaining Balance straight from the API response.
- Reusable: `components/portal/case-table.tsx`, `badges.tsx`, `portal-shell.tsx`.
- Migration extended with atomic `deduct_client_credits` / `refund_client_credits`.

### Session F.4 — Stuck-case bug (founder queue never populated) — FIXED (2026-06-20)
**Root cause:** the research pipeline (Track 0 intake → Tracks 1–5 → QA, Inngest) that advances a
case `pending_intake → … → awaiting_review` does not exist (only the Inngest scaffold). `submit`
writes the case at `pending_intake` and nothing moves it. The admin Founder Review queue filtered
strictly for `awaiting_review`, which nothing ever reaches → queue always 0 despite cases created.
**Fix (systemic):** `lib/data/admin.ts` now has one `FOUNDER_QUEUE_STATUSES` source of truth used by
both the queue and the Pending-Review KPI — it surfaces every submitted case not blocked on the
client and not delivered (manual-review mode). Existing stuck case (AWI-2606-001) now appears with
no one-off patch. Added a Stage (StatusBadge) column + corrected copy ("in queue"). Clearly marked:
when the automated pipeline lands, narrow the set to `awaiting_review`/`manual_override_required`
(one line). Minor follow-up noted: `submit` doesn't set `sla_deadline` (SLA shows "—" until intake
exists). `next build` + `eslint` clean.

### Credit Impact after-submission — implementation decision (flagged per prompt)
Chose inline Step-success state over a cross-page toast. There is no toast infra in the repo, so
option (a) "toast on redirect" was NOT the clean/minimal-state path — inline success carries the
values directly from the submit response (zero race). Status: built.

### Session F — Remaining screens DONE (tsc + eslint + `next build` all clean)
- [x] Change Request — `/portal/cases/[id]/change` — 7-day window guard (delivered + deadline
  open + not used), eligible/ineligible states, `POST /api/cases/[id]/change-request`
  (server guard mirrors page; marks `change_request_used`; dual email).
- [x] Support Centre — `/portal/support` — form + `POST /api/support/request` (creates
  support_requests, SR number via trigger, type mapping, case-ownership check, dual email);
  right column lists client's own requests.
- [x] Help Centre — `/portal/help` — fully from `lib/content/help.ts` (how-it-works, verdicts,
  5 dimensions, FAQ accordion). New vendor-brand FAQ ("unconfirmed-brands") placed right after
  "How do credits work?"; submit form deep-links to its #anchor (auto-opens + scrolls).
- [x] Billing — `/portal/billing` — plan card + credit meter, invoice history from Stripe
  (`lib/data/billing.ts`, key-safe), Stripe Customer Portal via `POST /api/billing/portal-session`.
- [x] Admin Dashboard — `/admin/dashboard` — 6-tile KPI strip (6th = "Open Requests"),
  Founder Review queue, **Support Queue widget** (support_requests status='open'), active clients.
  `requireAdmin()` role guard (clients.is_admin). Admin shell bug fix #2 (inactive nav 0.65).
- [x] Case Review — `/admin/cases/[id]/review` — 5-dimension scoring (Pass/Infer/Flag/Fail/N/A
  + notes), confidence, 4 verdicts; ALL interactive elements are real `<button>` (bug fix #4);
  Approve disabled until verdict chosen. `POST /api/admin/cases/[id]/review` sets verdict/
  confidence/status/delivered_at, marks track statuses, and writes manual_override findings
  (certainty mapped) so the client Evidence tab populates.

### Bug fixes carried in
- #1 `--ink3` darker value → using token `--color-muted`/`ink-2` mapping in the new system.
- #2 Admin inactive nav at 0.65 opacity (admin-shell).
- #3 Case Detail tabs are real conditional-render panels (case-detail-view).
- #4 All nav/verdict/tab/score triggers are `<button>`/`<Link>` (no div onClick).
- #5 Growth & Single brand cap = 5 everywhere, from `PLAN_BRAND_CAPS`.

### VERIFICATION
- `npx tsc --noEmit` — clean
- `npx eslint app components lib` — clean
- `npm run build` — success, all 26 routes compile (13 screens + 7 API routes).
- **Runtime smoke-test (2026-06-19, post-migration):** dev server boots; `/api/health` →
  `database ok, storage ok` against the migrated production DB; `/`, `/pricing`, `/sign-in` → 200;
  `/portal/dashboard` & `/admin/dashboard` → 307 to sign-in (auth gating verified).
- **STILL UNVERIFIED — needs an authenticated browser session** (Clerk login required, can't be
  done headlessly): the full client flow (onboarding → submit → atomic credit deduct → case
  detail → support/change-request + real Resend email) and the admin flow (review → approve →
  deliver → client Evidence populates). Manual checklist handed to founder. Stripe Billing still
  blocked on STRIPE_SECRET_KEY.

## Session F.2 — Plan gating + fixes (2026-06-20, from live staging testing)
- [x] **Plan-state gating** (ADR-005, `docs/adr-005-plan-state-gating.md`) — `lib/data/access.ts`
  `deriveAccess(client)` single source. States: `no_plan` (plan_type NULL),
  `active` (billing active/trialling), `expired` (billing cancelled/past_due).
  - Submit route → `requireSubmitAccess()` redirects no_plan/expired to Billing
    (root-cause fix for the "-1 credits at Step 3" dead-end — they never reach the form).
  - Cases list: no_plan→dashboard; expired→Completed-only read-only banner. Case detail &
    change-request: no_plan→dashboard; expired blocked from change request.
  - Dashboard: no_plan → single "Choose a plan" activation panel (NOT 0-KPIs); expired →
    reactivate banner + read-only Completed Reports; active → full dashboard.
  - Sidebar nav items gated by access (New Case/Active/Completed disabled when not allowed).
- [x] **Logout** — Clerk `signOut()` in topbar avatar menu (`components/portal/user-menu.tsx`),
  on both client + admin shells.
- [x] **Dev view-switcher** — admin↔client toggle in the avatar menu. Gated by
  `VERCEL_ENV !== 'production'` (NOT NODE_ENV — Vercel sets NODE_ENV=production on preview too)
  AND `is_admin`. Never shows in prod; `/admin/*` stays `requireAdmin()`-guarded regardless.
- [x] **Learn-more new tab** — submit Step 2 link is `target="_blank"` (form progress preserved).
- [x] **Copy fixes** — greeting name-agnostic when no name ("Welcome to HyprrIQ"); zero-state
  subline ("Ready to start? Submit your first research request.") vs active-state line.
- Verified: `tsc` + `eslint` clean, `next build` success (26 routes).
- ⚠ `expired` state depends on `billing_status` which the (unbuilt) Stripe webhook would set;
  until then it only triggers if set manually.

### Session F.3 — Design pass + code review (2026-06-20)
- [x] **Type scale** bumped one step in portal/admin only (13→14 body, 11→12 labels, 10/9→11
  micro). Decision: direct scoped bump, NOT global `--text-*` override — the homepage shares the
  Tailwind scale and must not change. Marketing dirs left untouched (verified).
- [x] **Side-stripe `border-l` bans removed** (impeccable): case-table action rows → bg tint;
  case-review verdict buttons → full faint colored border; help verdict cards → full colored
  border. (Dashboard KPI stripe already removed in the gating rewrite.)
- [x] **Color** added to dashboard KPIs — tinted icon chips per metric (brand / accent-data /
  clear / verify) to break the monochrome, no banned hero-metric template.
- [x] **`/code-review` (high)** run. Found + FIXED: **MRR undercounted** — it aggregated the
  `clients` query that had `.limit(5)` (shared with the Active-Clients widget). Now MRR sums all
  active subscribers; the widget slices to 5 in JS. Noted for later: move MRR to a DB-side sum +
  paginate admin case/clients queries before scale.
- Verified: `next build` ✓, `eslint` ✓.
- Known minor (accepted): expired users can open in-progress case detail read-only (own data,
  scoped) — slightly looser than "completed only"; left as-is.

### Decisions made (delegated to engineering judgment by Gautam)
- **plan_type** → wrote migration aligning DB to locked `single_99/growth_279/scale_499`.
- **Schema gaps** → both via one migration: `support_requests` as a real table (no viable
  alternative); `onboarding_completed` as a DB column on `clients` (beats Clerk metadata —
  one source of truth, works with existing RLS + server guard query).
- **Client provisioning** → lazy idempotent `getOrCreateClient()` on first portal load (there is
  NO Clerk user.created webhook). Idempotent on PK; never overwrites plan/credits.
- **Design idiom** → prototype is structural source of truth; implemented in the existing
  Tailwind v4 + `@theme` token system (not raw prototype CSS) for design-system consistency.

### Open questions / flagged for approval
- **Scale plan brand cap per credit** — NOT confirmed. Placeholder `5` isolated to
  `PLAN_BRAND_CAPS.scale` in `lib/constants/plans.ts` with TODO. Status: pending.
- **Migration run on production** — wrapped in BEGIN/COMMIT, pre-flight clean. Status: pending
  founder execution in SQL Editor (will report result before continuing).
- **RESEND** — CLEARED (2026-06-19). `hyprriq.com` verified in Resend, `RESEND_API_KEY` in
  `.env.local` + Vercel. Dual emails (Support / Change Request) should now send for real.
  ⚠ Still UNVERIFIED end-to-end (no real send tested yet) — confirm an actual email arrives.
- **STRIPE_SECRET_KEY** — still ABSENT. Billing (Stripe customer portal + invoice list) is
  built key-safe but returns 503/empty until the key is in `.env.local` + Vercel. Status: pending.
