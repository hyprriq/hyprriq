# END-TO-END AUDIT — FINDINGS

**Date:** 2026-08-18 · **Branch:** `staging` · **Supabase:** `mjkacjrrrmlwlwkienvq`
**Method:** code traced, then verified against production data. Ranked by severity, never by subsystem.
**Mandate:** read-only. Nothing was changed, fixed, or re-run. No money spent, no model calls.

> Every finding carries **how it was verified**. Anything I could not verify is labelled as such and
> ranked down, not up. Where the 2026-08-17 brief disagrees with what I measured, I say so.

---

## 0 · THE ONE-PARAGRAPH ANSWER

The engine is in better shape than the business around it. The publish path is correctly
attempt-pinned, the client projection is genuinely single-path, and the delivery gate does its job.
What is weak is everything that is supposed to *notice* — failure, breach, silence — and the money
plumbing, which has never once run in live mode. Two things need attention today: a set of
credit-mutating database functions any API key-holder can call, and the fact that the only paying
customer's only report is blocked by a false positive, past its SLA, with the credit already taken
and no alarm anywhere.

**The framing fact for everything below:** all 7 delivered cases belong to the founder's own account
(`gautamnaidu.p@gmail.com`, role `founder`). 38 of 39 cases are internal. The single paying client
has one case and zero deliveries. So most "client-facing" defects are **exposure, not incidents** —
ranked on that basis rather than inflated.

---

## P0 — WOULD BREAK A PAYING CLIENT OR LOSE MONEY

### P0-1 · Six credit-mutating DB functions are callable by anyone holding the project API key

**Where:** `supabase/migrations/20260601000000_initial_schema.sql` (definitions); live grants in `pg_proc`.
`add_client_credits`, `adjust_client_credits`, `deduct_client_credits`, `refund_client_credits`,
`raise_credits_to_allotment`, `rollover_client_credits`.

**What:** All six are `SECURITY DEFINER`, owned by `postgres` (which carries `rolbypassrls`), and grant
`EXECUTE` to `anon`, `authenticated` and `PUBLIC` — so they are reachable at `/rest/v1/rpc/<name>`.
They take the target as a plain argument (`p_client_id text`) and perform an unconditional
`UPDATE clients SET credits_available = …`. There is **no caller check inside them**.

**How verified:** `SELECT proname, prosecdef, pg_get_userbyid(proowner), rolbypassrls,
has_function_privilege('anon', oid,'EXECUTE'), has_function_privilege('authenticated', oid,'EXECUTE')`
returned `true` on every column for all six. I then read two bodies via `pg_get_functiondef`:
`add_client_credits` is a bare `UPDATE clients SET credits_available = credits_available + p_amount
WHERE id = p_client_id`. No guard of any kind. **I did not call any of them.**

**Why it matters:** credits are the paywall on paid research. Arbitrary grants are revenue bypass and
an unmetered channel against the founder's own model spend; arbitrary decrements are denial of
service against a paying client.

**Honest severity caveat:** the anon key is not in the browser bundle today —
`grep -rln "@/lib/supabase/client"` returns **zero importers**, so `NEXT_PUBLIC_SUPABASE_ANON_KEY` is
not inlined. That is the *only* thing in front of this: it is a publishable credential by Supabase's
own model, and one client component importing that file ships it. RLS is not a backstop (P1-8).

**Fix:** `REVOKE EXECUTE … FROM anon, authenticated, PUBLIC` on all six. They are only ever called
service-side. Minutes of work.

### P0-2 · The only paying customer's only report is blocked by a false positive, past SLA, credit taken

**Where:** `lib/research/synthesisMethodScan.ts:16`; case `AWI-2608-034`.

**What:** the derivation-rule scanner blocks publish on `/\bcorroborat(?:e|ed|es|ion|ing)\b/i`. Here it
fires on:

> "…a confirmed physical address in Andover, New Jersey **corroborated** by the FDA, BBB, and LinkedIn…"

That is attributed English **naming its sources** — the opposite of leaking the method. The rule exists
to catch threshold disclosure ("two independent sources corroborated X").

**How verified:** ran both delivery scanners over every synthesis row in the corpus (read-only probe).
The method scanner has **exactly one hit across the entire corpus, ever** — this one. Its observed
false-positive rate is 1 of 1. Separately confirmed in SQL that the sentence sits in
`decision_snapshot.leading_interpretation` on this case's latest attempt.

**The design fault behind it:** every HARD rule in `lib/utils/banned-language.ts` carries negation,
attribution and sentence-scope machinery (`makeVerdictGuard`, `CLEARING_BEFORE`,
`ATTRIBUTION_IN_SENTENCE`, `hasUnnegatedConfirmAuth`). The method scanner has **none** — no `test`
functions, no carve-outs, no sentence scoping. A blunter instrument on the same delivery path.

**Compounding, same case:** SLA breached with `credits_charged = 1`, and **nothing alerts**. Every
consumer of `sla_deadline` / `CASE_SLA_HOURS` is a display surface (portal dashboard, admin dashboard,
case-table, review page) — established by grepping all of them. `watchdog.ts:10` sweeps only
`pending_intake|queued|research_running` and explicitly exempts `awaiting_review` as "legitimately
wait[ing] on humans" — the state cases actually sit in. In agency mode ("nobody is looking", the
founder's own words quoted in `deliverability.ts`) an SLA breach on a paying customer pages no one.
Both cases carrying a deadline at all have breached it; the other 37 have `sla_deadline IS NULL`,
which the client UI renders permanently as "Queued".

**Fix (scanner):** give the corroboration rule the attribution carve-out the HARD tier already has —
a match with named sources in-sentence passes. **Fix (SLA):** one sweep over
`awaiting_review`/`manual_override_required` past deadline → `sendAdminAlert`.

---

## P1 — REAL RISK, NOT YET BITING

### P1-1 · Track 0 is hardcoded blind to uploaded documents
`lib/research/pipeline.steps.ts:78` passes `has_document: false` as a literal.
**Verified:** all 85 Track 0 rows carry `has_document=false` and flag `["no_document_evidence"]`, while
`uploaded_files` holds 3 invoices on `AWI-2606-001`, `AWI-2607-029`, `AWI-2607-031` — **two of which are
delivered reports**. The reviewer was told "no document evidence" with a parsed invoice sitting in
Track 4. The `has_document: true` branch has never executed.

### P1-2 · A delivered case whose report body cannot render
`AWI-2606-001` is `delivered` with `delivered_attempt = 1`, but `case_synthesis` holds **only attempt 2**.
`getClientDecisionSnapshot` (`lib/data/synthesis.ts:171`) pins `attempt_number = 1`, finds nothing,
returns `null`; `getClientReport` (`lib/data/cases.ts:151-152`) then returns `null`. The client surface
shows findings and **no Decision Snapshot**. Nothing detects or reports it.
**Verified:** `synthesis_attempts = {2}`, `track_attempts = {1,2}`, `delivered_attempt = 1`. This is the
2026-08-17 incident class, still present in delivered data.

### P1-3 · The verdict is case-level while findings and synthesis are attempt-pinned
`review/route.ts` pins rows and synthesis to `deliverAttempt`, but the delivered verdict comes from
`c.verdict` — a case-level column `stageFinalize` deliberately refuses to update on a delivered case.
Publishing a re-investigated case ships **attempt-N findings under attempt-(N−k)'s verdict**, and
`checkDeliverable` cannot catch it because it is handed that same stale value.
**Verified:** 3 cases are in exactly that state now (`reinvestigation_pending = true`): `AWI-2606-001`
(pin 1, rows to 2), `AWI-2607-021` (pin 6, rows to 14), `AWI-2607-022` (pin 9, rows to 10).

### P1-4 · The admin review screen still has the defect the publish route fixed
`app/(admin)/admin/cases/[id]/review/page.tsx:60` reads track rows at the **latest attempt**; `:61` calls
`getCaseIntelligence(c.id)` with **no attempt argument** — "the latest synthesis row that exists". Both
feed `buildVerdictViewModel` at `:66`, the screen the operator reads *before* clicking publish. The
client-view half of the same page (`:81-83`) pins correctly to `delivered_attempt`. One half was fixed
on 2026-08-17, the other was not.
**Verified as LATENT, not live:** across all 39 cases `max(track attempt) == max(synthesis attempt)`
everywhere except `AWI-2606-006`, where synthesis is absent entirely. It fires the moment a re-run
writes track rows and dies before synthesis — precisely what happened on 2026-08-17.

### P1-5 · A failed file upload is silent, and the case is already charged
`app/api/cases/submit/route.ts:202-223`: the storage write is `if (!upErr)` with no `else`, wrapped in
`catch { }`. On failure there is no `uploaded_files` row, no log, no audit entry, no alert. The client
receipt renders filenames from form state, so it confirms documents that may not exist. The route's own
comment concedes "the case is already created and charged."

### P1-6 · Uploads are never virus-scanned, and the code implies they are
`lib/research/acquisition/documentPack.ts:89` filters `virus_scan_status !== "infected" && !== "error"` —
a guard that can never fire, because **nothing writes that column**.
**Verified:** grep finds only the type, the select, the filter and tests; all 3 live rows are `pending`
(the DB default), which `:88` explicitly admits as readable. Files are stored and their extracted text
fed to an LLM with no AV in the path.

### P1-7 · Two Stripe features are structurally dead behind one hidden field move
`app/api/webhooks/stripe/route.ts:155,204` read `(sub as unknown as {current_period_end:number})`. On the
API version in the stored payloads that field is **not on the Subscription object** — it lives on
`items.data[0]`. The `as unknown as` cast defeats the type error, so the value is silently `undefined`.
**Verified:** of 12 `customer.subscription.updated` events, **0** have a top-level `current_period_end`
and **12** have it under `items.data[0]`. Consequences: `renewal_date` is NULL on **all 5** client rows
(six render sites show "—", including "Your plan cancels on —"), and the upgrade credit grant fails
closed before it ever queries, so **every Growth→Scale upgrade grants zero credits** — `billing_audit`
has 0 rows matching the grant note.

### P1-8 · RLS provides no tenancy isolation at all
Roughly 20 policies gate on `get_current_user_id()` = `current_setting('app.current_user_id', true)`.
**Verified:** `grep -rn "app.current_user_id\|set_config"` across all TypeScript returns **zero matches**
— the GUC is never set, so every "own row" policy evaluates NULL. Every server query uses the
service-role key. RLS fails *closed*, so this is not an active leak, but the entire tenant boundary
rests on ~40 hand-written `.eq("client_id", userId)` / `caseInScope` calls with no second line of
defence. This is the largest single structural statement a buyer's engineer will make.
Two latent traps inside it: `is_current_user_admin()` still encodes the **superseded** role model
(`role IN ('admin','founder')`), and `clients_self` / `cases_own` are `FOR ALL` with **no `WITH CHECK`**
— so wiring the GUC without rewriting both would *create* an escalation path (a client setting their
own `role='founder'`), not close one. Both client-writable routes are correctly column-allowlisted
today, which is what keeps this theoretical.

### P1-9 · Nothing notices when the pipeline fails
- `pipelineStart.onFailure` has **never fired**: `pipeline_failed` is absent from the 16 distinct
  `audit_log` key families, while **31 of 108** started attempts produced no synthesis row.
- The watchdog has fired **once ever** (2026-07-05, 3 rows) and writes nothing on a clean sweep, so
  silence is indistinguishable from "not registered".
- **No timeouts anywhere:** `pipelineStart` declares no `timeouts` and no `cancelOn` (installed
  `inngest@4.5.1` supports both); `serper.ts:24` and `whois.ts:30` call bare `fetch` with no
  `AbortSignal`. A hung socket is not a retry, it is a permanent wedge — and `onFailure` fires on
  exhausted retries, not elapsed time.
- The 30-minute wedge clock is `cases.updated_at`, which a `BEFORE UPDATE` trigger refreshes on **any**
  write to the row — including the pipeline's own `stageSetRunning` and `stagePersistIdentity`.
- `research_failed` has no exit and is swept by nothing: 3 cases have sat there **43 days**, while the
  client-facing badge renders it as **"Delayed — under review"**.
- 20 cases sit in `awaiting_review` (oldest idle **53 days**) and 8 in `manual_override_required` — the
  system's own "a human must look at this" state — with no aging alarm on either.

### P1-10 · Every alert outcome is discarded, and `sent: true` can mean "not sent"
All five `sendAdminAlert` call sites ignore the returned `{sent, reason}` and write no audit row, so
every failure mode of the pager is invisible. `sendDualNotification` (`lib/email/notify.ts:155-163`) uses
`Promise.allSettled` then returns `{sent:true}` **unconditionally** — both sends can reject and it still
reports success; with both recipients null it reports success having sent nothing. Its two callers
discard the result entirely. Never exercised: `support_requests` has 0 rows.

### P1-11 · Five renewal events failed and nothing reads the error column
`invoice.paid` is keyed on `stripe_customer_id` while `checkout.session.completed` is keyed on the Clerk
id — the drift `SAAS_ARCHITECTURE.md` hard-rule 2 forbids. Five events failed with
`rollover_client_credits: no client row for customer cus_…` and have sat `processed = false` since
**2026-07-21 (28 days)**. Repo-wide grep for `stripe_events` returns hits only inside the webhook:
**no screen, query or alert reads `error` or `processed = false`**.
**Correction:** the $1,395 those events represent is **not real money** — every one of the 37 Stripe
events in this database is `livemode: false`. The defect is real; the loss is not.

### P1-12 · The determinism proof tool is itself wrong
`scripts/rejudge-case.ts:85` builds its verdict input from `EMPTY_SYNTH`, whose
`module_1_normalized_evidence` is `[]`. `certifySynthesisForVerdict` resolves every `evidence_id` against
Module 1 — with an empty index **nothing resolves**, every `is_load_bearing:true` is coerced to `false`,
and every `critical` is demoted. Verified by running it (zero-API) on `AWI-2607-022` attempt 9: it
printed 4 load-bearing coercions and reported a verdict mismatch, while the stored data has all 4
contradictions load-bearing with both sides' evidence resolving. The stored verdict is correct; the tool
is wrong. Because the bug only ever *removes* vetoes, it will also silently agree with an under-severe
verdict. 25 of 37 stored contradictions are load-bearing.

### P1-13 · The corpus records verdicts that were never adopted
`stageMemoryWrite` runs before `stageFinalize`, so it fires even when finalize discards the verdict. The
exclusion rule filters only `event_type = 'dispute_rerun'`, and the `request_investigation` path does not
set it. **Verified:** 8 `intelligence_events` sit above their case's `delivered_attempt`; 7 are
`investigation_completed` and therefore feed the vendor/brand rollups. One — `AWI-2607-021` attempt 11 —
recorded `verify_before_purchase` while the delivered verdict was and remains `usable_with_conditions`.

### P1-14 · Classifier rejection is scored as a research finding, and it floors the verdict
`signals.ts:34`: `applied.length === 0 → soft_fail`; `verdictEngine.ts:91-92`: a `soft_fail` on supplier
identity or brand risk raises the floor to `verify_before_purchase`. **Verified:** 7 rows have
`classifications_total > 0`, `classifications_accepted = 0` and zero evidence — the model produced
classifications and the firewall rejected 100% of them. That is indistinguishable in the record from a
genuine null finding, and the client is told to verify before purchase on the strength of a parsing
outcome.

### P1-15 · Two admin routes spend money or destroy data behind the weakest gates in the codebase
`POST /api/admin/dev/validate-track1` invokes the **real paid pipeline** behind only the legacy
`clients.role !== "client"` check — no capability, no env guard, no rate limit — and it *rejects* a
modern capability-model operator while *accepting* a legacy row. `DELETE /api/admin/clients/[id]`
hard-deletes a client, their cases and their files and purges both storage buckets with **no capability
check**. Three further admin write routes (`outcome`, `questions`, `notes`) require only operator
presence. There is **no rate limiting anywhere** (`grep -rln "ratelimit|upstash"` → zero matches).

---

## P2 — DEBT AND HYGIENE

- **The gate scans raw text; the client receives a stripped projection.** Architecturally these are
  different strings, so stripping could in principle create a banned phrase the gate never saw.
  **I tested this and it did not reproduce:** 4,690 strings scanned, 423 altered by the projection,
  **0 violations introduced**. Latent structure, zero live exposure.
- **The verdict derivation is not stored and its maths is not versioned.** Everything in
  `VerdictDerivation` is recomputed at render. Editing `TRACK_WEIGHTS`, `SIGNAL_SCORE` or `THRESHOLDS`
  silently re-explains every historical report with new arithmetic — and nothing records it:
  `rubric_version`, `corpus_version` and `configuration_version` are the literal `"0.0.0"` on all 78
  synthesis rows, while the real rubric is `g003-1.1.0`.
- **Cost is invisible.** `PRICES` in `lib/ai/providers/anthropic.ts` has one row, so an unknown model
  reports `$0` to a `console.error` nobody reads; Track 6's cost is computed and dropped at both call
  sites; there are **zero** consumers of `synthesis_cost_usd`, `total_track_cost_usd` or `llm_cost_usd`
  anywhere in `app/` or `components/`.
- **`audit_log` is write-mostly.** 13 of 16 key families have no reader and no admin screen renders it —
  `blocked:banned_language`, `blocked:not_deliverable`, `pipeline_failed` and `watchdog` are all written
  for a reader that does not exist.
- **Dead weight, counted:** 16 of 34 public tables hold **zero rows**. No writer anywhere for
  `email_log`, `client_events`, `research_findings` (5 stale rows, superseded by `case_track_results` per
  ADR-G001). Exactly one writer, never fired, for `admin_audit_log`. 14 of 46 `case_track_results`
  columns are written by nothing — including `suggested_signal`, which is in the read projection and
  documented as live, and `cost_usd`, a dedicated column bypassed in favour of jsonb. 12 `cases` columns
  are never populated. `cases.track_6_status` is read by the admin pipeline widget and written by
  nothing, so it shows "pending" forever — including on the one case where Track 6 actually ran.
- **`staff_client_assignments` is empty**, so scoped-operator partitioning — a security control — has
  never been exercised once. `admin_permissions` holds a single `super_admin` row.
- **Unreachable routes:** `confirm-scope` (guards on `awaiting_client`, which nothing sets),
  `change-request` (0 executions), `lib/research/orchestrator.ts` (0 callers, and it hardcodes
  `attempt_number: 1` — a latent overwrite if ever wired).
- **`getSynthesisByEvidenceHash` has no `case_id` predicate** — it can return another case's synthesis.
  Currently dead (memoization disabled at the call site), but that is a comment-and-call-site decision,
  not a structural one.
- **Never exercised, by tier:** zero `single_99` and zero `single_149` cases ever; 4 of 5 marketplaces
  unused; only PDF ever uploaded (the advertised image lane returns *unreadable*); Track 6 reachable only
  on plans 38 of 39 cases are not on; `past_due`, `cancelled`, `cancelling`, `trialling` never set.
- **$149 tier UI bugs:** the marketing CTA discards the chosen plan (every card links to a bare
  `/sign-up`), and `billing/page.tsx:137` renders `single_149` as **"1 credits / mo"** — wrong cadence,
  wrong plural — because the condition names only `single_99`.
- **Repeat one-time purchase grants nothing.** `raise_credits_to_allotment` is
  `GREATEST(credits_available, floor)` and the floor for a single tier is 1. Both `single_99` clients sit
  at exactly 1 credit, so either clicking the shipped "Buy another report" button pays and receives nothing.
- **`/api/cases/submit` never checks `billing_status`** — the access gate is a page `redirect()`, so a
  `past_due` client with a leftover balance can POST directly and consume a credit. Exactly the hole
  `checkoutGuard.ts` was written to close on the checkout route.
- **`/api/health` is public and returns raw backend error strings** (`detail: err.message`) plus bucket
  inventory to an unauthenticated caller.
- **Client-supplied filenames are concatenated unsanitised into storage keys.** Real production keys
  contain spaces, `#` and `&`. Traversal is **SUSPICION — unverified**; the malformed keys are verified.
  Related: `change-request` interpolates client text unescaped into HTML email bodies.

---

## CLEAN — CHECKED AND GENUINELY SOUND

- **Publish-path attempt pinning holds.** Gate, deliverability precondition and pin-write all resolve the
  same attempt (`review/route.ts:141/142/200`); client reads pin to `delivered_attempt`. SQL confirms
  **zero** delivered cases with a null pin, so the `?? latest` fallback has never once fired for any client.
- **The client projection is genuinely single-path.** Every client-facing render — portal page, the
  admin client-view preview, and all four PDF scripts — goes through `projectClientReport` +
  `buildClientFindings`, both delegating to the same pure functions in `lib/portal/clientReport.ts`. I
  checked the composition order at `lib/data/cases.ts:226-238` and `lib/admin/reviewView.ts:114` and they
  are identical. There is no second implementation to drift.
- **Delivery email works in production.** Both deliveries in the email era (≥ 2026-08-08) carry
  `delivery_email: sent` audit rows; the five earlier ones predate the feature. Verified by joining
  `audit_log` outcomes to `cases.delivered_at` — **not** from local env.
- **The client→client boundary holds on every read path traced.** `getCaseById`, `getClientReport` and
  `getCaseFindings` each independently re-derive `userId` from Clerk and confirm ownership in a separate
  query *before* returning anything. `getClientDecisionSnapshot` carries a historical "no ownership gate"
  annotation — all callers were enumerated and every production one supplies a gate ahead of it, with the
  line ordering checked.
- **Both DB views are `security_invoker=true`.** They are owned by a role that bypasses RLS and carry
  blanket grants — the shape that normally leaks everything — and `pg_class.reloptions` confirms the
  invoker flag on both. The one place the default would have been catastrophic was done right.
- **Storage is closed.** Both buckets private, `storage.objects` RLS on with zero policies (deny-all), and
  repo-wide grep finds no `createSignedUrl` / `getPublicUrl` anywhere — there is no client-facing download
  path to exploit.
- **Upload content vetting is real and pre-charge.** Type is decided by magic bytes only, the sniffed MIME
  is what reaches storage, and count/size are enforced server-side from the same constants the form uses.
  The operator path reuses the identical helpers rather than reimplementing them.
- **Mass assignment is closed** on both client-writable routes (fixed allowlists; `role`,
  `credits_available`, `billing_status`, `is_admin` all absent) — which is what keeps the RLS escalation
  chain theoretical.
- **Role-escalation containment is structurally sound.** `grantableBy` strips super-only capabilities for
  *everyone*, `manage_users` is not a capability string so no grant can confer it, `getOperator` re-strips
  at read time so a hand-edited permissions row cannot carry them, and both user routes refuse the
  caller's own row. All three write paths into `admin_permissions` were traced.
- **`getOperator` / `getClientScope` fail closed on every error branch** — no row, disabled row, query
  error and missing table all yield null/empty rather than a default-permit.
- **The Stripe webhook verifies signatures and is idempotent**, inserting into `stripe_events` first and
  treating a duplicate key as a replay.
- **The method scanner does report its location** — `field.path: pattern ("excerpt")` — so an operator
  blocked by it is not left guessing which sentence did it.
- **The service-role boundary is enforced at build time** via `import "server-only"`, with a lock test
  keeping the capability constants dependency-free so client components can import them safely.

---

## CORRECTIONS TO THE 2026-08-17 BRIEF (it asked to be checked)

1. **Corpus is 39 cases / 7 delivered**, not 6. `clients` holds **5 rows**, not 3 — the 3 was a stale
   `reltuples` estimate; the real `count(*)` is 5.
2. **`STRIPE_PRICE_SINGLE_149` remains unverified, and the repo contradicts itself** —
   `HANDOVER_DEV_COMPLETE.md:29` says it is set, `HANDOVER_2026-08-16_OPUS.md:38` lists it as an env hole,
   and `HyprrIQ_OPEN_ITEMS_HISTORY.md:44` says test-mode only. Per the standing trap I did not conclude
   from `.env.local`. **What is verifiable is the outcome:** zero $149 purchases have ever reached the
   database, so the tier is unexercised whichever document is right.
3. **The method scanner is better instrumented than the brief implies** — it returns field path and
   excerpt, so the missing "locator" matters less than stated.
4. **The 2026-08-17 skew fix is half-applied.** The route was fixed; the review page was not (P1-4).

---

## THE TWO QUESTIONS, ANSWERED BLUNTLY

### What would a technical due-diligence reviewer flag?

**The money path has never run in live mode.** All 37 Stripe events in this database are
`livemode: false`. `billing_audit` has zero `new_subscription` rows despite two live subscriptions, and
MRR is derived from `clients.plan_type`, not from settled payments. Either no live payment has ever been
taken, or live events are landing somewhere this database never sees. That is the first question a buyer
will ask and the hardest one to answer well.

**Nothing watches anything.** No SLA alarm, no timeout, no aging alarm, a watchdog that has fired once in
six weeks and whose clock the pipeline resets, an `onFailure` that has never fired across 31 dead
attempts, every alert return value discarded, and an audit log with no reader. The system is built to
fail loud and is currently failing silent.

**Security posture is app-layer only.** RLS is inert by construction, service-role is used everywhere,
and six credit functions are world-executable. None of it is presently exploited, but "the boundary is
forty hand-written `.eq()` calls" is a sentence that costs money in diligence.

**The size of the "never run" list.** Two of four plan tiers, four of five marketplaces, the image upload
lane, guest checkout, cancel/resume/downgrade, and the entire scoped-operator model have never executed
once. The product surface is materially wider than the tested surface.

### What would they be impressed by?

**The attempt ledger.** Re-runs append rather than overwrite, delivered records freeze, the client is
pinned to `delivered_attempt`, and the null-pin sweep is provably clean. Most teams at this stage
overwrite in place and cannot reconstruct what a client was actually shown. This one can.

**The client projection.** One allowlist, one set of pure cleaners, and every surface — portal, admin
preview, PDF — renders through the same functions. The admin can see byte-identical client output without
a second implementation. That discipline usually only appears after a leak forces it.

**The gate's reasoning.** `banned-language.ts` is the most carefully-built file in the repo: negation
awareness, attribution awareness, sentence scoping, and carve-outs that each cite the real output that
motivated them. It reads like something maintained against evidence rather than opinion.

**The commentary as an asset.** Nearly every non-obvious decision carries its ruling, its date and its
reason inline. For an acquirer inheriting this, that is the difference between a three-month and a
three-week ramp — and it is the reason this audit could verify as much as it did.

**The honest verdict:** the intelligence engine is the asset and it is in good order. The surrounding
operational and billing machinery is a prototype wearing production clothes. Nothing here is unfixable,
and the two P0s are hours of work, not weeks.
