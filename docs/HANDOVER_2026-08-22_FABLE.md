# HANDOVER — 2026-08-22 → next session

**Read cold. Nothing here is taken on trust.** Every number was measured and is re-checkable
with the command given. **If your reading of the code or the data disagrees with this file,
THE FILE IS WRONG** — say so with evidence. That instinct found real defects every single day
of this stretch, including three in this session's own instruments.

**Branch** `staging` · **HEAD** `811fad1` · fully pushed, tree clean (only `skills-lock.json` +
the founder's untracked folders — `.claude/`, `backups/`, `codex-fresh-design/`,
`mockups-codex-exploration/` — which NEVER get committed).
**Gates at handover:** 1825/1825 · tsc 0 · eslint 0 · build clean.
**SSOT tracker:** `docs/HyprrIQ_OPEN_ITEMS.md` (§0-B carries the whole 08-21/08-22 run) — but
VERIFY LIVE anyway; distrusting the tracker is how this project finds its defects.

---

## 0 · AUTHORITY (this changed — supersedes older handovers)

**CTO authority, founder-granted 2026-08-21, in permanent memory**
(`cto-authority-build-without-waiting`): build / fix / improve on your own decision — do NOT
wait for rulings or approvals, even if an older prompt says wait. Mark judgment calls
CTO-DECIDED in commits; transparency replaces permission. **STILL STOP (unchanged):**
production migrations (describe-and-stop with exact SQL + read-backs; the founder runs them via
Supabase MCP), anything touching money/Stripe, deploying to main, deleting anything, the verdict
maths (signals/weights/thresholds/vetoes). The frozen design lane: `lib/pdf/reportTemplate.ts` +
`public/prototype/**` belong to the design thread — don't touch.

**2026-08-22 ruling that reshaped the legal lane:** `HyprrIQ_LEGAL_PAGES_FINAL.md` (in the
founder's Downloads, now banner-marked SUPERSEDED) is no longer authoritative — **the code wins;
legal copy may be rewritten** under one law: plain, short, true; never soften a false sentence
into a vague one — cut it or build the thing.

## 1 · WHERE WE ARE — dev side effectively CLOSED for launch

Everything below is BUILT, PUSHED, and where claimed, LIVE-VERIFIED this run:

- **Polarity gate ⑧** (firewall **1.8.0**): per-item `polarity` + `subject_is_target`
  declarations cross-checked against key sign; subject inversion ruled IN; census carve-outs in
  all four track prompts; absence-semantics allowance (`no_enforcement_found` +2 accepts
  neutral_absence); undeclared-skips (fallback must never zero a track). Census:
  `docs/POLARITY_CENSUS_2026-08-21.md` — its numbers are counterfactuals on STORED evidence,
  held-fixed clause load-bearing (restated in tracker after 031's re-run stayed verify at 1.80).
- **Manufacturer-direct** (rubric **g003-1.2.0**): same-entity detector
  (`lib/research/sameEntity.ts`), acceptance census = exactly {024, 034, 043}
  (`scripts/same-entity-census.ts`), `manufacturer_direct` +8 = pass, CODE-EMITTED only (no
  ALLOWED_PROFILES entry; LLM proposals die at provenance), Track 3 keeps voting with
  same-entity prompt context, diversity-cap exemption in the ONE shared composition.
- **RLS/ADR-RLS-001 COMPLETE:** Clerk third-party auth ON (dev issuer
  `maximum-dragon-9.clerk.accounts.dev`), migration 20260820000100 run,
  `createUserScopedClient` built (wired into NO read path — deliberate),
  `scripts/rls-jwt-probe.ts` **FULL PASS as a role='client' user** (own rows visible, zero
  foreign, cross-client zero, self-promotion 401, storage refused). Probe REFUSES to run as
  elevated roles (its first post-migration run flipped the founder's role via the founder's own
  legitimate policy — safety-restore worked). ⛔ NEVER set_config GUC (pooled connections).
- **Emails 1–7 + operational set LIVE** on `reserve-then-send` dedup (email_log; founder-run
  migration applied; the `deleted_at is null` index predicate makes release a soft delete):
  welcome (create-path `.select()` on the ignore-duplicates upsert), payment-failed (webhook),
  low-credit ×2 + renewal (daily `email-reminders` cron 13:00 UTC), dormant notice, retention
  warning. One layout, LAYOUT LOCK test, 12 previews gate-clean in
  `public/prototype/email-preview/`. **Email 5 (cancellation) still blocked** on deletion policy
  — NOTE: retention machinery now exists flag-off, so it unblocks when the founder flips the flag.
- **Consent + unsubscribe:** footer box → `/api/newsletter` → `marketing_contacts` (LIVE table:
  consent_status subscribed/unsubscribed/pending CHECK · consent_at · unsubscribed_at — the
  founder-applied shape, code reconciled); `/unsubscribe` tokenized per address
  (`UNSUBSCRIBE_TOKEN_SECRET` set by founder).
- **Cloudmersive LIVE-VERIFIED:** blocking at upload, fail-closed, before charge and storage;
  clean→clean, EICAR→infected, no-key→refuse; verdict audited; `virus_scan_status` stamped.
  Outage = uploads stop on single_149+ (deliberate, stated). Cap is 10MB (`uploads.ts:17`).
  OPEN QUESTION: ≥1MB scans hung from the founder's machine but 400KB cleared in 11.6s — local
  network vs Cloudmersive limit unresolved; definitive test = one ~9MB PDF through the DEPLOYED
  preview.
- **Retention sweep** (`retentionSweep.ts`): ⛔ OFF until founder sets
  `RETENTION_SWEEP_ENABLED=1`. Warn-then-delete: warning email per client×expiry-month is THE
  GATE (email_log sent_at is the clock; nothing deletes unwarned <30d — structural); frozen
  documentation_review pack REQUIRED or no deletion ever (rejudge survives); failed removal
  never stamps. Dormant 24-month notice once-ever. First activation warns-and-waits.
- **Acquisition grants LIVE end to end** (founder-applied schema — `code/mode/grant_plan_type/
  grant_credits/redemption_count/revoked_at` + `clients.referred_by_grant_id`; RPC
  `redeem_acquisition_grant` applied + read back; per-grant email grain RULED deliberate):
  admin manager at `/admin/acquisition` (super-admin; create/copy/revoke/redemptions + FAILED
  ATTACH panel), invite link `/grant/[code]` → cookie + lands on `/partners?invited=1&code=…`
  with the code shown for cross-device, coupon box on plan-less billing,
  **`/api/grants/attach` is the ONE cookie consumer** (route because only a route can clear a
  cookie: ok/terminal→clear+visible copy, terminal→audited; retryable keeps cookie),
  `GrantAttach` in the portal shell makes every outcome visible. RULES: value fixed (one free
  full assessment, scale_499 mechanism, NEVER the tier name in copy) · one-per-email is
  PER-GRANT deliberately · `already_has_plan` refusal is a RULE (existing client freebie =
  credit adjustment, never a grant).
- **Marketing surface:** `/partners` (VA/agency pitch, grant landing, SEO), `/how-to-read`
  (all copy IMPORTED from canonical modules), dashboard preview = synthetic fixture BY RULING
  (ids moved to impossible AWI-2600 month; never a screenshot, never a masked real case).
  Blueprint: `docs/MARKETING_SITE_BLUEPRINT.md` — section C awaits the founder's OWN ideas;
  **do not build marketing pages beyond it unprompted.**
- **THE SIX LEGAL PAGES + FULL TRUTH AUDIT (2026-08-22):** /terms /privacy /data-policy
  /refund-policy /payment-policy /cookie-policy — first transcribed from the locked draft, then
  the draft was SUPERSEDED and a claim-by-claim audit fixed SEVEN false claims (the 32-row table
  is in the 2026-08-22 session report; the commits `759ee93·2777a76·dcc26b4·c5b365c·c2998ed`
  each carry old→new). Highlights the next session must not undo:
  · Refund §2 = the LOCKED formula (plan price ÷ plan credits × 0.70 per used report; max(0,…);
    cents at the final step; table DERIVED AT RENDER from `plans.ts`; Growth worked example
    $239.94). NO refund code exists anywhere — the page is the formula's only encoding.
  · **Past-due submissions PAUSE** — built: `submit/route.ts` blocks `past_due` AND `cancelled`
    (402, plain copy, credits preserved); `cancelling` deliberately does NOT block; 4 fixtures.
  · Retention rows = kept commitments, never scheduled automation ("within 30 days after your
    account closes"); 180-day case-record deletion REPLACED with while-active (rejudge/dispute).
  · Terms §5 top-up bullet was doubly false (no ordering; rollover clip expires top-ups too) —
    now "join the same balance, same rollover rule."
  · Cookie table = reality: Clerk + `hyprriq_grant` only; NO Stripe cookie on our domain
    (no Stripe.js exists); localStorage notice-flag disclosed.
  · **`LEGAL_EFFECTIVE_DATE = null` — UNSET UNTIL LAUNCH** (renders "Effective on launch");
    the FOUNDER sets it at the domain move. Two prior date rulings were superseded in
    sequence — do not resurrect either.
  · Acceptance surfaces: signup line (Terms+Privacy+US-only) in `auth-shell.tsx` signup variant;
    purchase line beside the billing plan grid.
  · Retired-pricing lock sharpened `(?!\.\d)` — $239.94 is refund arithmetic, not the retired
    $239 price.

## 2 · WHAT THE NEXT SESSION PICKS UP, in order

1. **THE DOCUMENTATION LANE — the named next build. Its own session, PLAN FIRST (founder-locked
   sequencing; do not just start writing).** Five documents, role-gated
   (staff < admin < super_admin), never a public wiki: ① end-to-end architecture from source
   (tables/writers/readers/frozen surfaces) ② symptom→location debugging map (built from ①)
   ③ staff/admin workflow knowledge base ④ client-facing how-to derived from ③ ⑤ the addition
   already named to the founder: **the generated Instruments & Locks Index** (from test files +
   script headers, regenerated so it cannot drift — the invocation flags alone have burned
   hours). Design constraints ruled: drift visible or impossible (generate from source, or
   doc-beside-code with a lock test — the reportCopy pattern for prose); routes under
   `/admin/docs/*` gated by the existing `can()` machinery fit naturally.
2. **Founder actions the session may get unblocked by** (nag politely if relevant):
   ⛔ set `LEGAL_EFFECTIVE_DATE` at the domain move · flip `RETENTION_SWEEP_ENABLED=1`
   (precondition met — warning email exists; flipping also unblocks the cancellation email
   build) · publish 031 attempt 4 (review screen, explicit override verdict — preflight proven
   clean) · eyeball 12 email previews + `/how-to-read` + `/partners` + `/admin/settings` ·
   the 9MB Cloudmersive test from the deployed preview · Anthropic-tier zero-retention
   confirmation (backs Privacy §5) · processor DPAs (locked build-note #6) · solicitor: Terms
   §13 + §15 (+ arbitration-clause question, raised) · first tester grants (create in
   `/admin/acquisition`).
3. **The go-live batch (founder-led, deliberately deferred):** Clerk production instance +
   `accounts.hyprriq.com` (ISSUER CHANGES → Supabase provider re-config + `rls-jwt-probe`
   re-run required), live Stripe keys on Vercel Production (env guard refuses them outside
   VERCEL_ENV=production), point Stripe at /terms + /privacy, staging→main. After it: campaign
   tool selection (its footers need address + unsubscribe — CAN-SPAM).
4. **Known small opens:** closure machinery batch (clients.closed_at + closure semantics —
   the retention rows are phrased so nothing breaks meanwhile) · redeem-by-email grant lookup at
   first sign-in (named to the founder as the full fix for the cross-device gap; build if the
   tester wave warrants) · Keepa (unlocks $149/Scale "coming soon") · Inngest sync-panel 401
   glance (non-urgent) · zero-row tables keep-and-comment comments still unwritten.

## 3 · MECHANICS YOU CANNOT GUESS (several cost hours; three are NEW this run)

- **Founder-script invocation:** `npx tsx --conditions=react-server --tsconfig tsconfig.json
  --env-file=.env.local <script>` (server-only poison without the conditions flag).
- **Commits: `git commit -F <file>`, ALWAYS**; check the STAGED COLUMN; never `git add -A`.
  **NEW:** single-quote commit-message content in PowerShell Set-Content or `$99` becomes `` ``
  (interpolation ate the dollars in `2777a76`'s message).
- **NEW: never round-trip a UTF-8 doc through PowerShell Get-Content/-replace/Set-Content** —
  it mojibakes every em-dash (cost the blueprint a rewrite, `50ff7f6`). Use the file tools.
- **NEW: top-level `@clerk/nextjs/server` imports poison the react-server script graph**
  (`operatorNames` killed publish-preflight invisibly). Lazy-import Clerk inside functions in
  anything an instrument imports.
- **PowerShell `[id]` route paths are WILDCARDS** — `-LiteralPath` or bash.
- **vitest v4:** `beforeEach(() => { mock.mockReset(); })` — braces, or the returned mock runs
  as teardown.
- **`next.config` `outputFileTracingIncludes` is LOAD-BEARING** for the PDF worker.
- **Instruments** (one instrument, one number): `publish-preflight.ts` (CASES=… env) ·
  `render-check-034.ts` · `rejudge-case.ts <id> [attempt]` · `gate-census.ts` (58% stored is
  EXPECTED) · `rls-adversarial.ts` (anon) · `rls-jwt-probe.ts` (verified-token; client-role
  only) · `same-entity-census.ts` (acceptance = exactly the 3) · `polarity-export.ts` ·
  `email-preview.ts <outdir>` · `publish-case.ts` (operator-house ONLY) · `dispute-rerun.ts`
  (re-run ≠ stored-evidence counterfactual — proven on 031).
- **Supabase MCP** reads + founder-named writes; project `mjkacjrrrmlwlwkienvq`. **Model against
  the LIVE schema, never the migrations folder** (the plan_type CHECK no-op; the
  marketing_contacts and grants shapes both diverged from drafts — reconcile CODE to LIVE and
  rewrite migration files as as-applied records).
- **Two writers:** the founder edits DB + dashboards while you work. Re-read before asserting.

## 4 · STANDING RULES (violating these is the actual failure mode)

Measure the corpus before writing any rule · a named case is a test example, never the design
input · scope to the surface, not the field · one instrument, one number · verify LIVE rather
than reading the tracker · prompt+parser+SCHEMA move together · every new gate ships with
fixtures covering shapes you did NOT have in mind · client wording = renderings, never
stored-literal edits · no comment/TODO instructing a future session to undo a ruling (this run
removed two — the dashboard-screenshot swap note and my own effective-date flag) · legal copy:
plain, short, true — cut it or build it, never hedge · "Success. No rows returned" proves
nothing — read back · frozen surfaces per §0.

## 5 · RULED THIS RUN (do not relitigate)

Subject inversion IS in the polarity class · per-grant email grain (revisit only on public
broadcast) · existing-client freebie = credit adjustment, never a grant · grant copy = "a full
assessment", never a tier name, until $149/Scale open · deletion is permanent; the warning email
is the gate · Track 3 keeps voting for manufacturer-direct vendors · synthetic fixture, never a
screenshot, never a masked real case · $99 runs no Track 2 (product decision, untouched) ·
cancelled blocks submissions, cancelling does not (fixture-locked) · the truth-audit rewrites
themselves (the built pages ARE the policy; the Downloads draft is a record).
