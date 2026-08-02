# HyprrIQ — Auth, Payments & Subscription Architecture

CTO-level recommendations for the SaaS plumbing. Decisions here drive the IA for
the portal, billing, and checkout builds. Stack is already chosen: **Clerk**
(identity) · **Stripe** (billing) · **Supabase** (state) · **Inngest** (jobs).

## 1. Auth + billing split — **Hybrid (recommended)**

Don't build auth or billing yourself.

- **Clerk owns identity** — sign-up, sign-in, sessions, MFA, OAuth. On our own
  domain (`/sign-in`, `/sign-up`) — already built.
- **Stripe owns money** — subscriptions, invoices, cards, proration, tax, SCA,
  fraud (Radar). Source of truth for *billing*.
- **Supabase `clients` row is the join** — links `clerk_user_id ↔
  stripe_customer_id` and holds the app's view of state: `plan_type`,
  `credits_available`, `billing_status`. Kept in sync by **Stripe webhooks**.
- Optionally mirror `plan_type` into Clerk `publicMetadata` for fast, edge-level
  gating without a DB hit.

Why hybrid: each system does what it's best at; you carry **zero PCI scope** and
no password/session security burden. This is the standard $0→$10M-ARR pattern.

## 2. Signup flow — two paths

**Subscriptions → account-first (recommended):**
`Pricing → Sign up (Clerk) → Choose plan → Stripe Checkout → webhook provisions
plan+credits → Portal.`
Account-first means the Stripe customer attaches to a known Clerk user — no
"paid but which account?" reconciliation, and the user lands authenticated.

**Single report ($99, `single_99` — ~~$79/$197~~ retired) → pay-first (low friction):**
`Pricing → Stripe Checkout (email only, guest) → webhook creates a minimal
account (magic link) → read-only case view.`
The "try once" buyer shouldn't be forced through full signup first.

Avoid pay-first for *subscriptions* — a failed account-create after a recurring
charge is the worst reconciliation case.

## 3. Stripe integration — **Hosted Checkout now, Customer Portal for billing**

| Option | Verdict |
|---|---|
| **Stripe-hosted Checkout** | ✅ **Use now.** Zero PCI scope, fastest to ship, cards+wallets+SCA+proration+tax+Radar built in, Stripe-maintained. Con: brief redirect off-page (returns to our `success_url`). |
| Embedded Checkout | Good **v2** upgrade if the redirect ever measurably hurts conversion — stays on our domain, still PCI-light. |
| Custom (Payment Element) | ❌ Not now. Most build + maintenance + SCA handling; no payoff at this stage. |

**Billing self-service = Stripe Customer Portal** (hosted): update card, cancel,
upgrade/downgrade, view/download invoices — **near-zero build**. We add only a
thin `/portal/settings/billing` page with a "Manage billing" button that opens
it.

## 4. Subscription lifecycle (all driven by webhooks → Supabase)

- **New purchase:** `checkout.session.completed` + `customer.subscription.created`
  → set `plan_type`, `credits_available`, `billing_status='active'`, store
  `stripe_customer_id` / `subscription_id`.
- **Returning login:** Clerk sign-in → portal reads plan/credits from Supabase.
- **Upgrade/downgrade:** Stripe Customer Portal (or in-app button → Stripe API) →
  `customer.subscription.updated` → adjust plan/credits, prorate; credits carry
  forward (per product decision).
- **Renewal:** `invoice.payment_succeeded` → reset monthly credits.
- **Failed payment:** `invoice.payment_failed` → Smart Retries + `past_due`
  banner; after final retry → gate new submissions, keep existing reports
  downloadable.
- **Cancel:** `customer.subscription.deleted` → `billing_status='cancelled'` at
  period end; never delete data.

(The `stripe_events` table already exists for idempotent webhook handling.)

### ⚠️ `clients` row lifecycle — the rule that prevents billing corruption

**The `clients` row is created ONLY by Stripe webhooks, NEVER at Clerk signup.**

Why: the schema has `billing_status DEFAULT 'active'` with **no `pending`/`none`
state**, and `id` is the Clerk `user_id`. A row created at signup would be a
fake `active` customer with no plan/credits — it pollutes every "active
subscribers" query. An authenticated Clerk user with **no** `clients` row is the
correct representation of "signed up, hasn't purchased" → portal sends them to
choose-plan.

Hard rules for the webhook handler (do not deviate):

1. **No `clients` insert on Clerk `user.created`.** If lead tracking is ever
   wanted, use a separate table — never `clients`.
2. **Key the row on `clerk_user_id`.** Account-first checkout MUST pass it as the
   Checkout Session `client_reference_id` (and/or `metadata.clerk_user_id`); the
   webhook sets `clients.id = client_reference_id`. Never key solely on
   `stripe_customer_id` — that lets identity and payment drift apart.
3. **Idempotent + order-independent.** Dedupe every event via `stripe_events`
   (insert `event.id`, skip if seen). Use `INSERT ... ON CONFLICT (id) DO UPDATE`.
   Stripe delivers at-least-once and out of order — `customer.subscription.created`
   may arrive before `checkout.session.completed`, so every handler must upsert
   and tolerate a missing-or-existing row, never assume creation order.
4. **Guest single-report path:** no prior Clerk user, so the webhook provisions a
   Clerk user via the Backend API first, then upserts the row with that new id.
   Still webhook-owned, still keyed by `clerk_user_id`.

Minor follow-up: `billing_status` lacks Stripe's `incomplete` state (failed
initial payment). Map `incomplete` → leave row uncreated/`past_due` for now, or
add the enum value when wiring the handler.

## 5. Pages — what we build vs what Stripe hosts

| Page | Owner |
|---|---|
| `/pricing` | **Build** (ours — conversion surface) |
| Checkout | **Stripe-hosted** — we add `/api/checkout` to create the session |
| Subscription / upgrade / downgrade | **Stripe Customer Portal** + thin `/portal/settings/billing` link |
| Invoices / billing history | **Stripe Customer Portal** (no build) |
| Payment methods | **Stripe Customer Portal** (no build) |

---

# CURRENT-STATE ADDENDUM — the admin layer & intake plumbing (recorded 2026-07-30)

Everything above is the original design recommendation. This section records what is BUILT
and RULED as of 2026-07-30, so no future reader re-derives (or "fixes") it. Source of truth
for open work: `HyprrIQ_OPEN_ITEMS.md`; the WHY behind rulings: `HyprrIQ_OPEN_ITEMS_HISTORY.md`.

## A. Admin role hierarchy (`admin_permissions`)

- **Two roles:** `super_admin` (exactly one — the founder, Option-B ruling 2026-07-30:
  gautamnaidu.p@gmail.com is the master identity; seed CONFIRMED RUN) and `sub_user` with six
  CHECKED capabilities (`view_cases, review_publish, run_case, rerun, adjust_credits,
  view_billing`). Sub-users DEFERRED until there is staff.
- **No self-escalation, three ways:** manage-users is the super_admin ROLE, never a grantable
  capability; the users API refuses to touch super_admin rows; it refuses the caller's own row.
- **Fail closed:** no row / query error / pre-migration ⇒ no capabilities. `disabled=true`
  beats everything including the transitional fallback (legacy `clients.role` founder/admin).
- **One gate:** `requireAdmin` = `getOperator(userId) !== null`; all admin pages AND all admin
  API routes funnel through `getOperator` (two-sided tested — pages and APIs cannot disagree).

## B. Operator-run cases (credit bypass = an absence, not a flag)

- `POST /api/admin/cases/run` drives the NORMAL pipeline; the credit deduction call simply
  does not exist on this path (proven by rpc-spy test — the deliberate hole is the absence).
- Provenance forever: `cases.origin='operator'` + `operator_meta`; attribution to the inert
  `operator-house` client row (0 credits). Audit row per run.
- Tier: STOP-2 RULED 2026-07-30 — operator picks `plan_type` per run, NO default.

## C. Rerun & attempt integrity (H1)

- Re-runs APPEND attempts; `cases.delivered_attempt` pins the frozen delivered record and no
  rerun path advances it. Attempt history renders every attempt; DELIVERED pin stays put.
- **Dispute-rerun on a delivered case** is a first-class button (review page, `rerun`
  capability, own confirm + audited reason) over the same guarded API path — the delivered
  report the client received never changes; `reinvestigation_pending` flags on completion.
- Refunds: STOP-3 RULED 2026-07-30 — Stripe-dashboard-only until post-Phase-J. NO refund
  write exists in the codebase; that absence is the ruled state.

## D. The client-boundary rule (the /admin/users lesson, 2026-07-30)

- `lib/supabase/admin.ts` carries `import "server-only"` — any client-bundle inclusion FAILS
  `next build` (proven two-sided). `clientBoundary.lock.test.ts` additionally walks the
  value-import graph of every `"use client"` module and fails on any path to a server-only
  module. Client-safe constants live in dependency-free modules (`lib/auth/capabilities.ts`,
  `lib/portal/*`). Consequence: founder-run tsx scripts need `--conditions=react-server`.

## E. ASIN intake (Keepa's dependency) & the frozen-contract threading pattern

- Guard: `lib/portal/asinIntake.ts` — one ASIN per brand, ≤ plan brand cap (from
  `PLAN_BRAND_CAPS` in code — `clients.max_brands_per_credit` is NULL everywhere and is NOT
  the authority), 10-char format, Scale-only progressive disclosure.
- Column: `cases.brand_asins jsonb` ({brand: ASIN}) — founder-run migration; persistence is
  loud-but-non-fatal until it lands; the value ALSO rides the pipeline payload, so nothing
  downstream is lost pre-migration.
- **Threading pattern:** `TrackContext` lives in FROZEN `contracts.ts`, so the field is an
  additive intersection type (`lib/research/intakeExtras.ts`, `TrackContextWithIntake`) that
  rides `...event.data` through the pipeline handler. Keepa reads it by typing against the
  intersection — contracts.ts stays byte-identical forever.

## F. Subscriber tier switch (Growth ⇄ Scale) — Option A RULED 2026-07-30

- `customer.subscription.updated` derives plan identity from the subscription PRICE
  (`planForPriceId`) → updates `plan_type`/`plan_category`, emits `upgrade`/`downgrade`
  billing events. The switch UI is Stripe's own portal (founder enables plan-switching in the
  Dashboard portal config).
- **Upgrade credits (Option A):** raise `credits_available` UP TO the new allotment via the
  atomic `raise_credits_to_allotment(client, floor)` RPC — `GREATEST(balance, floor)`,
  idempotent by construction (replays no-op; never stacks; grants nothing at/above allotment).
  A blind `+=` with read-then-write is exactly the H6 race the law forbids — the RPC is the
  law-faithful shape.
- **RIDER 1 (required — the farm killer):** at most ONE grant per billing period. Guard key:
  a `billing_audit` `upgrade` row whose notes start with the grant prefix, since the
  subscription's `current_period_start`. Without it, spend → downgrade → re-upgrade mints an
  allotment per swing for pennies of proration; GREATEST alone cannot close this (spending
  drops the balance below the floor). Fail-closed: missing period start or guard error = no
  grant. Test-proven: a second same-cycle upgrade calls no RPC.
- **RIDER 2:** downgrade = NO immediate clawback; the renewal rollover clamp
  (`LEAST(held, cap) + grant`) applies unchanged — that clamp IS the delayed clawback, by
  ruling, eyes-open.
- **Edge-6 alignment:** checkout's `activatePlan` update path uses the SAME RPC (one
  credit-raise semantic everywhere); new-client inserts seed the allotment directly;
  pre-migration the update path falls back loudly to the legacy absolute SET.

## H. Capability = the ACTIVE PLAN (Model 2, RULED 2026-07-30)

- Every capability gate reads PLAN, never a credit attribute — and none could: credits are a
  single integer (`clients.credits_available`); no per-credit rows/ledger/provenance exist.
  Gates: submission cap + ASIN guard read the LIVE plan; the case STAMPS `plan_type` at
  insert; run-time tracks gate on the stamped plan (`plan_gates`, Track 6 `CATEGORY_PLANS`);
  reruns re-read the case row — an old Growth case reruns as Growth after an upgrade.
- WHY Model 2: the plan defines the product, credits are quantity; per-credit capability would
  require a ledger + spend-ordering + provenance subsystem to prevent an arbitrage that does
  not exist (top-up packs cost identical dollars on both tiers); the submission-time stamp
  already blocks the only real abuse (retroactive upgrades of old cases). Keepa inherits this
  via the stamped plan + `brand_asins` threading — never a credit attribute.

## G. Two "N/A" renderings that are CORRECT BY DESIGN — do not "fix"

- **Track 5 (Sourcing Logic): `n_a` is structural.** Non-voting arbitration layer (sub-gate B,
  founder-ruled 2026-07-14). The scored path would make an empty set a `soft_fail` — a VOTE —
  so the non_voting branch sets `n_a` unconditionally; no weight keys can ever exist
  (registry-test-locked). The arbitration conclusion text is `reasoning_notes`, ADMIN-ONLY;
  the client string is the frozen constant `SOURCING_CLIENT_SUMMARY` ("Consistency check —
  informational; does not affect the verdict", exact wording founder-ruled 2026-07-14, OQ-D).
- **Track 4 (Documentation Review): absence is not a finding.** Zero uploads ⇒
  `nothing_to_review` ⇒ `n_a` + approved, never escalated (OQ-A3; the N2 anti-pattern killed).
  Distinct branch for uploaded-but-unreadable (escalates) — absence and unreadability are
  never conflated.

So billing is **two small builds** (`/pricing`, `/portal/settings/billing` +
2 API routes), not six pages.

## 6. IA additions (modular — slot in without redesign)

- **(marketing):** `/pricing` (real route — nav already points here)
- **(portal):** `/portal` (dashboard), `/portal/submit`, `/portal/cases/[id]`,
  `/portal/settings`, `/portal/settings/billing`
- **API:** `/api/checkout` (create Checkout session), `/api/billing-portal`
  (create Customer Portal session), `/api/webhooks/stripe` (already stubbed)
- **(admin):** `/admin/*` (later)

## 7. Recommended build order

1. ✅ Auth experience — sign-in / sign-up (done)
2. **Pricing page** (real `/pricing`) — decision-independent, converts, unblocks nav
3. Checkout + webhooks → Supabase (needs your Stripe account + products created)
4. Client Portal — dashboard, submit, case view (the core app)
5. Billing settings (thin + Stripe Customer Portal)
6. Admin dashboard

Steps 3+ need **your Stripe account**: create the products/prices from the
pricing table, add `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` to env/Vercel.
