# ⏩ RESUME HERE — state as of 2026-06-23 (Phase G architecture locked, branch `staging`)

**What this project is:** HyprrIQ portal (Next.js 16 App Router, Tailwind v4, Clerk, Supabase, Stripe, Inngest).
**Working dir:** `D:\Projects\Hyprriq\portal` (NOT HyprrX — ignore any HyprrX path). Repo `github.com/hyprriq/hyprriq`, branch **staging**. Staging URL `hyprriq-git-staging-hyprrx-hyprriq.vercel.app`.

**Done & live:** full 13-screen client+admin portal, plan-state gating (ADR-005), role enum (ADR-006),
Stripe checkout + webhook (test mode) VERIFIED working, cancel subscription, onboarding+billing bug pass,
top-up credit + invoice fixes, **F.11 complete** (client profile, internal notes, account deletion,
billing_audit). Every change is `tsc`+`eslint`+`vitest(15)`+`next build` clean and pushed.

**⚠ NEXT — Phase G research pipeline. Governing spec: `docs/adr-008-research-pipeline.md` (READ FIRST).**
Founder-approved: full adoption of ADR-G001 (`case_track_results` = single authoritative track table),
single-model `claude-sonnet-4-6` at launch (no OpenAI backup yet; behind a `runModel()` adapter),
phasing G1 (backbone+Track 0+manual+review gate) → G2 (Track 1) → G3 (Tracks 2–5 + PDF).

**⚠ PENDING — founder actions (not code):**
1. **Apply migration** `20260623000000_adr_g001_case_track_results_authoritative.sql` — drop+recreate
   `case_track_results` to the ADR-G001 schema (+`track_key`, governance/prompt fields), backfill from
   legacy `research_findings`, deprecate `research_findings`. **Pre-flight FIRST:**
   `SELECT count(*) FROM case_track_results;` must be **0** (no writer exists). Then confirm counts.
   *After this applies → I re-point the review API + Evidence tab to `case_track_results`, then build G1.*
2. **Review `docs/adr-008-research-pipeline.md`** and confirm the locked decisions.
3. **No API keys needed for G1.** Add `ANTHROPIC_API_KEY` + `WHOIS_API_KEY` (+ register `SERPER_API_KEY`)
   only at the G1→G2 boundary — I'll ping you. `KEEPA_API_KEY` at G3 when first Scale client subscribes.
4. **(F.11 leftovers)** `20260622040000_billing_audit_retain_on_delete.sql` APPLIED ✓; still TODO:
   test account deletion on a throwaway client; mirror Stripe env to Vercel; retest top-up + cancel
   (verify a billing_audit row appears in admin client detail); open the PR `main...staging`.

**⚠ KNOWN GOTCHAS (cost hours before):** Stripe webhook destination must be **test mode** (not live) to
get test events; **Vercel Deployment Protection** returns 401 to Stripe at the edge — must stay OFF for the
webhook path. Migrations are applied by the founder manually (write file → they run → confirm → then code swap).

**Open/flagged (not built):** drop `is_admin` column (post role-swap cleanup); admin credit-adjust tool;
RLS test suite + CI gate; brands/suppliers normalization (ADR-007 proposed); client Settings page;
research pipeline + PDF report (deferred sessions). See full audit lists in sections below.

## Session G.0 — Research pipeline architecture locked (2026-06-23)
**Scope:** lock the intelligence engine before any Track 0–5 code. Inputs: founder's
`hyprriq_phase_de_g_brief v1.1` (ADR-G001/G002/G003 + prompts + evidence-weight tables) and
`ADR-G001 Research Pipeline Governance`. Output: `docs/adr-008-research-pipeline.md` (governing spec).

- **🛑 Caught (ADR-G001-mandated stop): TWO findings tables existed** — `research_findings` (original
  schema, live-wired: review API writes, Evidence tab reads) AND `case_track_results` (F.11 scaffold,
  empty). ADR-G001 forbids dual tables. **Founder decision: Option 1 — full ADR-G001 adoption.**
- **Migration written** `20260623000000_adr_g001_case_track_results_authoritative.sql`: drop+recreate
  `case_track_results` (empty) to the ADR-G001 authoritative schema + `track_key` canonical registry
  (`intake`/`supplier_identity`/`supply_chain_relationship`/`brand_risk_assessment`/`documentation_review`/
  `sourcing_logic`) + `track_number` + prompt-governance fields (GR5); backfill `research_findings`
  near-1:1; deprecate `research_findings` (legacy comment, drop after Phase G). Pre-flight: ctr empty.
- **CTO decisions recorded in ADR-008:** single-model `claude-sonnet-4-6` at launch (GR8), **no OpenAI
  backup yet** but every call behind a `runModel()` provider adapter (config-flag later); API-key
  timing (G1 none → G2 Anthropic+WHOIS+Serper → G3 Keepa); cost tiered by plan + cache-reuse moat;
  Source Clear copy adds "Verdicts are operational guidance, not legal determinations."; recommended
  premium data sources (import bill-of-lading / OpenCorporates / WhoisXML / USPTO / CourtListener).
- **Test-engineer finding:** `normalizeName()` bug confirmed (`'LLC'→''`, no null guard) — fix per
  brief §3.1 before G2 cache use.
- **Phasing (supersedes brief session-split):** G1 backbone+Track 0+manual+review gate (zero keys) →
  G2 Track 1 automated (reference impl) → G3 Tracks 2–5 + Phase H PDF.
- **Next code (after migration applies):** re-point review API + Evidence tab `research_findings →
  case_track_results.compiled_findings_json`, then writing-plans for G1.

## Session F.11 — Client profile / internal notes / track schema / deletion / billing_audit (2026-06-22)
**Scope:** spec `HyprrIQ_ClaudeCode_ClientProfile_TrackSchema_Deletion.md` (5 items). This pass writes the
SCHEMA (migrations, founder-applied) + the build plan. Dependent code ships per-item AFTER founder confirms
each migration applied (selecting a missing column would break the deployed staging app — ADR-006 lesson).

### Schema written this pass (3 new migrations, additive, BEGIN/COMMIT-wrapped, `ADD ... IF NOT EXISTS`)
- `20260622010000_client_profile_and_notes.sql` — Items 1+2. ~22 nullable cols on `clients`: contact_*,
  primary_marketplace (broad enum) + marketplace_other_name, sells_on_amazon/walmart + store names,
  billing_* address, vat/ein/tax_id, internal_notes + notes_updated_at.
- `20260622020000_case_track_results.sql` — Item 3. Table per spec + admin-only RLS + updated_at trigger.
  No UI/API this pass (Phase G writes, Phase H reads).
- `20260622030000_billing_audit_and_admin_audit.sql` — Items 5+4. `billing_audit` (+ `retention_override`)
  and `admin_audit_log` (action/admin_id/target_email/reason/metadata). Both admin-only RLS.

### ⚠ FLAGGED decisions (engineering judgment, not blocking)
1. **`marketplace` already exists** on `clients` (legacy, UNUSED — every code ref is `cases.marketplace` or
   marketing copy). Spec's pre-flight expected 0 rows for it; it's present. Resolution: added
   `primary_marketplace` (spec's name, broader enum) alongside; legacy col untouched → later cleanup ADR.
2. **`internal_notes` client-visibility:** RLS is row-level and `clients_self` grants a client its own row,
   so DB RLS can't hide a column. Enforced at QUERY layer — client data layer (`getCurrentClient`) must NEVER
   select internal_notes/notes_updated_at; only an admin-only query reads them. (App talks to Supabase
   server-side, so query-layer is the real control here.)
3. **`case_track_results` RLS = admin-only** for now (no client UI; Phase H PDF runs server-side). Add a
   read-own SELECT policy when client-facing track views exist.
4. **`admin_audit_log` built new** (not reusing generic `audit_log`) per spec — dedicated high-sensitivity log.

### CONSOLIDATED PRE-FLIGHT (run once before applying the F.11 trio)
```sql
-- New columns on clients (expect: only legacy 'marketplace' may appear; all F.11 names absent)
SELECT column_name FROM information_schema.columns
WHERE table_name = 'clients'
AND column_name IN ('contact_phone','primary_marketplace','marketplace_other_name',
  'sells_on_amazon','sells_on_walmart','internal_notes','billing_address_line1','vat_number');
-- Expect 0 rows.

-- New tables (expect 0 rows — none should exist yet)
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('case_track_results','billing_audit','admin_audit_log');
```
If any F.11 name appears, STOP and flag. (Migrations use `IF NOT EXISTS` so a partial state won't hard-fail,
but a pre-existing column with a different definition must be reconciled by hand.)

### BUILD PLAN — dependent code (ALL SHIPPED, verified tsc+eslint+test+build, pushed)
- [x] **Item 2** (commit `105cfde`) `/admin/clients/[id]` detail page: profile/contact/business/billing/tax,
  cases list, billing history. Internal-notes panel (explicit Save → notes_updated_at). `PATCH
  /api/admin/clients/[id]/notes`. Clients list rows now link to detail. Data layer:
  `getAdminClientDetail`/`getCasesForClient`/`getClientBillingAudit` — `internal_notes` is admin-only.
- [x] **Item 1** (commit `f8c5ee9`) Onboarding Step 1 expanded: required company/contact-name/phone/
  marketplace/country (hard-gated) + optional Additional details (also-sells + store names + billing
  address). Profile persists on Step-1 advance so it survives the Stripe redirect. New `/portal/settings`
  + `SettingsForm` (tax fields Settings-only). Shared `PATCH /api/profile` (field-whitelist). Settings nav
  enabled. `getClientProfile()` excludes internal_notes. `lib/constants/marketplaces.ts`.
  NOTE: required "Country" maps to `billing_country` (the only country column the spec added).
- [x] **Item 5** (commit `aede1c2`) Stripe webhook writes `billing_audit` on new_subscription /
  one_time_purchase (incl top-ups) / cancel / resume. updated|deleted read prior state → log only on a real
  transition. Idempotent via the stripe_events dedupe gate.
- [x] **Item 4** (commit `fcdb029`) `DELETE /api/admin/clients/[id]` hard delete — fail-safe ordering
  (non-destructive billing_audit retention FIRST, destructive deletes last), Storage purge, Clerk
  deleteUser, admin_audit_log. Double-confirm dialog. Guards: no self-delete, no elevated-role delete.
  **Needs migration `20260622040000` applied before use** (billing_audit ON DELETE SET NULL +
  client_email_snapshot). Route errors pre-destruction until then.

### ⚠ FLAGGED decisions (Build 3/4, engineering judgment)
5. **Deletion guards:** route refuses to delete your own account or any role≠'client' (prevents nuking the
   founder/admin). Danger-zone UI hidden for elevated roles. Flag if you want admin deletion enabled.
6. **stripe_events / credit_transactions NOT touched on delete:** `stripe_events` has no `client_id`
   column (raw Stripe event log, not per-client) and `credit_transactions` does not exist (credits are
   columns on `clients` + the deduct/refund RPCs). Spec listed both; neither is applicable here.
7. **billing_audit retention needs a schema change** (migration 040000) — the original RESTRICT FK would
   block the client delete. Relaxed to ON DELETE SET NULL; retained rows keep `client_email_snapshot`.

## Session F.10 — Top-up credits + invoices (2026-06-22)
- [x] **Top-up credits not added** — webhook read unset `metadata.credits`; now derives from `kind`
  (`topup:<id>`) via the `TOPUP` map. Already-paid $179 needs manual backfill (`+6` credits via SQL).
- [x] **One-time purchases missing from Invoice History** — enabled `invoice_creation` on payment-mode
  Checkout sessions (one-time payments don't create invoices by default). Future top-ups/Single show + PDF.
- [x] **Top-up packs** — both Growth & Scale offer $99 (3) and $179 (6).

## Session F.9 — Onboarding + Billing bugs (2026-06-22)
- [x] **Bug 1** Onboarding Step 2 checkout — embedded plan picker with `CheckoutButton redirect="onboarding"`;
  checkout API + button take a `redirect` param → returns to `/portal/onboarding?checkout=success`.
  Onboarding page resumes at Step 2 when `plan_type` set or `?checkout` present (no more loop to Step 1).
- [x] **Bug 2** Plan bypass — hard gate: Step 2 has NO "Continue" without a plan; only the plan picker +
  an explicit "Skip for now →". Plan presence read from DB (server prop), not UI state.
- [x] **Bug 3** "Manage subscription" only for `plan_category='subscription'`; one_time shows "Buy another
  report →". Payment Method hides the Stripe button (no alarming red) until a `stripe_customer_id` exists.
- [x] **Bug 4** One-time → "Upgrade to a subscription" section (Growth/Scale checkout) on Billing.
- [x] **Bug 5** Back buttons added to onboarding Steps 2 and 3.
- [x] **Bug 6** "the founder reviews" → "your report goes through quality review" (onboarding Step 3).
- [x] **Top-ups (screenshot)** — Scale now offers BOTH $99 (3) and $179 (6); Growth offers $99 (3).
- Verified: tsc + eslint + tests + next build clean. Run a fresh new-user flow to confirm loop/bypass fixed.

## Session F.8 — Stripe verified + cancel subscription (2026-06-22)
- [x] **Stripe checkout VERIFIED end-to-end.** Root cause of the earlier zero-deliveries:
  (1) the webhook *destination was created in LIVE mode* in Stripe while checkouts were test mode —
  separate pipelines, so test events never reached a live destination (recreated in test mode);
  (2) earlier, Vercel **Deployment Protection** returned 401 to Stripe at the edge (founder disabled
  it for Preview). Both resolved; checkout confirmed working.
- [x] **Cancel subscription** built:
  - `app/api/billing/cancel/route.ts` — `cancel_at_period_end: true` (never immediate), with resume;
    optimistic local `billing_status` mirror, webhook reconciles. Subscription-only guard.
  - `components/portal/cancel-subscription.tsx` — explicit confirm dialog ("stays active until
    <renewal>, then won't renew"); Resume option when already cancelling.
  - Billing page: cancel control (subscription plans only) + "Your plan cancels on <date>" banner.
  - Webhook `customer.subscription.updated` → sets `billing_status='cancelling'` when
    `cancel_at_period_end` on a live sub (distinct from `cancelled`); `subscription.deleted` →
    `cancelled` → existing `expired` gating. `deriveAccess` already treats `cancelling` as full access.
  - **Migration `20260622000000_add_cancelling_billing_status.sql`** (additive, txn-wrapped) — adds
    `cancelling` to the billing_status CHECK. **APPLY BEFORE testing cancel** (webhook writes it).
- Verified: tsc + eslint + tests + next build clean.
- Open: ADR-006 `is_admin` column drop (post-verify cleanup); credit-adjust admin tool; RLS test suite.

## Session F.7 — ADR-006 code swap + Stripe checkout/webhook scaffold (2026-06-20)
- [x] **ADR-006 migration APPLIED & verified** (founder ran it; `role='founder'` confirmed).
- [x] **is_admin → role code swap** complete: `lib/data/client.ts` (`Role` type + `isElevated`,
  Client.role, selects), `requireAdmin` (role!=='client'), admin review API, admin clients page
  badge, portal-shell dev-switcher gate. `is_admin` DB column retained until a later cleanup.
- [x] **Stripe checkout + webhook SCAFFOLD** (no Stripe products created by app — founder supplies
  Price IDs from planning thread):
  - `lib/stripe/plans.ts` — env-driven Price-ID map (plan↔price, top-ups), forward + reverse.
  - `app/api/checkout/session/route.ts` — Checkout Session (subscription for growth/scale, payment
    for single + top-ups); 503 until price env + STRIPE_SECRET_KEY set.
  - `app/api/webhooks/stripe/route.ts` — signature verify + idempotency (stripe_events) + handles
    checkout.session.completed / subscription.updated|deleted / invoice.paid|payment_failed →
    sets plan_type/credits/renewal/billing_status/stripe ids. Inert until STRIPE_WEBHOOK_SECRET set.
  - Webhook is also the real client-provisioning path (addresses reliability gap #4).
  **Founder env to add when Price IDs exist** (.env.local + Vercel): `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_SINGLE_99`, `STRIPE_PRICE_GROWTH_279`,
  `STRIPE_PRICE_SCALE_499`, `STRIPE_PRICE_GROWTH_TOPUP`, `STRIPE_PRICE_SCALE_TOPUP`. Register
  webhook endpoint `https://<domain>/api/webhooks/stripe`. TODO: credit rollover on renewal.
- Verified: tsc + eslint + 15/15 tests + next build clean.

## Session F.6 — UX fixes + ADR-006 + architecture answers (2026-06-20)
- [x] **Submit form** — drag-and-drop wired (shared `validateFile`, PDF/JPG/PNG ≤10MB), Choose-file
  row realigned (label-button + filename + remove), **conditional-required notes**: when NO file is
  uploaded, notes become required with evidence-only helper copy; gates Step 2 Next + final submit.
- [x] **Terminology (ADR-006)** — "Founder Review" → "Quality Review" (UI only; confirmed NOT in DB
  enum — `founder` in DB is the separate `founder_notes` table / `reported_by`, untouched). FOUNDER
  *role* badge kept (accurate).
- [x] **ADR-006 role enum migration written** `20260620000000_adr006_role_enum.sql` — additive,
  txn-wrapped: adds `clients.role` ('client'|'admin'|'founder'), backfills from is_admin, makes
  `is_current_user_admin()` role-aware (keeps is_admin as transitional fallback). **NOT APPLIED** —
  founder applies first; code swap (is_admin→role) is the follow-up after apply (selecting a missing
  column would break the deployed app). is_admin column retained until then.
- **Architecture answers (no code):**
  - **Stripe portal flow CONFIRMED correct** — `api/billing/portal-session` uses
    `stripe.billingPortal.sessions.create`; we only store `stripe_customer_id`, never raw card data.
    No deviation. Checkout wiring (Session E) still to come.
  - **Brands/Suppliers** — currently TEXT/array fields on `cases` (`vendor_name`, `brands_submitted`).
    `brand_cache`/`supplier_cache` exist but are per-entity research caches, NOT a case↔entity index.
    Cross-reference feature needs a normalized model → ADR-007 (proposed, see docs/). NOT built.
  - **Settings (client) page — NOT built.** Nav item is a disabled placeholder. Flagged; not silently built.
- **100-client load audit (severity):** indexes on client_id/status/billing_status/stripe present (good);
  no N+1 (joins via PostgREST embeds). MEDIUM: `getAdminDashboard` + `getAllCasesAdmin` pull ALL rows
  unbounded to derive counts → move to DB `count()` + pagination before real scale. LOW: `getAdminClients`
  unbounded. None urgent at current volume.
- **Still to implement next (flagged, not done this turn):** admin credit-adjust tool (API+UI+audit),
  is_admin→role code swap (post-migration), brands/suppliers normalized model (ADR-007), client Settings page.

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
