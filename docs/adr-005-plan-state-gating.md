# ADR-005: Plan-state gating for the portal

**Status:** Accepted
**Date:** 2026-06-20
**Deciders:** Gautam (founder)

## Context
Live testing showed a user with no plan (`plan_type IS NULL`) can walk the entire
portal — Dashboard, New Case, the full 3-step Submit — and is only blocked at Step 3
with "Not enough credits" and a red `-1`. Gating at the last step is the wrong place
and reads as broken. We need access tied to account state, enforced once and reused.

## Decision
A single derivation, `deriveAccess(client)` in `lib/data/access.ts`, returns the
account state + a capability set. Every gated route and the sidebar read from it —
no per-page copy-pasted checks.

| State | Definition | Access |
|---|---|---|
| `no_plan` | `plan_type IS NULL` | Dashboard = upgrade prompt (not "0" KPIs). Submit/Cases/Case-detail blocked at route level → redirect to Billing. Billing + Help reachable. |
| `active` | `plan_type` set, `billing_status='active'` (or `trialling`) | Full access (unchanged). |
| `expired` | `plan_type` set, `billing_status IN ('cancelled','past_due')` | Read-only: Completed Reports + past Case Detail only. Submit/New blocked. "Reactivate" CTA always visible. |

This also removes the `-1`/submit-past-zero dead-end at the **root cause**: no-plan
users never reach Submit, so the broken end state is unreachable. No separate
credit-check patch.

## Options considered
- **Next.js middleware** — runs before render, but it can't cheaply read the Supabase
  `clients` row per request (Clerk gives the user id; plan state lives in Supabase),
  and our matcher would need a DB round-trip in the edge middleware. Rejected: wrong
  layer for a DB-derived rule.
- **Per-page inline checks** — what we have for auth; duplicative and drifts. Rejected.
- **Shared `deriveAccess` + thin per-route guard helpers** (chosen) — one pure function
  off the already-fetched client row (each page fetches the client once via
  `requireOnboardedClient`), plus `requireSubmitAccess()` / access-aware rendering.
  Low complexity, no extra DB calls, consistent.

## Two judgment calls (flagged per standing instruction)
1. **No-plan Dashboard = centered upgrade prompt**, not blurred KPI cards behind an
   overlay. Less code, no risk of showing "0" everywhere, and the CTA is unmissable.
   (MD left this to my call.)
2. **Dev view-switcher gate = `VERCEL_ENV !== 'production'`, NOT `NODE_ENV`.** ⚠️
   Vercel sets `NODE_ENV='production'` on *preview/staging* builds too — using it would
   hide the switcher on staging, defeating the purpose. `VERCEL_ENV` is `'preview'` on
   staging and `'production'` only on the prod domain. Switcher additionally requires
   `client.is_admin`, so a regular client never sees it and `/admin/*` stays guarded by
   `requireAdmin()` regardless. Defense in depth.

## Consequences
- Easier: one place to change access rules; new gated routes just call the guard.
- Harder: `billing_status` must be kept correct by the Stripe webhook (not yet built) —
  until then `expired` only triggers if set manually. Flagged.
