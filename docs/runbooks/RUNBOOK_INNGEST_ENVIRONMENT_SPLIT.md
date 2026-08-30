# Runbook — splitting the Inngest environments (production ≠ staging)

**Who runs this:** the founder, by hand. Every step touches a dashboard or a Vercel setting.
**Why:** one Inngest app carried the SAME keys in both Vercel scopes, so every deployment on either
branch synced into the **Production** environment and overwrote its serve URL. Last deploy won,
regardless of branch. Diagnosis and evidence: `docs/HyprrIQ_OPEN_ITEMS.md` §0-P.

**Safe to run now — verified 2026-08-25:** no case is in flight (`awaiting_review` is a human wait,
not a live run), nothing has been deleted by the retention sweep, and nothing can be until June 2027.

---

## ⚠ ONE CORRECTION TO THE PLAN THE FOUNDER RULED ON

The founder ruled "archive the old registration as part of the switch, not after," on my framing that
a stale app would keep seven cron triggers alive. **That framing was probably wrong, and the check is
cheap.**

Inngest identifies an app by its app ID — ours is `"hyprriq"` (`lib/inngest/client.ts`) — **within an
environment**. There is almost certainly only ONE app, sitting in the Production environment with a
wrong serve URL. **The production redeploy corrects that app IN PLACE; there is nothing to archive.**

A second app to archive exists only if the Apps page shows one. **Step 6 checks; it does not assume.**
Archiving is still the right action IF a duplicate is there — archiving an app archives all its
functions and stops new runs being triggered, which is exactly what kills orphaned crons.

---

## 1 · Create the second environment, and find its two keys

1. Go to **https://app.inngest.com/env** (or the **environment switcher dropdown** in the top nav →
   **View All Environments**).
2. Click **Create an environment**. Name it **`staging`**.
3. Switch into the new `staging` environment using the same top-nav dropdown.
4. Inside `staging`, open its **Event Keys** and **Signing Key** — each environment has its own pair.
   Copy both. These are the two values that go on the Vercel **Preview** scope.

⚠ **The Signing Key is the thing that decides which environment an app syncs into.** That is the
whole mechanism: get it wrong and the deployment lands in the wrong environment no matter what else
is set.

Do **not** change the Production environment's keys. They are already correct — the defect was that
they were *also* used for Preview.

---

## 2 · The six variables

**Vercel → hyprriq → Settings → Environment Variables.** Scope is the part that was wrong before —
check the scope checkboxes on every one.

| # | Variable | Scope | Value |
|---|---|---|---|
| 1 | `INNGEST_SERVE_ORIGIN` | **Production** only | `https://hyprriq.com` |
| 2 | `INNGEST_EVENT_KEY` | **Production** only | Production environment's Event Key *(already set — re-scope it to Production only)* |
| 3 | `INNGEST_SIGNING_KEY` | **Production** only | Production environment's Signing Key *(already set — re-scope it to Production only)* |
| 4 | `INNGEST_SERVE_ORIGIN` | **Preview** only | `https://hyprriq-git-staging-hyprrx-hyprriq.vercel.app` |
| 5 | `INNGEST_EVENT_KEY` | **Preview** only | **`staging`** environment's Event Key (from step 1) |
| 6 | `INNGEST_SIGNING_KEY` | **Preview** only | **`staging`** environment's Signing Key (from step 1) |

**Four distinct key values across rows 2/3/5/6.** If rows 2 and 5 hold the same string, the split has
not happened and everything below will look like it worked while remaining broken.

⚠ The **Preview** scope covers *every* branch's previews, not just `staging`. A PR branch will
register the staging alias, and staging will serve it. Acceptable today; if per-PR isolation is ever
wanted, install the Inngest Vercel Marketplace integration, which creates a branch environment per
branch automatically.

`INNGEST_SERVE_ORIGIN` is read at `app/api/inngest/route.ts` (`serveOrigin: process.env.INNGEST_SERVE_ORIGIN`).
It was already wired; it was simply never set.

---

## 3 · Redeploy order, and what to see after each

**PRODUCTION FIRST — this is the step that corrects the dangerous condition.** Until it runs, the
Production environment's app still points at a preview deployment.

### 3a · Redeploy production (`main`)

Vercel → Deployments → the latest `main` deployment → **Redeploy**.
(Env-var changes do not apply to an existing deployment; a redeploy is required.)

**Then, in Inngest → Production environment → Apps → the `hyprriq` app:**

```
https://hyprriq.com/api/inngest
```

That exact string, and no `-<hash>-` in it. Anything containing `hyprriq-<hash>-hyprrx-hyprriq.vercel.app`
means `INNGEST_SERVE_ORIGIN` did not reach the build — check the variable's scope.

### 3b · Redeploy staging

Vercel → Deployments → the latest `staging` deployment → **Redeploy**.

**Then, in Inngest → switch to the `staging` environment → Apps:** a NEW app appears, serve URL

```
https://hyprriq-git-staging-hyprrx-hyprriq.vercel.app/api/inngest
```

**And critically — re-check the Production environment. Its URL must NOT have changed.** That is the
proof the split worked: before this fix, a staging deploy would have overwritten it.

---

## 4 · Archive the old registration — CHECK FIRST

**In Inngest → Production environment → Apps:**

- **If exactly one app (`hyprriq`) is listed and its URL is now `https://hyprriq.com/api/inngest`:
  there is nothing to archive.** The app was corrected in place. Skip to step 5.
- **If a SECOND app is listed**, or one still shows a `-<hash>-` preview URL: open it, click
  **Archive** (top-right), confirm **Yes**. Archiving archives all of that app's functions and stops
  new runs from being triggered; runs already in flight finish. Archived apps remain visible via the
  **Archived Apps** selector at the top-left of the Apps overview.

⚠ **Do this in the same sitting, not later.** A stale app keeps its **seven cron triggers**, including
`retention-sweep` (daily 03:00, permanent document deletion) and `email-reminders` (daily, client
email). Harmless today only because nothing is eligible for deletion until June 2027.

---

## 5 · What tells you it worked — and what tells you it did not

### Run this — it needs no dashboard

```bash
curl -s -o /dev/null -w "production %{http_code}\n" https://hyprriq.com/api/inngest
```

| response | meaning |
|---|---|
| **401** | ✅ **CORRECT.** The endpoint is live and demanding a request signature. Verified 2026-08-25 on both origins. |
| 404 | ❌ The route is not on that deployment — wrong build, or the deploy failed. |
| 307 | ❌ The middleware is intercepting it. `/api/inngest(.*)` has fallen out of the public routes. |
| 200 with function JSON | ⚠ Introspection is answering unauthenticated — check `INNGEST_SIGNING_KEY` is set at all. |

### Worked

- Production app URL is `https://hyprriq.com/api/inngest`, with no deployment hash.
- A separate app exists in the `staging` environment, on the branch alias.
- **A staging redeploy leaves the Production URL untouched.** This is the real test — do a throwaway
  staging deploy afterwards and confirm Production does not move.
- Production environment shows the seven cron functions; `staging` shows its own copies.
- `curl` returns **401** on both origins.

### Did not work

- Production URL still contains `-<hash>-` → `INNGEST_SERVE_ORIGIN` did not reach the build; almost
  always a **scope** mistake on the variable.
- No app appears in `staging` → the Preview `INNGEST_SIGNING_KEY` is still the Production one, so the
  deployment synced into Production and overwrote it again. **Re-check the Production URL immediately
  — this failure mode silently restores the original bug.**
- Both environments show the same serve URL → the keys were not actually split.
- `curl` returns 404 → the deployment did not build, or the route was removed.

---

## 6 · Deployment protection — AFTER the split, never before

Verified 2026-08-25: `passwordProtection`, `ssoProtection` and `trustedIps` are **all off**. Same root
cause as the `/prototype` exposure (§0-M): the default posture is *reachable*, and nothing was ever
deliberately opened.

**Why it must come second.** Vercel Authentication on **Preview** blocks every external caller that
must reach a preview deployment. While production execution depends on a preview being reachable —
which is precisely the bug being fixed here — turning protection on **takes production down**. Once
the environments are split, the only thing at risk is *staging's own* Inngest, which is contained.

**Never enable it on Production.** That breaks the live site.

**The bypass, when you do enable it on Preview:** Vercel injects the secret as
`VERCEL_AUTOMATION_BYPASS_SECRET`. A caller presents it as the **`x-vercel-protection-bypass`**
header, or as a **query parameter** when the tool cannot set headers — the documented route for
third-party webhooks. It covers Password Protection, Vercel Authentication and Trusted IPs.

**What else points at a preview and would break:** any Stripe (test-mode), Clerk or Resend webhook
configured against the staging alias. Enumerate those before enabling, not after.

---

## Sources checked 2026-08-25 (not from memory — founder's instruction)

- Inngest environments, custom environments, the environment switcher — https://www.inngest.com/docs/platform/environments
- App syncing and the Sync App action — https://www.inngest.com/docs/apps/cloud
- App archiving (Archive button, function archiving behaviour) — https://www.inngest.com/docs/platform/manage/apps
- SDK environment variables (`INNGEST_ENV`, event/signing keys) — https://www.inngest.com/docs/sdk/environment-variables
- Vercel Protection Bypass for Automation — https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation
