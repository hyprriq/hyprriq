# Pre-Design Dev Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the six BLOCKS-DESIGN items from the 2026-08-07 gap audit (HANDOVER_DEV_COMPLETE.md §5) so the UI/UX design lane starts on honest ground.

**Architecture:** Six independent fixes, one commit each, ordered so file collisions never happen (the husk excision touches the same files as the change-request entry, so it goes first). Every new client-facing string joins `MUST_PASS` in `lib/utils/bannedLanguage.fix.test.ts` in the SAME commit (standing law). No frozen-engine files are touched. No DB writes. The one external item (live Stripe Scale product description) is DESCRIBE-AND-STOP for the founder.

**Founder rulings driving this plan (2026-08-07, this session):**
1. Pre-design batch chosen over opening design directly.
2. Emails: **delivery notification only** this batch (submission-confirm / payment-failed / cancel-confirm stay on the ledger). Resend account/env setup is the founder's step; code ships gated and degrades soft.
3. `single_149` display name RULED: **"Complete Report"** (placeholder promoted).
4. Dead links (footer Terms/Privacy/About, /sample-report.pdf): **removed**, return when the legal-pages ruling lands.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, Tailwind, Resend (gated via `lib/email/notify.ts`).

**Gates after every task:** targeted `npx vitest run <files>` green; after the last task the full battery: `npx vitest run` (expect 1076+ passing, exit 0 unpiped), `npx tsc --noEmit` (0), `npx eslint .` (0 errors), `npm run build` clean.

---

### Task 0: Record the rulings in the tracker

**Files:**
- Modify: `docs/HyprrIQ_OPEN_ITEMS.md` (THE SSOT)

- [ ] **Step 1: Read the tracker's ruling-log section** to find the append point (the file has a dated rulings section; match its format).

- [ ] **Step 2: Append the four rulings above** (pre-design batch chosen; delivery-email-only; "Complete Report" ruled — also update any `[name=UNRULED placeholder]` marker; dead-links-removed), dated 2026-08-07, and mark the §5 blocks-design items as IN PROGRESS this batch.

- [ ] **Step 3: Also update `lib/constants/plans.ts:55-56`** — the `PLAN_NAME.single_149` comment says "UNRULED placeholder"; change to `// FOUNDER-RULED 2026-08-07: "Complete Report" is the client-facing tier name.`

- [ ] **Step 4: Commit**

```bash
git add docs/HyprrIQ_OPEN_ITEMS.md lib/constants/plans.ts
git commit -m "docs: pre-design batch OPENED (founder-ruled 2026-08-07): six blocks-design items from the gap audit; rulings recorded - delivery email ONLY this batch (other 3 transactional emails stay on ledger), single_149 display name RULED 'Complete Report' (placeholder promoted), dead links REMOVED until legal-pages ruling"
```

---

### Task 1: Excise the dead client-facing husks (audit item 5)

`awaiting_client` has no writer → the Action Required tab, its count badge, the amber rows, and the dashboard branches are dead. `queue_position` has no writer → the "Queue #N" pill is dead. The client findings allowlist strips the `questions` key → `extractQuestions` always returns `[]` and the legacy-questions branch is dead. `awaiting_client` STAYS in the `CaseStatus` type and `STATUS_META` (they mirror the DB CHECK; an inert Record entry renders any hand-edited row correctly) — only reachable UI is excised.

**Files:**
- Modify: `lib/data/cases.ts` (CaseFilter, filterCases, CaseRow, LIST_COLUMNS)
- Modify: `app/(portal)/portal/cases/page.tsx` (Action Required tab)
- Modify: `components/portal/case-table.tsx` (Queue pill, amber row)
- Modify: `app/(portal)/portal/dashboard/page.tsx` (awaiting_client branches)
- Modify: `components/portal/case-detail-view.tsx` (extractQuestions + legacy branch)
- Modify: `components/portal/badges.tsx` (isActionRequired, if unimported)

- [ ] **Step 1: Find every test and importer touching the husks** so nothing breaks blind:

```bash
grep -rn "isActionRequired\|filterCases\|queue_position" --include="*.ts" --include="*.tsx" lib components app | grep -v node_modules
```

Expected: `isActionRequired` only defined in badges.tsx (remove it); `filterCases` used in cases/page.tsx and possibly a test; `queue_position` in cases.ts + case-table.tsx (+ admin files, which are OUT of scope — leave admin untouched).

- [ ] **Step 2: `lib/data/cases.ts`** — remove `"action"` from `CaseFilter` and its `filterCases` case; remove `queue_position` from `CaseRow` and `LIST_COLUMNS`:

```ts
export type CaseFilter = "all" | "active" | "completed";
```

```ts
// CaseRow: delete the line `queue_position: number | null;`
// LIST_COLUMNS: delete `queue_position, ` from the select string
```

In `filterCases`, delete the `case "action":` branch. Leave a one-line comment at the type: `// "action" filter + queue_position EXCISED 2026-08-07 (gap audit §5.5): awaiting_client / queue_position have no writer.`

- [ ] **Step 3: `app/(portal)/portal/cases/page.tsx`** — remove the `{ key: "action", label: "Action Required" }` tab entry, the `actionCount` computation (line 33), the count-badge JSX inside the tab loop (lines 57–65), the `"action"` case in `normalize()`, and the `"action"` empty-label branch.

- [ ] **Step 4: `components/portal/case-table.tsx`** — in `RowAction`, delete the `queue_position` pill branch (lines 32–38); in the row class, delete the ternary `${c.status === "awaiting_client" ? "bg-verify-bg/60" : ""}` (keep the template string clean).

- [ ] **Step 5: `app/(portal)/portal/dashboard/page.tsx`** — in `activityFor`, delete the `awaiting_client` warn branch (line 52); in `slaRisk` (line 128) and `deadlines` (line 131), delete the `c.status !== "awaiting_client" &&` conditions. The `"warn"` tone handling in the activity JSX can stay (harmless) unless eslint flags it unused.

- [ ] **Step 6: `components/portal/case-detail-view.tsx`** — delete `extractQuestions` (lines 54–72), the `legacyQuestions` const (line 97), and the legacy-questions JSX branch (lines 262–280 — the whole `: legacyQuestions.length === 0 ? ... : (...)` becomes the plain empty-state):

```tsx
          {richQuestions.length > 0 ? (
            /* existing richQuestions block unchanged */
          ) : (
            <div className="rounded-card border border-line bg-surface p-10 text-center text-sm text-muted">
              Supplier questions will appear here once research completes.
            </div>
          )}
```

- [ ] **Step 7: `components/portal/badges.tsx`** — delete `isActionRequired` (lines 28–30) if Step 1 confirmed no importer. Keep the `awaiting_client` type member and `STATUS_META` entry with a comment: `// awaiting_client: DB-legal, no writer (2026-08-07) — inert mapping kept for Record completeness.`

- [ ] **Step 8: Run the affected tests + typecheck**

```bash
npx vitest run lib/data components/portal lib/portal/case-status.test.ts
npx tsc --noEmit
```

Expected: green / 0 errors. If a test asserted the `"action"` filter, update it to the new three-value CaseFilter (the behavior under test is gone, not broken).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "DEAD CLIENT-FACING HUSKS EXCISED (gap audit 5.5, founder-ruled batch 2026-08-07): Action Required tab/count/amber rows (awaiting_client has NO writer), Queue #N pill (queue_position NO writer - dropped from CaseRow+select), legacy-questions branch (allowlist strips the key; extractQuestions was structurally always []). CaseStatus type + STATUS_META keep awaiting_client as inert DB-mirror entries. Admin surfaces untouched"
```

---

### Task 2: Change-request entry point (audit item 1)

The feature at `app/(portal)/portal/cases/[id]/change/page.tsx` is fully built, Help FAQ promises it, and nothing links to it. Fix: shared eligibility helper + a link in the delivered banner.

**Files:**
- Create: `lib/portal/changeRequest.ts`
- Create: `lib/portal/changeRequest.test.ts`
- Modify: `components/portal/case-detail-view.tsx` (delivered banner)
- Modify: `app/(portal)/portal/cases/[id]/change/page.tsx` (DRY: consume the helper)
- Modify: `lib/utils/bannedLanguage.fix.test.ts` (MUST_PASS, same commit)

- [ ] **Step 1: Write the failing test** — `lib/portal/changeRequest.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { changeRequestOpen } from "./changeRequest";

const future = new Date(Date.now() + 3 * 86_400_000).toISOString();
const past = new Date(Date.now() - 1 * 86_400_000).toISOString();

describe("changeRequestOpen — the delivered-view entry-point gate (gap audit 5.1)", () => {
  it("open: delivered, unused, deadline in the future", () => {
    expect(changeRequestOpen({ status: "delivered", change_request_deadline: future, change_request_used: false })).toBe(true);
  });
  it("open on complete too (delivered||complete is the frozen-delivered pair)", () => {
    expect(changeRequestOpen({ status: "complete", change_request_deadline: future, change_request_used: false })).toBe(true);
  });
  it("closed: not delivered", () => {
    expect(changeRequestOpen({ status: "research_running", change_request_deadline: future, change_request_used: false })).toBe(false);
  });
  it("closed: already used", () => {
    expect(changeRequestOpen({ status: "delivered", change_request_deadline: future, change_request_used: true })).toBe(false);
  });
  it("closed: deadline passed", () => {
    expect(changeRequestOpen({ status: "delivered", change_request_deadline: past, change_request_used: false })).toBe(false);
  });
  it("closed: no deadline set", () => {
    expect(changeRequestOpen({ status: "delivered", change_request_deadline: null, change_request_used: false })).toBe(false);
  });
});
```

- [ ] **Step 2: Run it — expect FAIL** (`Cannot find module './changeRequest'`):

```bash
npx vitest run lib/portal/changeRequest.test.ts
```

- [ ] **Step 3: Implement `lib/portal/changeRequest.ts`:**

```ts
// PRE-DESIGN BATCH (2026-08-07, gap audit 5.1): the change-request feature was fully built with
// ZERO entry points. This is the ONE shared eligibility read — the change page re-guards
// server-side (including access.canRequestChange); this only decides whether an entry link shows.
export function changeRequestOpen(c: {
  status: string;
  change_request_deadline: string | null;
  change_request_used: boolean;
}): boolean {
  const delivered = c.status === "delivered" || c.status === "complete";
  return (
    delivered &&
    !c.change_request_used &&
    !!c.change_request_deadline &&
    new Date(c.change_request_deadline).getTime() > Date.now()
  );
}
```

- [ ] **Step 4: Run the test — expect PASS.**

- [ ] **Step 5: Wire the entry link** in `components/portal/case-detail-view.tsx`. Import `{ changeRequestOpen } from "@/lib/portal/changeRequest"`, then extend the delivered banner (the `✓ Report delivered` block):

```tsx
          {c.status === "delivered" || c.status === "complete" ? (
            <div className="mb-5 rounded-lg border border-clear-ink/30 bg-clear-bg px-4 py-3">
              <div className="text-[14px] font-semibold text-clear-ink">
                ✓ Report delivered{c.delivered_at ? ` on ${fmt(c.delivered_at)}` : ""}.
              </div>
              <div className="mt-0.5 text-[13px] text-ink-2">
                Your full verdict and evidence are below. Downloadable PDF export is coming soon.
              </div>
              {changeRequestOpen(c) && (
                <Link
                  href={`/portal/cases/${c.id}/change`}
                  className="mt-1.5 inline-block text-[13px] font-semibold text-brand hover:underline"
                >
                  Spotted something off? Request a change (one included, 7-day window) →
                </Link>
              )}
            </div>
          ) : null}
```

- [ ] **Step 6: DRY the change page** — in `app/(portal)/portal/cases/[id]/change/page.tsx`, replace the local `isDeadlineOpen` usage in `eligible` with the helper (keep `daysLeftUntil` for display):

```ts
import { changeRequestOpen } from "@/lib/portal/changeRequest";
// ...
const delivered = c.status === "delivered" || c.status === "complete";
const eligible = access.canRequestChange && changeRequestOpen(c);
```

Delete the now-unused `isDeadlineOpen` (keep `delivered` — the ineligible-state copy branches on it).

- [ ] **Step 7: MUST_PASS same commit** — in `lib/utils/bannedLanguage.fix.test.ts`, add to the pricing-ladder section of `MUST_PASS`:

```ts
  ["change-request entry link (2026-08-07 batch)", "Spotted something off? Request a change (one included, 7-day window)"],
```

- [ ] **Step 8: Run tests + typecheck**

```bash
npx vitest run lib/portal/changeRequest.test.ts lib/utils/bannedLanguage.fix.test.ts
npx tsc --noEmit
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "CHANGE-REQUEST ENTRY POINT (gap audit 5.1): the fully-built feature finally has a door - delivered banner links /portal/cases/[id]/change, gated by the new shared changeRequestOpen() (delivered||complete + unused + deadline open; the page re-guards server-side incl. canRequestChange); change page DRYed onto the same helper; entry string in MUST_PASS same commit"
```

---

### Task 3: Delivery notification email (audit item 2, founder-ruled scope: delivery only)

Marketing says "Delivered to your email"; the publish route notifies nobody. Build `sendDeliveryNotification` in the existing gated notify helper (banned-language gate + key-safety identical to every sibling), call it from the publish path non-fatally, audit-log the outcome.

**Files:**
- Modify: `lib/email/notify.ts`
- Modify: `lib/email/notify.test.ts`
- Modify: `app/api/admin/cases/[id]/review/route.ts`
- Modify: `lib/utils/bannedLanguage.fix.test.ts` (MUST_PASS, same commit)

- [ ] **Step 1: Write the failing tests** — append to `lib/email/notify.test.ts` (import `sendDeliveryNotification` alongside the existing imports):

```ts
describe("delivery notification (2026-08-07 batch — gap audit 5.2, founder-ruled delivery-only)", () => {
  const base = { to: "client@example.com", caseNumber: "AWI-2607-022", vendorName: "Acme Distribution", caseUrl: "https://hyprriq.com/portal/cases/abc" };

  it("a clean delivery notice sends to the client", async () => {
    const r = await sendDeliveryNotification(base);
    expect(r.sent).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0].to).toBe("client@example.com");
    expect(sendMock.mock.calls[0][0].subject).toContain("AWI-2607-022");
  });

  it("a banned-language vendor name blocks the send (the gate covers interpolated fields)", async () => {
    const r = await sendDeliveryNotification({ ...base, vendorName: "Suspension-Proof Wholesale" });
    expect(r).toEqual({ sent: false, reason: "banned_language" });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("no API key → {sent:false, no_api_key} — never throws", async () => {
    delete process.env.RESEND_API_KEY;
    const r = await sendDeliveryNotification(base);
    expect(r).toEqual({ sent: false, reason: "no_api_key" });
  });

  it("no recipient on file → {sent:false, no_recipient}", async () => {
    const r = await sendDeliveryNotification({ ...base, to: null });
    expect(r).toEqual({ sent: false, reason: "no_recipient" });
    expect(sendMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (no export):

```bash
npx vitest run lib/email/notify.test.ts
```

- [ ] **Step 3: Implement in `lib/email/notify.ts`** (after `sendAdminInvitation`):

```ts
// ── PRE-DESIGN BATCH (2026-08-07, gap audit 5.2, founder-ruled delivery-only): the delivery
// notification. Same gate, same key-safety as every sibling: a skipped send is non-fatal — the
// delivered case row is the durable record and the portal shows the report either way. The
// caller audit-logs {sent/reason}. Resend account + RESEND_API_KEY/RESEND_FROM env are the
// founder's setup step; until then this returns {sent:false, reason:"no_api_key"} silently. ──
export async function sendDeliveryNotification(opts: {
  to: string | null;
  caseNumber: string;
  vendorName: string | null;
  caseUrl: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const subject = `Your HyprrIQ report ${opts.caseNumber} is ready`;
  const html = `<p>Your source intelligence report${opts.vendorName ? ` for ${opts.vendorName}` : ""} (case ${opts.caseNumber}) has been delivered.</p>
<p><a href="${opts.caseUrl}">View your report</a> — the verdict, the evidence behind it, and the questions to ask your supplier are ready in your portal.</p>
<p>Questions about the report? Use the support page in your portal and we&rsquo;ll pick it up.</p>`;
  if ((await emailGate("delivery_notification", subject, [html])).length > 0) return { sent: false, reason: "banned_language" };
  if (!emailEnabled()) return { sent: false, reason: "no_api_key" };
  if (!opts.to) return { sent: false, reason: "no_recipient" };
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from: from(), to: opts.to, subject, html });
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "send_failed" };
  }
}
```

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Wire the publish path** in `app/api/admin/cases/[id]/review/route.ts`:

(a) Import: `import { sendDeliveryNotification } from "@/lib/email/notify";`

(b) Add `client_id` to the case select (line 66):

```ts
    .select("id, case_number, status, verdict, vendor_name, vendor_website, brands_submitted, brands_confirmed, marketplace, plan_type, supplier_identity, client_id")
```

(c) After the `seedCaseOutcome` block (line 176) and before the final return, add:

```ts
  // PRE-DESIGN BATCH (2026-08-07, gap audit 5.2): delivery notification — the marketing promise
  // ("delivered to your email") gets a sender. Non-fatal like every notify path: delivery already
  // happened; the outcome (sent / skip reason) is audit-logged, never surfaced as an error.
  {
    const { data: owner } = await supabaseAdmin
      .from("clients").select("email").eq("id", c.client_id).maybeSingle();
    const origin = new URL(req.url).origin;
    const notified = await sendDeliveryNotification({
      to: owner?.email ?? null,
      caseNumber: c.case_number,
      vendorName: c.vendor_name,
      caseUrl: `${origin}/portal/cases/${id}`,
    });
    await supabaseAdmin.from("audit_log").insert({
      table_name: "cases", record_id: id, action: "UPDATE",
      actor_id: userId, actor_type: "admin",
      new_value: { delivery_email: notified.sent ? "sent" : `skipped:${notified.reason ?? "unknown"}` },
    });
  }
```

- [ ] **Step 6: MUST_PASS same commit** — add to `lib/utils/bannedLanguage.fix.test.ts`:

```ts
  // — delivery notification (2026-08-07 batch) —
  ["delivery email subject", "Your HyprrIQ report AWI-2607-022 is ready"],
  ["delivery email body line 1", "Your source intelligence report for Acme Distribution (case AWI-2607-022) has been delivered."],
  ["delivery email body line 2", "View your report — the verdict, the evidence behind it, and the questions to ask your supplier are ready in your portal."],
  ["delivery email body line 3", "Questions about the report? Use the support page in your portal and we'll pick it up."],
```

- [ ] **Step 7: Run tests + typecheck**

```bash
npx vitest run lib/email/notify.test.ts lib/utils/bannedLanguage.fix.test.ts
npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "DELIVERY NOTIFICATION EMAIL (gap audit 5.2, founder-ruled 2026-08-07 delivery-only; submission-confirm/payment-failed/cancel-confirm stay on ledger): sendDeliveryNotification in the gated notify helper (banned-language gate incl. interpolated vendor name, key-safe no_api_key/no_recipient soft-skip) wired into the publish path post-delivery NON-FATAL with the outcome audit-logged; Resend account + RESEND_API_KEY/RESEND_FROM env remain the founder's setup step - code degrades soft until set. Email strings in MUST_PASS same commit"
```

---

### Task 4: Billing rebuy + dashboard plan-card honesty (audit item 3)

"Buy another report" hardcodes `single_99` — a Complete Report ($149) client gets charged $99 and `activatePlan` downgrades their `plan_type`. The dashboard plan card renders "$149/mo • 1 credits/month" for one-time buyers.

**Files:**
- Modify: `app/(portal)/portal/billing/page.tsx:84`
- Modify: `app/(portal)/portal/dashboard/page.tsx:224`

- [ ] **Step 1: Billing rebuy** — in `app/(portal)/portal/billing/page.tsx`, the one-time branch (line 83–88): replace `plan="single_99"` with `plan={plan}`:

```tsx
                  <CheckoutButton
                    plan={plan}
                    className="rounded-lg border border-line bg-surface px-4 py-2 text-[14px] font-semibold text-ink-2 hover:bg-subtle"
                  >
                    Buy another report →
                  </CheckoutButton>
```

(`plan` is non-null inside this branch and one_time here means `single_99 | single_149` — the client rebuys their own tier, so `activatePlan` re-sets the same `plan_type`; the $149→$99 charge-and-downgrade trap is gone.)

- [ ] **Step 2: Dashboard plan card** — in `app/(portal)/portal/dashboard/page.tsx`, add `PLAN_CADENCE` and `PLAN_CATEGORY` to the `@/lib/constants/plans` import, then replace line 223–225:

```tsx
              <div className="mt-0.5 text-[13px] text-muted">
                {PLAN_PRICE_LABEL[plan]} {PLAN_CADENCE[plan]} •{" "}
                {PLAN_CATEGORY[plan] === "one_time"
                  ? `${planTotal} report${planTotal === 1 ? "" : "s"}`
                  : `${planTotal} credits/month`}{" "}
                • up to {PLAN_BRAND_CAPS[plan]} brands
              </div>
```

One-time now reads "$149 one-time • 1 report • up to 3 brands" instead of "$149/mo • 1 credits/month".

- [ ] **Step 3: Typecheck + lint the two files**

```bash
npx tsc --noEmit
npx eslint app/(portal)/portal/billing/page.tsx app/(portal)/portal/dashboard/page.tsx
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "BILLING REBUY + PLAN-CARD HONESTY (gap audit 5.3): 'Buy another report' now charges the client's OWN one-time tier (plan={plan}, was hardcoded single_99 - the $149-charged-$99-and-downgraded trap is gone; activatePlan re-sets the same plan_type); dashboard plan card is cadence-aware via PLAN_CADENCE/PLAN_CATEGORY (one-time reads 'one-time - 1 report', never '/mo - 1 credits/month')"
```

---

### Task 5: Growth→Scale upgrade path (audit item 4)

Dashboard "Upgrade to Scale →" sends Growth subscribers to billing, where subscribers have no upgrade control. Real path = Stripe portal; say so and hand them the button.

**Files:**
- Modify: `app/(portal)/portal/billing/page.tsx` (new Change-plan card for Growth)
- Modify: `lib/utils/bannedLanguage.fix.test.ts` (MUST_PASS, same commit)

- [ ] **Step 1: Add the Change-plan card** in `app/(portal)/portal/billing/page.tsx`, directly after the Top-Up Credits card block (after line 164):

```tsx
        {plan === "growth_279" && (
          <Card title="Change Plan">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-md text-[14px] text-ink-2">
                Moving between Growth and Scale is handled securely in Stripe — open your subscription to switch plans.
              </p>
              <StripePortalButton className="shrink-0 rounded-lg bg-brand px-4 py-2 text-[14px] font-semibold text-white hover:bg-brand-hover">
                Change plan in Stripe →
              </StripePortalButton>
            </div>
          </Card>
        )}
```

(Scale has nothing to upgrade to; one-time plans already have the "Upgrade to a subscription" card. The dashboard CTA keeps pointing at `/portal/billing`, which is no longer a dead-end. ⚠ FOUNDER LEDGER: Stripe portal plan-switch config is UNVERIFIED (handover §2) — verify it before announcing this to clients.)

- [ ] **Step 2: MUST_PASS same commit:**

```ts
  ["plan-change card copy (2026-08-07 batch)", "Moving between Growth and Scale is handled securely in Stripe — open your subscription to switch plans."],
```

- [ ] **Step 3: Run + typecheck**

```bash
npx vitest run lib/utils/bannedLanguage.fix.test.ts
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "GROWTH-TO-SCALE PATH UN-DEAD-ENDED (gap audit 5.4): billing gets a Change Plan card for growth_279 pointing at the Stripe portal (the real switch mechanism) via StripePortalButton; dashboard CTA now lands somewhere honest. FOUNDER VERIFY REMAINS: Stripe portal plan-switch config unverified (handover section 2). String in MUST_PASS same commit"
```

---

### Task 6: Marketing copy vs the shipped ladder + dead links (audit item 6)

Marketing sells 5 brands + 14-field doc review on $99 (ruled: 3 brands, 3 dimensions, no uploads), claims "read-only" portal for Single (false), omits the $149 tier entirely, carries Keepa lines while `KEEPA_LIVE=false`, links a 404 sample PDF, and the footer legal links are `href="#"`. Ruled: Complete Report is the $149 name; dead links removed. **Law: upload caps NEVER appear in pricing copy. Retired figures ($79/$129/$239/$197/$249) never appear (lock test enforces).**

**Files:**
- Modify: `lib/content/pricing.ts` (full copy rewrite)
- Modify: `app/(marketing)/page.tsx` (PLANS Keepa line, single-report line, sample-PDF link)
- Modify: `components/marketing/faq.tsx` (brand-count + try-first answers)
- Modify: `components/marketing/site-footer.tsx` (dead links)
- Modify: `lib/utils/bannedLanguage.fix.test.ts` (MUST_PASS — import the real constants)

- [ ] **Step 1: Rewrite `lib/content/pricing.ts`:**

```ts
// Marketing copy lives here, not hardcoded in JSX (ADR-004). UI labels stay in
// the components. Pricing ladder (founder-ruled 2026-08-07): Single $99 one-time
// (3 brands, 3 dimensions) · Complete Report $149 one-time (3 brands, all 5
// dimensions + category compliance, document review) · Growth $279/mo (5 brands,
// 5/mo) · Scale $499/mo (5 brands, 12/mo, + category compliance). Upload caps
// NEVER appear in pricing copy (standing law). Keepa lines removed while
// KEEPA_LIVE=false (lib/constants/plans.ts).

export const pricingHero = {
  title: "Costs less than one bad buy.",
  subtitle:
    "Try a single report, or subscribe for regular sourcing. Either way, you pay for clarity before the capital moves — not after.",
};

export type PlanId = "single_99" | "single_149" | "growth_279" | "scale_499";

export type Plan = {
  id: PlanId;
  name: string;
  price: string;
  cadence: string;
  meta: string;
  points: string[];
  popular: boolean;
};

export const subscriptionPlans: Plan[] = [
  {
    id: "growth_279",
    name: "Growth",
    price: "$279",
    cadence: "/mo",
    meta: "5 reports a month",
    points: [
      "Up to 5 brands per report",
      "All five research dimensions",
      "Document review included",
      "Full portal + case history",
      "Credit rollover (up to 2)",
    ],
    popular: false,
  },
  {
    id: "scale_499",
    name: "Scale",
    price: "$499",
    cadence: "/mo",
    meta: "12 reports a month",
    points: [
      "Everything in Growth",
      "Category compliance review",
      "Deep analysis + contradiction checks",
      "3-business-day priority SLA",
      "Credit rollover (up to 4)",
    ],
    popular: true,
  },
];

export const oneTimePlans: Plan[] = [
  {
    id: "single_99",
    name: "Single Report",
    price: "$99",
    cadence: "one-time",
    meta: "1 report",
    points: [
      "Up to 3 brands",
      "Three research dimensions: supplier identity, brand risk, sourcing logic",
      "Supplier questions checklist",
      "Ready in your portal in 5 business days",
    ],
    popular: false,
  },
  {
    id: "single_149",
    name: "Complete Report",
    price: "$149",
    cadence: "one-time",
    meta: "1 complete report",
    points: [
      "Up to 3 brands",
      "All five research dimensions",
      "Category compliance review",
      "Document review included",
      "Ready in your portal in 5 business days",
    ],
    popular: true,
  },
];

export const creditExplainer =
  "One credit = one report — one supplier, up to your plan's brand limit, across the research dimensions your plan includes. Credits are just how many reports you can run.";

export const comparisonColumns = ["Single Report", "Complete Report", "Growth", "Scale"] as const;

export const comparison: {
  feature: string;
  values: [string, string, string, string]; // Single, Complete, Growth, Scale
}[] = [
  { feature: "Reports", values: ["1", "1", "5 / mo", "12 / mo"] },
  { feature: "Brands per report", values: ["Up to 3", "Up to 3", "Up to 5", "Up to 5"] },
  { feature: "Research dimensions", values: ["3 of 5", "All 5", "All 5", "All 5"] },
  { feature: "Category compliance review", values: ["—", "Yes", "—", "Yes"] },
  { feature: "Document review", values: ["—", "Yes", "Yes", "Yes"] },
  { feature: "Deep analysis + contradiction", values: ["—", "—", "—", "Yes"] },
  { feature: "Delivery SLA", values: ["5 days", "5 days", "5 days", "3 days"] },
  { feature: "Credit rollover", values: ["—", "—", "Up to 2", "Up to 4"] },
  // Stripe-verified 2026-07-23: the top-up price IDs charge $99/$179 — the portal billing page
  // was right, this table was wrong. Retired figures locked out by retiredPricing.lock.test.ts.
  { feature: "Top-up packs", values: ["—", "—", "+3 / $99", "+6 / $179"] },
];
```

Removed vs the old file: the "Up to 5 brands" $99 claim, the "14-field document review" $99 claim, "Delivered to your email in 5 days" (portal phrasing until Resend is live in prod — the sender now exists, the env doesn't), the Keepa row/point, the "Portal + case history — Read-only" false row, the uniform-brand-count comment.

- [ ] **Step 2: `app/(marketing)/page.tsx`** — three edits:

(a) PLANS (line 119): replace `"Deep analysis + Keepa data"` with `"Category compliance + deep analysis"`.

(b) Sample PDF (lines 430–437): delete the entire `<a href="/sample-report.pdf" ...>...</a>` block (keep `ReportPreview` and its caption; the hero's `#sample-report` anchor still resolves to the section).

(c) Single-report line (line 580): `Try a single report — $99` → `Single reports from $99` (the $149 tier exists now; "from" is honest):

```tsx
              <Link href="/pricing" className="font-semibold text-brand hover:text-brand-hover">
                Single reports from $99
              </Link>
```

- [ ] **Step 3: `components/marketing/faq.tsx`** — two answers:

(a) "How do credits work?" →

```ts
    a: "One credit = one report — one supplier, up to your plan's brand limit, across the research dimensions your plan includes. Subscriptions include a set number of credits each month, and unused credits roll over up to your plan's limit. Busy month? Add a top-up pack anytime. A single report is just one credit's worth, bought on its own.",
```

(b) "Can I try it before subscribing?" →

```ts
    a: "Yes. Buy a Single Report for $99, or the Complete Report for $149 with all five research dimensions, to see the depth before committing to a monthly plan.",
```

- [ ] **Step 4: `components/marketing/site-footer.tsx`** — remove the dead links (founder-ruled): delete the `{ label: "About", href: "#" }` entry and the entire Legal column object. Company keeps Contact. Leave a comment: `// About/Terms/Privacy REMOVED 2026-08-07 (founder-ruled: no dead links) — they return with the legal-pages ruling.`

- [ ] **Step 5: MUST_PASS same commit** — in `lib/utils/bannedLanguage.fix.test.ts`, IMPORT the real constants (the standing rule prefers imports over copies) and spread them:

```ts
import { subscriptionPlans, oneTimePlans, creditExplainer, pricingHero, comparison } from "@/lib/content/pricing";
```

Add to `MUST_PASS`:

```ts
  // — marketing pricing copy (2026-08-07 batch — IMPORTED, cannot drift) —
  ["pricing hero title", pricingHero.title],
  ["pricing hero subtitle", pricingHero.subtitle],
  ["credit explainer", creditExplainer],
  ...[...subscriptionPlans, ...oneTimePlans].flatMap((p) =>
    p.points.map((pt): [string, string] => [`pricing point (${p.id})`, pt]),
  ),
  ...comparison.map((r): [string, string] => [`comparison row: ${r.feature}`, `${r.feature}: ${r.values.join(" / ")}`]),
  ["FAQ credits answer (2026-08-07)", "One credit = one report — one supplier, up to your plan's brand limit, across the research dimensions your plan includes. Subscriptions include a set number of credits each month, and unused credits roll over up to your plan's limit. Busy month? Add a top-up pack anytime. A single report is just one credit's worth, bought on its own."],
  ["FAQ try-first answer (2026-08-07)", "Yes. Buy a Single Report for $99, or the Complete Report for $149 with all five research dimensions, to see the depth before committing to a monthly plan."],
```

- [ ] **Step 6: Run the copy gates + typecheck**

```bash
npx vitest run lib/utils/bannedLanguage.fix.test.ts lib/content/retiredPricing.lock.test.ts
npx tsc --noEmit
```

Expected: green (no retired figures were introduced; all new copy passes the HARD scan).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "MARKETING COPY RECONCILED TO THE SHIPPED LADDER (gap audit 5.6, founder-ruled 2026-08-07): $99 sells what it is (3 brands, 3 named dimensions, no doc review, portal delivery), Complete Report $149 EXISTS on /pricing (all 5 dimensions + category compliance + doc review; name RULED), Keepa lines removed everywhere KEEPA_LIVE=false, false 'Read-only' portal row dropped, comparison table now 4 honest columns, upload caps still NEVER in pricing copy; dead links REMOVED founder-ruled (footer About/Terms/Privacy until legal-pages ruling; /sample-report.pdf 404 anchor); homepage Scale card + single-report line updated; ALL new copy in MUST_PASS same commit via IMPORTED constants. Live Stripe Scale product description = founder describe-and-stop (separate)"
```

---

### Task 7: Full gates, tracker close, push

- [ ] **Step 1: Full battery, unpiped:**

```bash
npx vitest run
```

Expected: all passing (1076 baseline + the new tests), `$LASTEXITCODE` 0.

```bash
npx tsc --noEmit
npx eslint .
npm run build
```

Expected: 0 / 0 errors / clean.

- [ ] **Step 2: Frozen-surface check** — `git diff ef31b92..HEAD --stat` and confirm NO engine/pipeline files changed (nothing under `lib/research/pipeline`, `lib/research/tracks`, registry, synthesis — this batch never touches them).

- [ ] **Step 3: Tracker close** — mark the six §5 blocks-design items DONE in `docs/HyprrIQ_OPEN_ITEMS.md` with the commit hashes; note what stays on the ledger (three remaining transactional emails, Resend account/env setup, Stripe portal plan-switch verification, live Stripe Scale description, legal pages).

- [ ] **Step 4: Commit + push**

```bash
git add docs/HyprrIQ_OPEN_ITEMS.md docs/superpowers/plans/2026-08-07-pre-design-batch.md
git commit -m "docs: pre-design batch CLOSED - all six blocks-design items landed (husks excised, change-request entry, delivery email gated-soft, rebuy fixed, Growth path un-dead-ended, marketing reconciled + dead links removed); design lane is clear. Ledger keeps: Resend account+env (founder), 3 remaining transactional emails, Stripe portal plan-switch verify, live Stripe Scale description, legal pages"
git push
```

---

## Founder handoff notes (carried to the final report)

1. **Resend setup (your step, ~15 min):** create the Resend account, verify the `hyprriq.com` sending domain, then set `RESEND_API_KEY` + `RESEND_FROM` (e.g. `HyprrIQ <reports@hyprriq.com>`) + `SUPPORT_INBOX` in Vercel env AND `.env.local`. Until then every email path (including the §5 config finding — watchdog/ops alerts) silently no-ops.
2. **Stripe portal plan-switch config:** still UNVERIFIED — the new Change Plan card depends on it. Verify in the Stripe dashboard (Billing → Customer portal → subscription update products).
3. **Live Stripe Scale product description** still carries Keepa language — a Stripe-dashboard edit (or a per-instance authorized MCP write). Suggested text: "12 reports a month. Up to 5 brands per report, all five research dimensions, category compliance review, deep analysis, 3-business-day priority SLA."
4. **Marketing "delivered to your email" claim** was rewritten to portal phrasing; once Resend is live in prod, the email claim can honestly return (one-line copy edit).
