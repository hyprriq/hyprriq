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

**Single report ($79/$197) → pay-first (low friction):**
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
