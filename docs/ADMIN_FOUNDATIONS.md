# Admin Foundations — settled architecture (dev thread, 2026-08-02)

The record of the admin-architecture pass the UI thread designs against. Everything here is BUILT
and gated unless marked FOUNDER-RUN (migration) or DEFERRED (data-model design only).
Companion: `SAAS_ARCHITECTURE.md` addendum (§A–H) for the pre-existing admin layer.

## 1. Login — ONE role-gated `/admin` (confirmed; no subdomain)

All staff enter at the same `/admin`; `requireAdmin` → `getOperator` decides everything by ROLE +
capabilities + scope — no per-role URLs. Subdomain isolation was considered and NOT recommended
now: Clerk session cookies are already origin-scoped, the operator gate is server-side on every
page and API, and a subdomain adds deploy/env surface without closing any real hole at this
scale. Revisit only at Phase I alongside env separation if cookie-isolation paranoia becomes
warranted.

## 2. Invitations (WordPress-style) — ENGINEERED

Flow: super admin `POST /api/admin/invitations` {email, capabilities|preset:"full_access"} →
`admin_invitations` row (7-day expiry, one OPEN invitation per address) + Resend email with the
sign-up link (key-safe + banned-language-gated like every outbound email; an unsent email is
NON-FATAL — the response returns the link for manual sharing) → invitee signs up in Clerk
normally → on FIRST admin visit, `requireAdmin`'s null path calls `claimAdminInvitation`: the
pending invitation matching a CLERK-VERIFIED email materializes the `admin_permissions` sub_user
row (capabilities from the invitation, `created_by` = inviter), the invitation is stamped
accepted, both ends audited. `GET` lists; `DELETE /api/admin/invitations/[id]` revokes (pending
only — accepted users are disabled via the users API, one door per act).

Security shape: claim-by-verified-email, no token in the mail (Clerk owns email verification; the
invitation was created FOR that address by a super admin — possession of the verified address is
the credential). Only `sub_user` can ever be minted; super_admin stays founder-seeded SQL.
**Founder dependency: Clerk email verification stays ON (default).**

## 3. Capabilities — the exact list (UI thread: these are the checkboxes)

From `lib/auth/capabilities.ts` (validated everywhere via `CAPABILITIES`; text[] column, no DB
migration needed to extend):

| Capability | Grants | Grantable? |
|---|---|---|
| `view_cases` | see/read cases | ✅ |
| `review_publish` | publish/override verdicts | ✅ |
| `run_case` | operator-run intake (no credit charged) | ✅ |
| `rerun` | request re-investigation incl. dispute-rerun | ✅ |
| `adjust_credits` | credit adjust via H6 RPCs (reason required, audited) | ✅ |
| `view_billing` | read-only Stripe views (invoices/payments) | ✅ |
| `view_all_clients` | **the scoping elevation** — all clients vs assigned-only | ✅ |
| manage-users | invite/assign/disable staff | ⛔ NEVER — it IS the super_admin role |
| refund | — | ⛔ ABSENT by STOP-3 ruling (dashboard-only until post-Phase-J); name reserved |

`FULL_ACCESS` preset = all seven grantable. No-self-escalation stays three-way structural
(role-not-cap · API refuses super_admin rows · API refuses own row) and the invitation claim
path can also only mint sub_user.

## 4. CLIENT PARTITIONING — the net-new axis (BUILT)

Capabilities = what ACTIONS; scope = WHICH CLIENTS. Rules (founder-ruled): super_admin always
all · sub_user default assigned-only (`staff_client_assignments`) · `view_all_clients` = the
grantable elevation · transitional legacy operators see all (fallback retires at Phase I).

Enforcement — ONE computation, TWO seams:
- **Pages:** `requireAdmin` returns `clientScope` (`null` = unrestricted, `string[]` = assigned
  ids, fail-closed empty). Dashboard/cases/clients lists filter through it in the data layer
  (`getAdminDashboard/getAllCasesAdmin/getAdminClients` take a scope param); client-detail and
  case-review pages 404 out-of-scope ids (existence not even confirmed).
- **APIs:** every client-id/case-id admin route guards via `clientInScope`/`caseInScope`
  (clients/[id] GET+destructive, notes, credits, review, questions, outcome). Assignments write
  side: `GET/POST/DELETE /api/admin/clients/[id]/assignments` — super-admin only, audited,
  refuses super_admin targets (assignment would be meaningless).

**RLS interaction (flagged, no conflict):** enforcement is app-layer at the data/API seam —
the service-role client bypasses RLS by design, so DB policies would not bind these reads
anyway. The Phase-I RLS suite (tracker 1.10) concerns CLIENT tenancy; when it lands, it can add
DB-level staff policies keyed on this SAME assignments table — one source of truth, additive.

Test-locked (`clientScope.test.ts`): the elevation matrix · assigned-only filtering · FAIL
CLOSED on missing table/query error (empty scope, never everything) · super_admin bypass.

## 5. Billing / credits / refunds — wired "hard-forward" (no new money logic)

`lib/data/clientAccounting.ts` → `getClientAccounting(clientId)` is the ONE read the UI calls
for the accounting section. It reorganizes existing plumbing only: credits held + used-this-cycle
(clients row) · per-case usage (`cases.credits_charged`) · credit adjustments (the audited
credit-adjust rows) · plan events (`billing_audit`: new/upgrade/downgrade/cancel/resume +
Option-A grant notes) · invoices/payments (read-only Stripe views). Writes stay where they are:
adjust = `/api/admin/clients/[id]/credits` (H6 RPCs, reason required) · refunds = STOP-3,
Stripe-dashboard-only, NO write exists.

## 6. Audit coverage (confirmed + extended)

Already audited: operator-run · credit adjust (delta/balance/reason) · review decisions ·
question CRUD · sub_user create + capability/disable changes · client delete. **Extended this
pass:** invitation created · invitation revoked · invitation accepted (claim) · client assigned ·
client unassigned. All in `audit_log`, uniform shape (actor, action, payload).

## 7. Deferred features — DATA MODEL DESIGNS (accommodate, don't build)

Nothing below is built or migrated; DDL is design-final so the later build is additive, and the
UI thread can build page SHELLS against these shapes.

**7a. Acquisition system** (invite links + coupons + affiliate — see
`DEFERRED_acquisition_system_spec.md`; one mechanism, two delivery modes):
```sql
CREATE TABLE acquisition_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('invite_link','coupon')),
  code text UNIQUE NOT NULL,                    -- the link slug OR the typed coupon code
  value_type text NOT NULL CHECK (value_type IN ('free_report','percent_discount')),
  value int NOT NULL,                           -- 1 (report) or 10..100 (percent)
  max_redemptions int,                          -- NULL = unlimited
  expires_at timestamptz,
  created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  disabled boolean NOT NULL DEFAULT false, notes text
);
CREATE TABLE grant_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id uuid NOT NULL REFERENCES acquisition_grants(id),
  client_id text NOT NULL REFERENCES clients(id),
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  stripe_ref text, credits_granted int NOT NULL DEFAULT 0,
  UNIQUE (grant_id, client_id)                  -- one redemption per client per grant
);
```
Fits the existing model with zero rework: free-report redemption = the EXISTING
`add_client_credits` RPC + a `billing_audit` row (vocabulary gains `grant_redeemed` — the
BillingEvent union is code-side, additive); percent-discount = a Stripe coupon/promotion-code at
checkout (Stripe-native); affiliate back-end links via the EXISTING `clients.referral_code` /
`referred_by` columns (tracker 7.3) — grants carry `created_by`+`code`, so attribution is a join,
not a new column. Admin shell = create/track pages over these two tables.

**7b. Bulk upload** (10–50 brands/suppliers, batch scan):
```sql
CREATE TABLE bulk_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text REFERENCES clients(id), created_by text NOT NULL,
  label text, created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','queued','running','complete','cancelled'))
);
ALTER TABLE cases ADD COLUMN batch_id uuid REFERENCES bulk_batches(id);  -- additive, nullable
```
A batch is a grouping over ORDINARY cases — the pipeline, credits, and H1 all apply per-case
unchanged; no engine work implied. Shell = a batches list + detail page.

**7c. Brand / Supplier database:** NO new tables needed — the institutional-memory corpus already
exists (`vendor_intelligence`, `intelligence_events` append-only, `case_outcomes`). The pages are
read-only views over those, restricted (suggest gating on `view_cases` initially). The only
later addition is the 6.2 relationship-records backfill, already tracked. Shell = two restricted
read pages.

## 8. Helpdesk / wiki (NOT built — recommendations per the cost-discipline ruling)

Helpdesk: the app already HAS `support_requests` + admin views + Resend alerts — for launch
volume, that plus a shared inbox is enough. Lightest free external option when needed:
**Tawk.to** (free live-chat+ticketing) or a plain shared mailbox; both integrate later without
schema impact. Client wiki/how-to/blog → **Sanity** (marketing/content lane). Internal staff
docs → repo docs (the docs thread, next).

## 9. Migration the founder runs (ONE, additive, fail-closed until then)

`supabase/migrations/20260802000000_admin_invitations_and_assignments.sql` — `admin_invitations`
+ `staff_client_assignments` (+ read-back queries in the file). Until it runs: invitations API
500s loudly; scoped sub-users see empty lists (fail closed); the founder (super_admin) is
entirely unaffected. There are no other operators today, so it can run at leisure.

## 10. Architecture flags (spotted during the pass)

1. **STOP-3 tension in the brief:** "credit-adjust/refund" listed as one grantable — refunds are
   RULED dashboard-only until post-Phase-J (tracker 4.15). Kept `adjust_credits` only; `refund`
   reserved. The founder re-rules at Phase J, not here.
2. **Legacy transitional fallback widens scope:** a `clients.role='admin'` row (none exist today)
   would see ALL clients via the fallback. Fine now; retire the fallback at Phase I (already the
   plan) so partitioning is the only path.
3. **Claim depends on Clerk email verification staying on** (§2) — default, but now load-bearing.
4. **`getClientScope` cost:** one extra query per request for SCOPED sub-users only (none exist
   yet); super_admin pays nothing. If staff count grows, cache per-request — not needed now.
5. **Invoice branding (4.9)** stays a founder Stripe-dashboard task — nothing in code blocks it.
