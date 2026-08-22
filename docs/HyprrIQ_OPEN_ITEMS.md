# HyprrIQ — Open Items Tracker (v2, merged)

**THE SSOT. Supersedes BOTH prior versions:** the founder's standalone v2 draft (preserved verbatim at commit `a1d883c`) and the accretion tracker 2026-07-04 → 2026-07-28 (archived with its full ruling history at `docs/HyprrIQ_OPEN_ITEMS_HISTORY.md` — read it for the WHY behind any line here).
**Merged + source-verified:** 2026-07-29 (build thread). Every ✅/❌ correction below was checked against code/git/live-DB, not carried.
**Last updated:** 2026-08-22 (**§0-C FOUR-ITEM BATCH — /partners request flow live (mailto dead, public-route class fix), top-up copy pulled, rollover-RPC fix described-and-stopped, two operator runbooks.** Prior: **§0-B RULINGS EXECUTED — polarity gate 1.8.0, manufacturer-direct g003-1.2.0, download-in-place, email re-skins+lock+welcome+consent; two migrations + the 031 correction wait on the founder.** Prior: 2026-08-20 §0-A STALE-ROW CLEARANCE — seven rows were reporting fixed things as broken; all verified live and cleared. Plus: RLS proven as a 40-check suite with one latent escalation found (describe-and-stop SQL written, fix before Clerk→GUC wiring), env guard, Sentry, SEO plumbing, sample-report page, prose-override UI, resolved brand names on PDF covers.** Prior: 2026-08-18 §1 BUILT — token leaks + presence checkpoint; the P0's root cause CORRECTED, see the top dated block. Prior: END-TO-END AUDIT — see the dated block below §0; findings in `docs/AUDIT_FINDINGS_2026-08-18.md`. Prior: 2026-08-17 ENGINE-PROSE PASS built — see the dated block below §0. Prior: 2026-08-08 PRE-DESIGN BATCH opened — see the dated block below §0. Prior: 2026-08-02 ADR-008 RULED: superseded/demoted to post-launch, drop named — §6.13. *Dating note: sittings span midnights; a batch's entries may carry the opening date.*)
**Purpose:** One durable list of every open thread across all lanes, so nothing falls off between
sessions or between the planning thread, the UI/UX thread, and Fable.

**Legend:** 🔴 OPEN · 🟡 IN-PROGRESS · ⛔ BLOCKED · ✅ DONE · 🗄️ DEFERRED · 🔒 RESERVED

**Owner key:** **F** = Founder (live/prod actions, rulings) · **FA** = Fable (code) ·
**PT** = Planning thread (specs, rulings, review) · **UX** = UI/UX thread (design)

---

## 0-A. STALE-ROW CLEARANCE — 2026-08-20 (verified LIVE, not read off this file)

> **THE POINT OF THIS BLOCK:** the readiness audit found **seven rows that were lying** — each had
> been true when written and was overtaken by work that never came back to amend it. A tracker that
> reports fixed things as broken costs a session per stale row, and it trained a habit of trusting
> the file over the system. **The standing rule, founder-restated: verify live rather than reading
> the tracker.** Every clearance below was measured against the running system or the shipped code.
>
> | Row | Said | LIVE TRUTH (2026-08-20) |
> |---|---|---|
> | **1.1** Client report on-screen + PDF | "Placeholder only today" | **DONE.** Five real PDFs rendered, stored and downloaded through signed URLs; the on-screen report is the same projection. |
> | **1.4 / 3.8** Mobile | "Portal does not load on mobile. Broken surface." | **DONE** (layout phase 2026-08-04). `shell-chrome.tsx` carries a real drawer (`lg:static` sidebar, slide-in below); no overflow at 375px. |
> | **3.11** Download-PDF action | "Disabled 'coming soon' stub" | **LIVE**, both surfaces — client route + the new admin route (`62dfe1f`), three honest states. |
> | **§215** P0 internal tokens on delivered AWI-2608-034 | "P0 LIVE ON A CLIENT ACCOUNT — top of queue" | **CLOSED.** The presence checkpoint refuses at publish; projected payload scans clean. |
> | **§64 / §324** Two Scale pricing bullets + "AWI-2608-034 Scale unproven" | "Unbacked, needs a decision" / "blocked, unproven" | **BOTH RESOLVED.** Claims stripped (`ab648c9`); 034 delivered 08-18 and Scale re-proven via 038. |
> | **§128** Client name backfill | "Existing clients with a null `full_name` stay blocked for PDF" | **NOT NEEDED.** Every `clients` row has a `full_name` (live query). |
> | **4.11** ⚖ LEGAL FLAG banner | "Built, unverified" | **VERIFIED** — rendered through `react-dom/server`, two-sided (`4644878`). |
>
> **Also cleared this session:** **1.9** env separation (boot-time live-key guard, `b17805c`) ·
> **5.3** Sentry (wired key-safe, `645b560`) · **2.9** sitemap/robots/OG (`4fd6ba1`) ·
> **1.8** sample-report page (`9212296`) · **2.11** the dead `#pricing` anchor (`be3bbc2`) ·
> **1.10 / 5.2** RLS proven as a suite (`a7e7d53`, `078220e`) — **with one latent finding, below.**
>
> **🔴 NEW, FOUND BY THE RLS PASS — `clients_self` privilege escalation.** `FOR ALL USING (id =
> get_current_user_id())` with no `WITH CHECK` and no column restriction lets a client set their own
> `role='founder'` and gain admin over every table. **Not reachable today** (nothing sets the GUC for
> client traffic — proven: an over-the-wire PATCH matched zero rows), **but it goes live the instant
> Clerk→GUC wiring lands.** Fix written, founder-run:
> `supabase/migrations/20260820000000_clients_self_no_role_escalation.sql`. Full proof:
> `docs/RLS_PROOF_2026-08-20.md`. **FIX BEFORE WIRING.**

---

## 0-B. RULINGS EXECUTED — 2026-08-21 (polarity · manufacturer-direct · download · email batch)

> Four rulings landed the same day they were made, under the new standing authority
> (build/fix/improve without waiting — recorded in permanent memory 2026-08-21).
>
> | Item | State | Where |
> |---|---|---|
> | **Polarity census** (941 items read; ~2.9% strict, ~6.4% subject inversion) — **RESTATED 2026-08-21 after the 031 re-run**: the delivered-impact numbers are COUNTERFACTUALS ON STORED EVIDENCE — "0 verdicts move (strict class) / 1 moves (subject inversion, 031 → usable at 2.25) **when the flagged items are removed from the stored record and every other stored item is HELD FIXED**." That held-fixed clause is load-bearing: **no live mechanism performs a stored-evidence edit, and a dispute re-run is a DIFFERENT experiment** — it re-acquires packs, re-extracts stochastically, and runs the corrected prompts+gate, answering "what does the corrected system conclude today," not "what was the stored verdict without the mis-keys." Proven on 031: the re-run stayed verify at 1.80 because the corrected system also stopped crediting the counterfactual's +4 (`reseller_friendly` from the brand's own channels — the census's own defect class). The census numbers remain true of the stored corpus and are verifiable by the frozen rederive composition; they are NOT predictions of re-run outcomes. | ✅ REPORTED `8a19af4`, restated | `docs/POLARITY_CENSUS_2026-08-21.md` + `scripts/polarity-export.ts` |
> | **Polarity gate ⑧** — per-item polarity+subject declarations, deterministically cross-checked; firewall **1.7.0 → 1.8.0**; census carve-outs in all four track prompts | ✅ SHIPPED `70d8677` | ruling: subject inversion IS in the class |
> | **Manufacturer-direct** — same-entity detector (acceptance census = exactly {024, 034, 043}), `manufacturer_direct` +8 = pass, code-emitted only; Track 3 keeps voting with same-entity context; rubric **g003-1.2.0** | ✅ SHIPPED `0a5ad5e` | `docs/DESIGN_MANUFACTURER_DIRECT_2026-08-21.md` + `scripts/same-entity-census.ts` |
> | **Download in place** + 202 copy re-ruled | ✅ SHIPPED `8db676b` | founder-accepted, incl. the future-tense attachment line |
> | **Email re-skins + LAYOUT LOCK (same commit) + welcome (create-path idempotency) + email_log ledger seam** | ✅ SHIPPED | 6 previews gate-clean in `public/prototype/email-preview/` |
> | **Consent capture + tokenized permanent `/unsubscribe`** (fail-soft until migration; new env `UNSUBSCRIBE_TOKEN_SECRET`) | ✅ SHIPPED | app collects, tool sends |
> | **Two migrations** — `20260821000000` (email_log.dedup_key) + `20260821000100` (marketing_contacts) | ✅ **FOUNDER RAN BOTH 2026-08-21** (via MCP, from the spec) | live shape verified by read-back; repo files rewritten as AS-APPLIED records; three write-breaking diffs reconciled in code (consent_status enum, consent_at, unsubscribed_at) |
> | **Emails 4–7** — payment-failed (webhook, dedup `payment_failed:{invoice_id}`), low-credit ×2 + renewal reminder (daily `email-reminders` cron, dedup by unique key) | ✅ SHIPPED | reserve-then-send on email_log; fail-closed ledger; 10 previews gate-clean |
> | **⛔ F: 031 correction** (ruling: verify → usable under the subject-inversion class) | ⛔ FOUNDER RUNS | recommended path: `dispute-rerun.ts` on `5f6a093f-…` — new attempt under 1.8.0, new PDF, H1-clean; a SQL edit of stored evidence would leave portal ≠ frozen PDF |
> | Email 5 (cancellation) | ⛔ blocks on the deletion policy, as ruled | nothing that promises deletion ships before something deletes |
> | **LEGAL TRUTH AUDIT (2026-08-22, planning-thread ruling — HyprrIQ_LEGAL_PAGES_FINAL.md is SUPERSEDED by the built pages; the code wins):** full claim-by-claim audit of all six pages; SEVEN false claims fixed (billing-page worked examples removed · refund-formula ambiguity → the LOCKED per-plan formula, derived at render from plans.ts so it can never disagree with pricing · Terms §5 top-up bullet DOUBLY false — no ordering exists AND top-ups DO expire via the rollover clip · cookie table had TWO phantom rows (CSRF, Stripe-on-our-domain) plus the missing hyprriq_grant · scheduled deletions nothing performs → rephrased as kept commitments, 180-day case-record deletion replaced with while-active retention · past-due submissions now actually pause (BUILT + fixture-locked; cancelled blocks too, cancelling deliberately does not) · effective date null-until-launch, renders "Effective on launch"). Retired-pricing lock sharpened for refund arithmetic ($239.94 is not the retired $239). | ✅ AUDITED + FIXED | ⛔ F sets LEGAL_EFFECTIVE_DATE at the domain move |
> | **Cloudmersive virus scan** — blocking at upload, FAIL-CLOSED (outage = uploads refuse on plans that take them, stated + accepted), verdict audited either way, `virus_scan_status` stamped on clean rows | ✅ SHIPPED, live-verified (clean pass · EICAR caught · no-key refuses) | test with the EICAR string — instructions in `lib/security/virusScan.ts` |
> | **JWT-scoped client + adversarial probe** — `createUserScopedClient` (anon key + verified Clerk token; wired into NO read path yet, per the ADR) + `scripts/rls-jwt-probe.ts` (real JWKS-verified token, five checks, safety-restore on any flip) | 🟡 probe run PRE-migration: steps 3/4/5 HOLD, steps 1/2 fail with zero rows — the exact signature of "provider on, migration missing" | ⛔ F runs `20260820000100`, then re-runs the probe; if 1/2 still fail, add `"role": "authenticated"` to the Clerk session token (dashboard) |
> | **Retention sweep** — daily cron, ⛔ OFF until founder sets `RETENTION_SWEEP_ENABLED=1`. Deletion policy RULED 2026-08-21: deletion is PERMANENT, and **THE WARNING IS THE GATE** — every client gets ONE email per expiry month 30 days before removal (dedup `retention_warning:{client_id}:{YYYY-MM}`; the email_log sent_at is the clock), and nothing deletes until its warning is ≥30 days old, so first activation warns-and-waits instead of deleting unannounced. Second gate: **no frozen documentation_review Evidence Pack → no deletion, ever** (rejudge survives; skip audited). Failed storage removal retries tomorrow — never a stamped row with a live object. + dormant one-time 24-month notice (once ever, by unique key) | ✅ SHIPPED with warning email, flag off — **F may now flip the flag** (the ruled precondition, the warning email, exists) | JWT probe: **FULL PASS post-migration as a role='client' user** — isolation proven with a real verified token |
> | **RLS / ADR-RLS-001 — COMPLETE.** Probe post-migration: own rows visible · zero foreign rows unscoped · cross-client zero · self-promotion HTTP 401, row untouched · storage refused. Probe's third self-found defect fixed: it now REFUSES to run as an elevated role (a founder token legitimately sees everything — probing as one reads as false P0s) | ✅ PROVEN | read-path migration onto the JWT client = later, measured, read-by-read |
> | **GRANT RULINGS (2026-08-21, post-RPC):** ① redemption is LIVE end to end (RPC verified by read-back: garbage → 'invalid_code' as a word; prosecdef + pinned search_path). ② **Index grain: PER-GRANT, RULED DELIBERATELY — a decision, not a gap.** Grants are targeted links to named people; per-grain lets the founder issue someone a second grant later; max_redemptions caps blast radius. REVISIT only if a code is ever broadcast publicly — that is when global one-per-email earns its place. ③ **already_has_plan is a RULE: an existing client gets a free report via a CREDIT ADJUSTMENT, never a grant** — do not "fix" the refusal. ④ Dashboard preview = SYNTHETIC FIXTURE by ruling (real components over invented data; never a screenshot, never a masked real case). | ✅ RULED | fixture case ids moved to the impossible AWI-2600 month — the old ones collided with real corpus cases |
> | **/partners** — the audience the first clients come from (VAs, agencies, consultants): the check-before-you-recommend pitch, the free full assessment offer, the referrals conversation; **grant invite links now land here with context** (?invited=1 banner), not on a bare sign-up; SEO: "wholesale supplier verification for agencies" | ✅ SHIPPED | copy rules held: "a full assessment", never a tier name |
> | **DOCUMENTATION LANE — planned, NOT started (founder-directed: its own session, plan first).** Five documents, role-gated (staff < admin < super_admin), professional-SaaS standard: ① end-to-end architecture from source (tables, writers, readers, frozen surfaces) ② symptom→location debugging map ③ staff/admin workflow knowledge base ④ client-facing how-to derived from ③ ⑤ Claude's addition (named in the 2026-08-21 report: the generated Instruments & Locks Index). DESIGN CONSTRAINTS RULED: drift must be visible or impossible (behaviour docs live beside code, change in the same commit); secure role-gated routes, never a public wiki | 🔴 NEXT SESSION | the next session opens knowing this exists |
> | **Acquisition grant — PHASE 2 SHIPPED** against the founder-applied live schema (code/mode/grant_plan_type/grant_credits/redemption_count/revoked_at + clients.referred_by_grant_id; repo files rewritten as-applied): admin manager at /admin/acquisition (super-admin; create link/coupon, cap, ≤30d expiry, copy, revoke, see redemptions), invite link /grant/[code] (public; cookie → sign-up → auto-redeem on first portal load), coupon box on the plan-less billing page, "full assessment" framing throughout. TWO MATERIAL SCHEMA DIFFERENCES SURFACED, not worked around: live email-uniqueness is PER-GRANT (grant_id, lower(email)) — the same email/account can collect one of EACH grant, weaker than the "one person can't collect several" ruling — and NO atomic redemption RPC exists yet | 🟡 works end-to-end the moment F runs `20260821000400` (the RPC; redemption answers "not available yet" until then); the global-uniqueness upgrade is one index pair IF the ruling meant global | plan_type CHECK: found ALREADY APPLIED by the single_149 migration — no-op recorded; lesson: model against the LIVE schema |
> | **Download prompt at cancellation** — one click to the report list from the cancel-confirm panel | ✅ SHIPPED | Terms/Data-Policy alignment |
> | **Closure machinery** (30-days-after-closure deletions, dormant auto-close, `clients.closed_at`) | 🔴 NEXT BATCH | needs a founder-run migration + closure semantics; the retention schedule's closure-clocked rows cannot run until an account can close |
> | Instrument fix: `publish-preflight` was DEAD (Clerk top-level import dragged client-context into the react-server graph via `operatorNames`) — lazy import; preflight for 031 attempt 4: gate clean, checkpoint clean, PDF renders | ✅ FIXED | 031 adoption = review-screen publish with explicit override verdict |

---

## 0-C. FOUR-ITEM BATCH — 2026-08-22 (planning-thread ruling; diagnose-and-fix one pass)

> | Item | State | Where |
> |---|---|---|
> | **① /partners mailto KILLED** — in-page request form files a REQUEST, never a grant (ruled 1c); founder decides in /admin/acquisition (new Partner requests panel above the grants panel) and is paged by a gate-clean sendAdminAlert; honest 2-business-day confirmation copy, no tier name, no promise. Abuse: server-side validation, honeypot (no CAPTCHA, ruled), per-IP nuisance brake, one-open-request-per-address partial unique index; consent opt-in reuses the ONE marketing_contacts write (extracted to `lib/data/marketingConsent.ts`) | ✅ SHIPPED, fail-soft | ⛔ **F runs `20260822100000` (partner_requests)** — until then the form answers "not open yet" |
> | **① CLASS FIX** — `/unsubscribe` + `/api/newsletter` were NEVER in PUBLIC_ROUTES (the marketing-route lock only walks `app/(marketing)`): logged-out footer signups died on a Clerk 401, and a campaign unsubscribe would have bounced to sign-in on the ADR's permanent URL. Both public + locked by name; `/api/partner-request` joins them. Footer contact mailto now shows the ADDRESS as its label | ✅ FIXED | `lib/auth/public-routes.ts` + test |
> | **② Top-up language PULLED from every client-facing surface** (LOCKED — removed, never hedged; not for sale at launch): Terms §5 bullet · Payment Policy paragraph · FAQ sentence · pricing Scale bullet + comparison row · portal credits "(top-ups & rollover carry until used)" (also FALSE above the cap — audit-#6 class). **NOT removed (founder's carve-out — changes what a client can BUY):** billing-page Top-Up card, checkout session route, checkout-button, checkoutGuard 409 message, webhook topup path — founder's call, reported in the session deliverable | ✅ SHIPPED | no top-up copy returns before the item-③ RPC fix (Terms comment records the condition) |
> | **③ rollover_client_credits DESTROYS PAID CREDITS** — `LEAST(credits_available, cap)` clips the whole balance, top-ups included. DESCRIBE-AND-STOP delivered: needs `clients.purchased_credits` (one honest column), rollover clips only the plan portion, plan-first consumption in deduct, read-backs included. MUST run before top-ups are ever sold | ⛔ **F RUNS** (SQL in the 2026-08-22 session deliverable, one block with the partner_requests migration) | `supabase/migrations/20260708000000` is the defective source |
> | **④ Operator runbooks for the two by-hand obligations** — `docs/runbooks/RUNBOOK_ACCOUNT_CLOSURE_DELETION.md` (30-days-after-closure deletion: the admin delete button, the `intelligence_events` RESTRICT workaround, the email_log scrub the button does not do, four zero-row read-backs) + `docs/runbooks/RUNBOOK_REFUND_BY_FORMULA.md` (classify → count used → locked formula, round once at the end → Stripe dashboard → rule-c/d credit handling → read-backs). Pointer comments at the three code sites. NOT the documentation lane — that stays parked for its own session | ✅ WRITTEN | **found during ④: closure deletion FAILS for any client with completed research** (intelligence_events ON DELETE RESTRICT + append-only trigger) — manual escape documented; corpus-preserving schema fix offered in the describe-and-stop block §C, unruled |

---

## 0. STATE OF PLAY — what is frozen and done

| Capability | State |
|---|---|
| Evidence layer — Tracks 0, 0.5, 1–5 | ✅ Frozen |
| Hardening H1–H7 (integrity substrate) | ✅ Frozen |
| Intelligence Synthesis Engine (ADR-G005, 9 modules) | ✅ Frozen `g005-1.0.0` |
| Deterministic Verdict Engine (ADR-G004) | ✅ Frozen |
| Track 6 — Category Compliance | ✅ Frozen `cc-1.0.0`, gated `scale_499` |
| Banned-language fix gate | ✅ Frozen `3d46314` |
| G3 write-side corpus | ✅ 2 of 3 (relationship records — see 6.2) |
| Phase E — checkout + webhook | ✅ **CLOSED 2026-07-29** (test checkout created `single_99` client) |
| `synthesis_extension` migration | ✅ Run + verified |
| First full loop: wired engine → publish → delivered | ✅ **AWI-2607-022 delivered 2026-07-29** |

| Morandelli outcome + `prediction_correct` | ✅ Recorded (founder, H6 panel) |
| Degraded-write tripwire (G006 item-4) | ✅ Built + registered (daily cron) |

**Development fixture:** AWI-2607-022 (delivered, wired-engine, real Module 9 output).

---

> **✓ RESOLVED 2026-08-02 — ADR-008 corpus caching: founder ruled SUPERSEDED / DEMOTED to
> post-launch, with the drop NAMED per standing rule 6.** Full ruling + reasoning: §6.13 and the
> HISTORY 2026-08-02 append. The binding Q4(b) constraint (`synthesis_input_hash` keying, never
> `evidence_hash`) and the F5 rollups-on-adoption flag travel with it, preserved verbatim.

> **✓ TIER LADDER RULED + VERIFIED 2026-08-19 — and TWO SCALE CLAIMS ARE NOT BACKED BY CODE.**
> Measured from the code, not the pricing page: `CATEGORY_PLANS = ["scale_499","single_149"]`
> (`categoryStep.ts`), `PLAN_BRAND_CAPS` growth_279 = scale_499 = **5**, `TRACK_CONFIG` gives 5
> areas to 149/Growth/Scale, and `CASE_SLA_HOURS = 24` is ONE constant for every tier.
>
> | | $99 | $149 | Growth $279 | Scale $499 |
> |---|---|---|---|---|
> | Assessment areas | 3 | 5 | 5 | 5 |
> | Category compliance (T6) | ✗ | ✓ | **✗** | ✓ |
> | Brands per report | 3 | 3 | 5 | 5 |
> | Synthesis / contradiction | same | same | same | same |
>
> **⛔ FOUNDER RULING — GROWTH MUST NOT GET TRACK 6, and the WHY is now in the code
> (`categoryStep.ts`) because it reads like an oversight and is not.** Growth and Scale already
> share five areas, five brands, the same engine and the same SLA. **Track 6 is the ONLY capability
> separating them** — add it to Growth and the $279/$499 distinction collapses to report volume
> alone, which does not carry a $220/month gap. Founder's words: *"279 no if track 6 then will be
> no difference at all with 499."* The ladder is deliberately TWO-AXIS: $149 buys DEPTH at 3 brands,
> Growth buys BREADTH at 5 brands without category compliance, Scale buys both. **$149 being
> engine-richer than Growth is intentional, not a mistake.**
>
> **🔴 TWO SCALE PRICING BULLETS ARE UNBACKED — NEEDS A DECISION BEFORE MARKETING COPY IS WRITTEN.**
> (a) *"Deep analysis + contradiction checks"* — there is NO plan gating anywhere in synthesis;
> `scale_499` appears in the engine in exactly two places (the registry arrays and the Track 6 gate).
> Every tier gets identical synthesis. (b) *"Delivered within 24 hours"* — listed under "Everything
> in Growth" as though Scale adds it; it is the same `CASE_SLA_HOURS` constant $99 gets. Stripped of
> both, Scale's honest differentiators are category compliance, 5 brands vs 3, 12 reports, rollover —
> and against GROWTH specifically, category compliance alone. **NOT changed unilaterally: this is
> what a client is promised.**
>
> **⚠ WITHOUT KEEPA, SCALE'S ENTIRE DIFFERENTIATOR IS ONE ADVISORY SECTION THAT CANNOT STATE A RISK
> LEVEL** (no ASIN ⇒ the engine cannot know the product's category ⇒ `risk_level` never prints HIGH,
> by ruling). Keepa is not an add-on, it is what makes $499 a different product: it activates the
> three inert Track 3 weight keys (`keepa_stable_no_cliff`, `keepa_enforcement_cliff`,
> `low_seller_count_stable` — brand-risk scoring currently runs with enforcement signals OFF), and
> an ASIN lets Track 6 stop hedging. See §11 in the pending list.

> **✓ §2 TRACK 6 CLIENT SURFACE + §3 CONCATENATION BUILT 2026-08-19** (`ba63e4d`, `359a3c0`).
>
> **⚠ THE CORPUS COULD NOT ANSWER §2, AND THAT IS THE FINDING.** `scripts/track6-surface-probe.ts`:
> 39 cases, exactly **ONE** carries a track_6 row (AWI-2608-034), and **ZERO `single_99` or
> `single_149` cases have ever been run.** Designing the surface from the corpus would have been
> designing it from one case. Fixtures are therefore derived from the CONTRACT + the plan registry
> and carry every empty state whether or not a stored case exhibits it.
>
> **THE AREA COUNT — TWO WRONG BASES MEASURED AND REJECTED.** (1) counting RENDERED ROWS is the
> reported bug (Scale reads "6 assessment areas"; we sell five). (2) counting `non_voting !== true`
> is WORSE — the probe found `sourcing_logic` carrying `non_voting: true` on 5 rows and absent on
> 11, so the same track would count as an area on some cases and not others. (3) FIX:
> `isAssessmentArea()` by MEMBERSHIP in the canonical TRACKS registry — a PRODUCT property.
> $99 → 3 · $149/Growth/Scale → 5 · an advisory row never moves the number at any tier.
>
> **A SOURCE-SCAN LOCK CAUGHT MY OWN COMMENT.** `track6.inertia.test.ts` asserts the Track 6 key
> never appears literally in `lib/constants/tracks.ts` (frozen `synthesisCallB` consumes
> `Record<TrackKey,…>` exhaustively). My explanatory comment named it and failed the lock.
> Reworded; the helper answers by membership and needs no name.
>
> **⚠ UNRULED:** `"MODERATE-HIGH"` exists in the flags table; the ruling named only HIGH and
> MODERATE. Mapped to the flagged label (it sits above moderate) — my reading, not a ruling.
>
> **§3 — THE CONCATENATION IS NOT TWO FIELDS JOINED. BOTH PRIOR DIAGNOSES WERE WRONG.**
> `scripts/snapshot-prose-probe.ts` over every delivered snapshot: **7 checked · 0 dangling
> connectors · 2 RUN-ONS INSIDE A STORED FIELD.** The field is `decision_snapshot.headline`;
> Module 9 stores ONE string `"<claim>. — subject to verification of <x>"`. Fixed at render by
> `splitHeadline()`, anchored to the PHRASE not a dash (034's claim contains its own em-dashes —
> a dash split would cut the supplier's name in half). Nothing truncated; claim + qualifier
> reconstruct the original.
> **§3 IS PART 1 OF 2: the LAYOUT re-look is NOT done** — it needs the rendered report at all four
> tiers, which is the next thing.

> **✓ §5 CLIENT NAME FROM STRIPE BUILT 2026-08-18 — the `no_client_name` PDF blocker, closed for
> NEW checkouts.** `app/api/webhooks/stripe/route.ts` — `customer_details.name` is captured ABOVE
> the three-way branch (topup / subscription / one-time); inside any one of them, two of three paths
> would still lose it, which is the same shape as the bug. SET-IF-NULL enforced by the statement's
> own `.is("full_name", null)` predicate rather than a read-then-write, so a concurrent onboarding
> submit cannot lose a race against a webhook retry. Non-fatal: a paid checkout must never fail
> because a display name did not land.
>
> **⚠ `company_name` HAS NO STRIPE SOURCE — REPORTED, NOT INVENTED.** The ruling said "same for
> company_name", but Stripe's `customer_details` carries address / email / name / phone / tax only,
> and this integration configures NO `custom_fields` on the checkout session. There is nothing to
> capture. To have one, the checkout session must be changed to collect it — a separate decision.
>
> **⛔ BACKFILL IS A PROD DATA ACTION — DESCRIBED AND STOPPED, FOUNDER RUNS IT.** Exact SQL and
> read-backs are in the commit message for `§5`. The webhook fix only helps FUTURE checkouts;
> existing clients with a null `full_name` stay blocked for PDF until the backfill runs, and the
> names live in Stripe, not in our DB — so the backfill is a Stripe-side export, not a pure SQL
> UPDATE. Read the commit before running anything.

> **✓ CLASS 4 BUILT 2026-08-18 — the derivation scanner now covers TRACK PROSE. CENSUS 8/39 (21%)
> → 17/39 (44%). ⚠ THE RISE IS THE CORRECT OUTCOME AND IS NOT A REGRESSION:** those occurrences
> pass the publish gate today and always have. Nothing got worse; the instrument stopped being
> blind. The language scanner covered both client-facing prose surfaces, the derivation scanner
> covered one — a scanner covering one of two surfaces is the defect, not the coverage.
>
> **⚠ THE RISE IS MUCH BIGGER THAN CLASS 4, AND IT IS NOT MOSTLY `weight_key`. THIS IS THE FINDING.**
> Class 4 named 9 `weight_key` occurrences over 6 cases. Extending the scanner surfaced a far larger
> class beside it — **CORROBORATION VOCABULARY IN TRACK PROSE**, on 11 cases:
> `weight key`/`weight_key` → AWI-2606-009, 2607-014, 2607-016, 2607-030, 2608-034 (5) ·
> **corroboration vocabulary → AWI-2606-004, 2606-012, 2607-014, 2607-016, 2607-017, 2607-021,
> 2607-023, 2607-028, 2607-029, 2607-031, 2608-034 (11)** · source-count threshold → 2607-023 (1).
> The ruled attribution carve-out still applies (named sources pass; counts block), so these are
> genuine method voice, not the "corroborated by the FDA, BBB and LinkedIn" shape. **44% of the
> corpus would now be held at publish. That is a launch-risk number and it needs a decision:** the
> engine-prose pass retired this class in SYNTHESIS prose; it was never run over TRACK prose.
>
> **⚠ UNRULED GAP, FOUND AND DELIBERATELY NOT CLOSED — NEEDS A RULING.** `METHOD_PATTERNS` matches
> `weight[_\s]?key\b`, which does **not** match the PLURAL, and the corpus contains plurals
> (AWI-2607-030 "the relevant blocking weight keys"). Adding `s?` WIDENS A GATE RULE — the ruling
> was a coverage extension, not a change to what the patterns match, and slipping a widening in
> under a coverage commit is what the "laws attached to plumbing get named" rule exists to stop.
> **CONSEQUENCE FOR THE NUMBERS:** the token-leak sweep counts `keys?` and reports 9 occurrences;
> the gate, with the narrower pattern, sees fewer. **The two instruments disagree ON PURPOSE until
> this is ruled — do not "fix" one to match the other without it.**
> Surface: the ALLOWLIST projection of each track row, NOT the raw row — raw carries internal
> machinery whose values legitimately contain this vocabulary and never reach anybody, so scanning
> it wholesale would manufacture false blocks. Landed INSIDE the merged census composition, never
> beside it. Gates: 1495/1495 · tsc 0 · eslint 0.

> **✓ §1 BUILT 2026-08-18 — CLEANER FIX + PRESENCE CHECKPOINT + RENDER-PATH INVENTORY, ONE LANE.**
> Corpus effect, measured over all 35 projected client payloads before and after
> (`scripts/token-leak-sweep.ts`, read-only): **cases carrying an internal token 34/35 → 6/35.**
> `src_N` 169 → 0 · `EV-NNN` 3 → 0 · UUID 47 → 0 · `stub track_N` 47 → 0 · bare `dimension` 30 → 0.
> Residue: one accepted `A-NN` (below) and `weight_key` 9 (Class 4, its own commit by ruling).
>
> **⚠ THE ROOT CAUSE ON RECORD ABOVE IS WRONG — FOUNDER-CORRECTED 2026-08-18. It is NOT "REF_GROUP
> matches parenthesised groups only".** AWI-2608-034's leaked field is
> `(EV-001, EV-004, EV-005, A05, A08)` — that citation **is** parenthesised, so the recorded cause
> cannot explain it. The real cause: **the group matcher requires EVERY member to be a known token,
> so one unrecognised shape (`A05`, `A08`) disabled the match for every known token beside it.**
> An unknown token does not merely survive — **it PROTECTS the known ones.** The wrong cause on
> record would have sent the next reader hunting bracket shapes and they would have found nothing.
>
> **✓ RULED 2026-08-18 — bare `A-NN` is NOT asserted at the checkpoint. Consistent with the `E-nn`
> ruling and for the same reason:** `A10` collides with real product model numbers, and a false
> refusal at publish is the worst failure a backstop can have. The grouped matcher now covers
> `A\d{2}`, which is the right level. The single residue on AWI-2608-032 (`"(A10, unresolved)"` —
> a token mixed with a real word, so the all-tokens matcher correctly declines it) is **ACCEPTED,
> not pending.**
>
> **✓ RULED — Class 3 (`dimension`) is a CLEANER job, word-level substitution.** A checkpoint
> refusal must mean *something internal escaped*, not *we used last month's word*. **The corpus
> forced a compound rule that no single occurrence reveals:** AWI-2607-030 carries "All five major
> assessment dimensions", which a bare word-for-word substitution turns into "assessment
> **assessment areas**" — broken output shipped to a client. Qualifier compounds
> (assessment/verification/research/evaluation/scoring + dimension) resolve FIRST. The word also
> carries an ordinary-English sense in this corpus ("any other dimension of vendor legitimacy");
> all 12 distinct corpus sentences are two-sided fixtures.
>
> **THE STANDING RULE CAUGHT TWO OF CLAUDE'S OWN DEFECTS THIS SESSION, BOTH VIA CORPUS FIXTURES:**
> (1) the "anchored" `EV-\d{3}` had no anchor and matched inside the product model `EV-2000`,
> shipping "the **0** charger" — a false strip corrupting a client's own product name, which is
> worse than the leak this module exists to stop; (2) a min-3-word fragment guard deleted
> "Enforcement documented." — a real two-word finding. Both were invisible to review and visible
> to the corpus. Recorded because the rule keeps paying for itself.
>
> **BINDINGS (built):** tail of `cleanClientFindingJson` + `projectClientReport`
> (`lib/portal/clientReport.ts`) so anything built on them inherits the backstop BY CONSTRUCTION ·
> the PUBLISH gate over the fully-assembled PROJECTED payload — the refusing point, 422
> `internal_tokens` with per-occurrence paths (`app/api/admin/cases/[id]/review/route.ts`) · PDF
> render (`lib/pdf/renderReportPdf.ts`). **The escape (`allowInternalTokens`) is explicit, defaults
> to OFF, and exists only for the operator's review page — a gate that hides the leak it is
> complaining about would make a leaky case unreviewable.**
> **EMAIL IS NOT BOUND, AND THAT IS A MEASURED FINDING, NOT AN OMISSION:** `lib/email/notify.ts:98`
> carries case number + vendor name only — no engine prose. It comes into scope when the PDF is
> attached (§4).
> **RENDER-PATH INVENTORY (ruled as part of the fix, not assumed):** exactly ONE sanctioned
> client-byte chain and both client surfaces use it — portal `lib/data/cases.ts:238`, PDF
> `lib/pdf/renderReportPdf.ts` via `buildClientFindings`. Admin reads raw, correctly. Locked by
> `lib/portal/clientRenderPaths.lock.test.ts` so a future path cannot quietly bypass it.
> Gates: 1478/1478 · tsc 0 · eslint 0 · frozen surfaces untouched · `FINDING_CLIENT_ALLOWLIST` unchanged.

> **🔴 P0 LIVE ON A CLIENT ACCOUNT — INTERNAL TOKENS ON DELIVERED AWI-2608-034. TOP OF QUEUE.**
> **↑ SUPERSEDED BY THE §1 BLOCK ABOVE — including its ROOT CAUSE, which is corrected there.
> Kept verbatim because the ruling history is the record; read the correction first.**
> Measured over 034's **PROJECTED** client payload, after every existing cleaner — **THREE leaks, TWO
> classes**, not the one seen by eye: `src_1, src_18` in `findings[1].summary` (Supplier Legitimacy —
> the visible one) · `src_3, src_9, src_0` in `findings[3].summary` (**unseen**) · **`EV-001, EV-004,
> EV-005` in `decision_snapshot.leading_interpretation`** (**unseen — evidence IDs in the client's
> summary block, the most-read field on the page**).
> **ROOT CAUSE — NOT A BYPASSED PATH.** `stripInternalRefs`' `REF_GROUP` matches **parenthesised
> groups only**. `(src_1)` strips; `; src_1 and src_18 concern...`, `[src_2]`, `Evidence: src_3, src_4`,
> sentence-initial `src_5 is...`, `Sources src_6 and src_7` **all survive** (proven, six shapes).
> `dropSourceDisposalSentences` missed the same sentence — **two mechanisms, same blind spot**. The
> projected/raw boundary HELD; the allowlist did its job. This is coverage inside the projection, not
> a breach of it. It was "verified weeks ago" because **the fixtures were parenthesised**.
> **FIX (ruled):** token-level strip **+** sentence-level drop **+** widen the disposal filter — NOT a
> wider regex alone; **grammar must survive the strip**. All six shapes as two-sided fixtures, 034's
> actual delivered text as the regression case. **Render-path inventory is PART OF the fix — do not
> assume it away**: the cleaner defect explains the leak but does not rule out a second uncleaned route.
>
> **✓ RULED 2026-08-18 — THE PRESENCE CHECKPOINT (a backstop, not another cleaner).** Founder's
> framing, recorded because it is the design: *"every cleaner matches KNOWN BAD SHAPES, so any shape
> nobody imagined passes. A wider regex just moves the edge of imagination."* Before any text reaches
> a client — portal, PDF, email — assert the **mere PRESENCE** of internal token patterns, regardless
> of grammar or punctuation. **Any occurrence REFUSES.**
> **⚠ PLACEMENT IS COUNTER-INTUITIVE AND MUST NOT BE GOT WRONG: it sits on the CLIENT side of the
> projection — the OPPOSITE side from every existing gate.** Today's delivery gate scans RAW
> `compiled_findings_json`. For banned language that is safe (cleaning only removes, so raw is a
> superset of projected). **For internal tokens it inverts: raw ALWAYS legitimately carries `src_N`
> (the operator's ruled source-checking leverage), so a token assertion on raw would refuse every case.**
> Same defect shape as the census/attempt skew — two instruments not pinned to the same thing.
> **BINDINGS (ruled):** (1) at the TAIL of `cleanClientFindingJson` and `projectClientReport` — the
> only sanctioned way to produce client bytes, so anything built on them inherits it by construction;
> (2) the PUBLISH gate over the fully-assembled projected payload — the REFUSING enforcement point;
> (3) PDF render and email assembly. **PLUS A LOCK TEST: no client-facing render path may read raw
> track rows** (freeze-test pattern).
> **TOKEN RULES (ruled):** `src_N` safe, assert freely · **`EV-` plus exactly three digits, ANCHORED;
> bare `E-nn` DROPPED** — it collides with real product model numbers (E-40, EV-2000) and **a false
> refusal at publish is the worst failure mode for a backstop** · internal snake_case track keys safe
> in prose · **`client_notes` IN SCOPE** · **`review_additions`: EXCLUDE URL-valued fields or
> normalise them out BEFORE Part B ships** (an operator pasting `/img/src_1.png` must not refuse a
> publish).
> **⛔ LAW, WRITE IT INTO THE CODE SO NOBODY MERGES THEM: the cleaners are SHAPE-based and may always
> miss; the checkpoint is PRESENCE-based and may NEVER be widened into a shape matcher. The moment
> someone adds grammar-awareness to fix a false positive, it stops being a backstop.**
> NOT caught by the checkpoint: **defect 2** (`category_compliance` rendered as a raw key + "THE 6
> ASSESSMENT AREAS") is a RENDERING choice, not a token in prose — **the Track 6 pass still owns it**,
> and the area count must derive from VOTING areas only.
>
> **⛔ STANDING RULE 2026-08-18 — A FIXTURE THAT ONLY CARRIES THE SHAPE THE RULE WAS WRITTEN FOR
> PROVES NOTHING ABOUT THE SHAPES IT WASN'T.** This leak and the census undercount are **the same
> failure: the instrument only saw what it was built to see.** **Any new cleaner or scanner ships with
> fixtures covering shapes the author did NOT have in mind.** Not a suggestion — the acceptance bar.
>
> **QUEUE (founder-set, ahead of the client-name item):** 1 the cleaner fix + render-path inventory +
> the presence checkpoint, ONE lane (the checkpoint is what makes the cleaner fix trustworthy rather
> than another shape guess) · 2 defect 2 with the Track 6 pass · 3 defects 3/4 + vendor website +
> formatting as one presentation pass against the approved prototype.
>
> **✓ TRACK 6 CLIENT SURFACE — RULED 2026-08-18. Ships with the Track 6 pass; §8 closed.**
> Approved as proposed. Verified against AWI-2608-034's REAL stored findings, not a mock.
> **risk_level renders as "Flagged for closer attention than the other categories on this case."
> NEVER "HIGH".** THE REASON, founder's, recorded because it is the load-bearing why and someone
> could otherwise undo it: **without an ASIN the engine cannot know which category the client's
> product sits in — printing HIGH would claim exactly what we established it cannot determine.**
> Keep the ordering signal, drop the claim. (MODERATE → "Standard attention for this category.")
> **PROJECTOR BRANCH, NOT THE ALLOWLIST** — a branch in `projectFindingJsonForClient` mirroring the
> existing `sourcing_logic` precedent. Adding `category_compliance` to `FINDING_CLIENT_ALLOWLIST`
> would drag `matched_via` ("category_research" — METHOD vocabulary, the exact thing the derivation
> scanner exists to stop), raw `evidence_ids`, `audits` and `scope` across.
> **CROSSES:** category · subcategory · confidence · evidence COUNT (derived from
> `evidence_ids.length`, never the ids) · `flag_language` VERBATIM · `brand_category_note` ·
> the attention label. **NEVER CROSSES:** `matched_via` · `evidence_ids` · `audits` · `scope`.
> **TWO BLOCKS, SEPARATE ATTRIBUTION — THE BOUNDARY IS STRUCTURAL, NOT A DISCLAIMER.** (a) what the
> research found, evidence-backed and confidence-qualified; (b) *"From our category reference notes
> for this category:"* — the founder's §8 flag language verbatim, code-owned, plainly OUR table and
> not a finding about the client's product. Fixed boundary line above, fixed "requirements change
> frequently" footer below.
> **GAP CLOSED IN THE SAME PASS (ruled):** `findCategoryLanguageViolations` JOINS THE DELIVERY
> COMPOSITION. It runs at GENERATION ONLY today, while `brand_category_note` and the `category`
> strings are LLM-written — **nothing LLM-written may reach a client scanned only at generation.**
> **AND it folds into the MERGED census, so the real block rate stays ONE number** (the census now
> composes exactly what publish composes; a third scanner outside it would re-create the very defect
> the merge just fixed).
> GATE COVERAGE VERIFIED 2026-08-18: all 12 proposed strings — including 034's three `flag_language`
> strings verbatim and its `brand_category_note` — pass `scanHard`, `scanAssertion`,
> `findCategoryLanguageViolations` AND `scanForMethodLeakage`. Zero violations across all four.
>
> **⚠ AN INCOMPLETE ATTEMPT SUPPRESSES THE CENSUS — recorded 2026-08-18, and it changes what the
> completeness precondition is FOR.** The stub cleanup was not tidiness: **it changed a measurement.**
> While AWI-2607-021/022/032 had replay-stub latest attempts, the census scanned near-empty records
> and reported them clean on the language gate. Soft-deleting the stubs restored the good attempts and
> a SECOND residual class immediately surfaced — **"bare legitimacy verdict" on all three** — which had
> been there all along and was invisible. **The same emptiness that made a stub MORE publishable also
> made the corpus LOOK SAFER than it was: both instruments read empty as clean.** So `checkDeliverable`
> earns its place twice — it stops a blank report reaching a client, AND it stops incomplete attempts
> silently deflating the launch-risk number. Any future census run should be read together with the
> incomplete-attempt sweep; a falling number with rising stubs is a false comfort, not progress.
>
> **RULED 2026-08-18 — THREE CLASSES, ONE PASS. Do NOT close them one at a time across three sessions.**
> The engine-prose treatment that retired confirms-authorization is extended, in a single pass, to:
> (1) **confirms-authorization** — done, `cd68cfd`; (2) **the derivation/method class** — a Call C
> METHOD-VOCABULARY rule (corroboration vocabulary, gate names, source-count thresholds, firewall
> vocabulary), which is **what durably unblocks AWI-2608-034**, today fixable only by a re-run that may
> reproduce it; (3) **bare legitimacy verdict** — same treatment, currently on 3 cases. All three land
> with the self-correcting loop build; each bumps `prompt_version`, each gets two-sided fixtures, and
> the merged census is the single acceptance number for all three.
>
> **🟢 FIRST REAL REPORT DELIVERED END TO END — 2026-08-17.** **AWI-2608-033 (Growth) IS PUBLISHED.**
> Submit → research → review → publish → email, the whole path, on a live case. **GROWTH WORKS.**
> AWI-2608-034 (Scale) STAYS HELD — blocked by the derivation-rule scanner on `"corroborated"` in
> M9 `leading_interpretation`. Scale remains unproven end to end: one case, blocked.
>
> **⚠ THE FINDING THAT REPRICES THE WEEK — RULED FIRST PRIORITY.** `gate-census.ts` measures ONE of
> the publish path's TWO scanners. **Every number ruled on all week — 31%, 23%, gate ruling (b), the
> prose-pass acceptance — measured banned-language ONLY.** The derivation-rule scanner
> (`scanSynthesisAtDelivery`) had never been run across the corpus. The launch risk was never 23%; it
> was 23% plus an unknown. **This is the SAME DEFECT CLASS as the attempt skew: two instruments that
> should agree on one path, not pinned to the same thing.** Partial measurement taken 2026-08-17
> (language 8 · method 1 · either 9) but that is a scratchpad probe, not the instrument.
> **RULED: (1) MERGE THE SCANNERS INTO ONE CENSUS — one instrument, one number, all 39 cases, not two
> reports. (2) GIVE THE DERIVATION-RULE SCANNER A LOCATOR** — a block must name its sentence, its
> field and the rule it hit, exactly as Piece 1 does for banned language. 034 today gives a label and
> nothing else. **This decides whether Scale can publish at all.**
>
> **PDF LANE — RULED 2026-08-17. Generate at publish, store, serve a signed URL** (option 3; items 2
> and 3 are ONE piece of work). The report is frozen at delivery so per-request rendering is pure
> waste; it keeps Chromium out of a serverless request entirely; and a failed render becomes a
> retriable job against an immutable record instead of something that can block or slow a publish.
> Generation hangs off the delivery choke point, AFTER `checkDeliverable`, as a background job.
> Signed-URL TTL: **minutes, re-issued per click** — a leaked long-lived URL is an unauthenticated
> report naming suppliers and verdicts. Ownership + delivered-state check on the download route,
> copying the `lib/data/cases.ts` model. **⛔ VERIFY THE `reports` BUCKET IS PRIVATE BEFORE ANYTHING
> IS WRITTEN TO IT — if it is public, STOP and tell the founder: that is a P0.** `review_additions`
> must render in the PDF. The deferred count-derivation debt returns with this lane.
> Noted: the `reports` bucket ALREADY EXISTS and the client-deletion path already cleans it up
> (`app/api/admin/clients/[id]/route.ts:99`) for a bucket **nothing writes to** — someone designed
> this and stopped, so deletion is already correct for the design about to be built.
> **CLIENT NAME FROM STRIPE — RULED, BUILD NOW, INDEPENDENT (~1h).** `s.customer_details?.name` is
> discarded at `app/api/webhooks/stripe/route.ts:132` while the email beside it is kept.
> `clients.full_name` is written in exactly ONE place (`app/api/onboarding/complete/route.ts:23`), so
> a client who skips onboarding has no name though Stripe collected it. Capture ABOVE the three-way
> branch (topup / subscription / one-time) or two of three paths miss it. **SET-IF-NULL ONLY — never
> overwrite a name entered in onboarding: Stripe's is a billing name, theirs is what they want to be
> called.** Same for `company_name` where Stripe collects it.
>
> **CARRIED FORWARD, RULED:** (a) **ONE-TEST LOCK** — no future path may set `delivered` or send the
> delivery email without passing `checkDeliverable`; the residual is named, now make it a test, in the
> loop build. (b) **`STRIPE_PRICE_SINGLE_149`** — Claude must state exactly what to check in Vercel;
> the founder confirms. (c) **NOTHING PUSHES** — 3 cases sit in `research_failed` and the founder would
> only know by looking. Once the loop lands, propose what should alert and how. **v2 dependency for
> removing the operator; on the board now.**
>
> **⛔ STANDING RULE, EARNED THREE TIMES — `.env.local` IS NOT PRODUCTION.** Claude asserted
> production env state from the local file three separate times this week (`SUPPORT_INBOX`, then
> email, then `STRIPE_PRICE_SINGLE_149`). **Emails work and have for days:** `RESEND_API_KEY`,
> `RESEND_FROM`, `SUPPORT_INBOX` are ALL SET IN VERCEL; delivery and submission emails both arrive.
> **Local env proves NOTHING. If env state matters, say it cannot be verified locally and ask.**
>
> **SEQUENCE (founder-set 2026-08-17):** 1 tracker ✓ · 2 merged census + derivation locator ·
> 3 client name from Stripe · 4 `replay-attempt.ts` preflight · 5 self-correcting loop, then operator
> attachments · 6 PDF lane (AFTER the audit reports on the bucket's RLS, which may change the auth
> shape). The audit runs in its own fresh session per `docs/AUDIT_BRIEF_2026-08-17.md`.
>
> **DELIVERY PATH — STATE OF TRUTH 2026-08-17 (end of session; verified, not carried)** `7cdab2c` —
> **THE PUBLISH PATH WORKS AND HAS BEEN EXERCISED END TO END.** AWI-2608-033 (Growth) is
> **PUBLISHABLE — verified by running the route's own two preconditions read-only**: deliverability PASS
> (attempt 2, 6 tracks, 3 scored, synthesis at attempt 2 stamped `p001-1.0.0`), language gate PASS.
> **AWI-2608-034 (Scale) is BLOCKED** on ONE word — `"corroborated"` in `decision_snapshot.leading_interpretation`,
> caught by `scanSynthesisAtDelivery`, NOT by the banned-language gate.
> ⚠ **THE CENSUS MEASURES HALF THE PUBLISH GATE.** `scripts/gate-census.ts` runs only
> `scanFindingsForBannedLanguage`; the publish path ALSO runs `scanSynthesisAtDelivery` (derivation-rule
> scanner: gate names, thresholds, corroboration counts, validation vocabulary). Every launch-risk number
> reported before today measured one of two gates. **MEASURED NOW across all 39: language 8, method 1,
> EITHER 9 — the method scanner is NOT systemic, it is exactly 034.** (35 of 39 have synthesis at their
> latest attempt; the other 4 would now be stopped by the deliverability precondition, correctly.)
> The method scanner has NO locator — a block names a label, not a sentence, the same dead end Piece 1
> fixed for language. 034 needs either a Call C method-vocabulary fix or a re-run; the prose pass did not
> touch corroboration vocabulary, so a re-run may reproduce it.
> ✓ **FOUNDER-CONFIRMED, RECORDED SO IT CANNOT GO STALE:** both migrations (`gate_events`,
> `cases.review_additions`) APPLIED + verified. Five stub attempts SOFT-DELETED (reversible via
> `deleted_at = NULL`); all five cases show 6 rows in their latest attempt again; seed pin moved back to
> `delivered_attempt = 1`; 023 stays pinned at 2. **NULL-PIN SWEEP CLEAN — zero delivered cases have a
> null `delivered_attempt`, so the `?? latest` fallback has NEVER fired for any client. Exposure closed.**
> ✓ **EMAILS WORK AND HAVE FOR DAYS** — delivery + submission confirmation both received in production.
> `RESEND_API_KEY`, `RESEND_FROM`, `SUPPORT_INBOX` are ALL SET IN VERCEL. **CLAUDE ERROR, TWICE: read
> `.env.local` and asserted about production. LOCAL ENV PROVES NOTHING — CHECK STAGING.** "No email" is
> NOT a blocker and never was; strike it from every list.
> ⚠ **P0 FOUND AND CLOSED THE SAME DAY:** the delivery email fired for an EMPTY report (seed case, one
> track row, no synthesis) because the language gate passed it — there was nothing in it to scan. The
> deliverability precondition now sits ABOVE both the status write and the email, and there is exactly
> ONE production path that sets `delivered` and ONE caller of `sendDeliveryNotification`, both in the
> review route. **RESIDUAL, UNGUARDED: nothing structurally stops a FUTURE second delivery path (cron,
> Inngest, backfill) from bypassing the precondition. One lock test — belongs in the loop build.**
> REPLAY POST-MORTEM: all five replays died because those June/July Growth attempts store only 2 packs
> (`supplier_identity`, `supply_chain_relationship`); the replay hits Track 3, finds no pack, dies. They
> can NEVER be replayed — only `rerun-batch --run` (live). Claude built that run sheet from a preflight
> that printed the pack counts and did not read its own output.
> PROSE-PASS PROOF IS SUFFICIENT AT TWO (ruled): 021 controlled replay (frozen evidence, identical
> signals + verdict) and 033 live re-collection (fresh evidence, identical signals) — opposite directions,
> both clean. 022/032 would re-confirm the same property by the same method; spend it on the $149 path.
> NEXT SESSION ORDER (founder-set): tracker ✓ → method-scanner census ✓ → `replay-attempt.ts` preflight →
> self-correcting loop + operator attachments → **full end-to-end audit LAST, in a fresh context window,
> fanned out per path stage** (token budget ≠ context window; a from-memory audit is the one thing ruled
> out). 1389/1389 · tsc 0 · eslint 0.
>
> **AUDIT 2026-08-18 — END-TO-END, READ-ONLY.** Full findings: `docs/AUDIT_FINDINGS_2026-08-18.md`
> (2 P0 · 15 P1 · P2 · CLEAN, every line carrying its verification method). Landed this pass: the
> **second half of the 2026-08-17 attempt-skew fix** — the publish ROUTE was pinned that day, the
> operator's REVIEW SCREEN was not (`review/page.tsx:61` read "the latest synthesis row that EXISTS").
> Swept the whole class: that was the ONLY live unpinned read; every other call site pins, and the one
> other candidate (`isCaseReadyForReport`) has zero callers. 1398/1398 · tsc 0 · eslint 0.
> ⚠ **GO-LIVE CHECKLIST ITEM — THE PAYMENT PATH HAS NEVER RUN IN LIVE MODE.** All 37 rows in
> `stripe_events` are `livemode: false`, including both "subscriptions". MRR is derived from
> `clients.plan_type`, never from a settled payment; `billing_audit` holds **0** `new_subscription` rows.
> Before go-live: confirm the live webhook endpoint + signing secret, then re-verify that a real
> `checkout.session.completed` provisions credits — because two credit paths are currently dead behind
> a hidden Stripe field move (`current_period_end` now lives on `items.data[0]`; the `as unknown as`
> cast at `webhooks/stripe/route.ts:155,204` hides it, so `renewal_date` is NULL on 5/5 clients and
> **every Growth→Scale upgrade grants zero credits**). Not fixed this pass, by ruling.
> ⚠ **SECURITY, FOUNDER-RUN:** six credit RPCs hold `EXECUTE` for `anon`/`authenticated`/`PUBLIC`.
> All six are called ONLY through service-role clients (verified: both `createServerClient` and
> `supabaseAdmin` use `SUPABASE_SERVICE_ROLE_KEY`), so the REVOKE is safe. SQL in the audit report.
>
> **RULINGS 2026-08-17 (publish path) — SELF-CORRECTING LOOP + REVIEW ADDITIONS** `7c06703` — **Piece 2
> (operator prose editing) CANCELLED, not deferred** (the operator phases out in v2; a hand-editing habit
> would have to be unlearned, and it hides the engine producing bad language instead of stopping it).
> `case_prose_overrides` stays in production **unwired, 0 rows, nothing reads it** — reverting a live
> migration is more risk than an unused table. Piece 1 (the publish-block locator, `385088b`) STANDS.
> **PART A APPROVED** incl. the `pipeline.steps.ts` freeze amendment at TWO call sites, with a stop rule:
> if that diff exceeds two call lines plus imports, stop and report; `rejudge-case.ts` must still PASS as
> acceptance. **⚠ THE FIVE RULED INVARIANTS WERE INSUFFICIENT AND THE FOUNDER RULED A SIXTH IN:** the
> founder's own drift example ("No positive confirmation of authorization exists" → "Authorization was not
> fully documented") passes citations, entities, numbers, length AND negation-count (1 on both sides —
> "No" became "not"). All five guard DELETION; softening is SUBSTITUTION. The sixth — LOCALIZED EDIT, a
> word-level diff refusing any change that is not within 6 words of a place the gate actually matched — is
> now **LAW, not an option**: the escape hatch is `TEST_ONLY_disableLocalizedEdit` and
> `proseRepair.freeze.test.ts` fails the build if any production file consumes it (precedent:
> `TEST_ONLY_GAP_THRESHOLDS`). The five-pass-it case stays as an executable test by ruling.
> Also ruled: `REPAIR_PROMPT_VERSION` separate from `IOS.prompt_version` (so a drop in hits cannot mean
> "the repair got better at hiding it"); the self-scan surface may NEVER be narrower than the delivery
> gate's, with a test; **`gate_events` threshold = 3 hits on one label under the current prompt_version →
> fix the prompt at source**, threshold living in the census report not a DB constraint; **ONE STORE for
> Part B — `cases.review_additions` SUPERSEDES the proposed `case_reference_links`**, gated at save AND on
> the publish path, rendered "Added by our review team", carried into the PDF lane's spec; **review
> additions SURVIVE a re-run** (operator knowledge, not engine output; per-case, not per-attempt).
> TWO MIGRATIONS WRITTEN, FOUNDER-RUN, NOT APPLIED: `20260818000000_gate_events.sql`,
> `20260818000100_cases_review_additions.sql`. Plan:
> `docs/superpowers/plans/2026-08-17-self-correcting-prose-and-review-additions.md`.
> ✓ **HANDOVER CORRECTION:** `20260812000000` IS APPLIED — `adjust_client_credits(text,int)` exists,
> EXECUTE granted to anon/authenticated/service_role, and a PostgREST probe (nonexistent client, delta 0,
> zero rows touched) returned cleanly. **Admin credit adjustments are NOT 503-ing; close the item.**
> Supabase `list_migrations` returns EMPTY here (migrations applied by hand) — it proves nothing, the
> schema must be inspected directly. Swept the rest: everything else recorded as applied IS applied.
> ⚠ GO-LIVE CHECKLIST ITEM: `PRICES` in `lib/ai/providers/anthropic.ts` has ONE row (`claude-sonnet-4-6`);
> the ruled synthesis flip to `claude-opus-4-8` makes every cost figure report $0. The row moves WITH the
> flip. ⚠ V2 DEPENDENCY LOGGED: removing the operator needs an answer for the ASSERTION tier, not just
> HARD — 23 of 39 cases carry an A-tier advisory today. 1384/1384 · tsc 0 · eslint 0.
>
> **✓ ENGINE-PROSE PASS BUILT 2026-08-17 (founder-ruled — the §3.1 blocker)** `cd68cfd` — the `confirms→supports`
> vocabulary rule landed in the four scoped prompts: Track 2 `brand_relationship_finding`, Track 3
> `brand_risk_finding`, Track 4 `documentation_finding`, synthesis Call C (M9/M8). ONE rule, carried
> identically in all four: confirm/confirms/confirmed/confirming/confirmation/certify/certified may never
> stand next to authorization/approval/authenticity, in ANY shell — own voice, named-artifact subject,
> passive, ATTRIBUTIVE noun phrase ("without confirmed authorization"), and questions — with the substitutes
> supplied (SUPPORTS/INDICATES/ESTABLISHES/SHOWS; VERIFIED/DOCUMENTED/ON RECORD) and stated as **a WORD rule,
> not a strength rule** (the positives-first law survives, re-worded "VERIFIED POSITIVES FIRST" in all three
> tracks). **THE GATE IS NOT TOUCHED** — no ruling consumed. `prompt_version` 0.0.0→`p001-1.0.0` and
> `ios_version`→`HyprrIQ IOS v0.2-prose` in the SAME edit: ios_version is the memoization key
> (`getSynthesisByEvidenceHash`), so synthesis written under the old prompts can never be reused under the
> new ones; `synthesis_version` deliberately untouched (S-2 forward pins stay valid).
> **NEW ACCEPTANCE LOCK** `lib/research/prosePass.test.ts` (24 tests): the rule is present in all four prompts
> with every census shell named (a later edit cannot quietly narrow it back to "our voice only"), and it is
> **two-sided on the census's OWN sentences** — 4 real blocking sentences still block, their 4 rule-compliant
> rewrites clear the unchanged `scanHard`.
> **CENSUS UNCHANGED AT 9/39 BY CONSTRUCTION** (re-run post-change, verified): it scans STORED output, so the
> number only moves when a case is re-run under the new prompts. NEXT (founder-run): re-run AWI-2608-033
> (`15fc3396-68b9-4984-8d18-4b5224b8cf93`) and re-census — that is the acceptance proof and it unblocks the
> held case. AWI-2608-034 (`8a30c432-…`) already scans clean and needs no re-run.
> ⚠ **UNRULED GATE HOLE FOUND — REPORTED, NOT FIXED** (verified by probe): H12's verb rule only matches when
> the object follows the verb immediately (articles allowed). An intervening word slips past HARD **and**
> past the A6 advisory — "the Playbook **confirms current authorization**" and "the page **confirms Lenovo
> authorization**" both scan CLEAN today. This pass makes it moot for the four prompts' prose; it stays live
> for every other surface (Tracks 1/5, category, code-templated strings, operator text). Gate edits need a
> founder ruling — flagged, untouched. 1351/1351 · tsc 0 · eslint 0.
>
> **GATE RULING (b) BUILT 2026-08-16** `8997d6d` — evidence-attributed passive (via/by/through) demoted to A6 advisory, bare passive stays HARD, two-sided fixtures. CENSUS STILL 9/39 (23%): residual = two shells outside the ruled scope — named-artifact subjects ('the Playbook confirms authorization') and scope-attached passives ('confirmed for US, UK'). RECOMMENDED: stop grammar-chasing; run the confirms→supports engine-prose pass (founder-run, scoped) — it retires the whole class. 1327/1327 gates green.
>
> **GATE RULING BUILT 2026-08-16** `5541857` — #1 sentence-scope bug fixed, #3 verdict negation/attribution guards, #4 ungating service-split, #2 evidence-subject demoted to advisory (A6). Two-sided fixtures (7 corpus PASS / 8 constructed BLOCK). ACCEPTANCE CENSUS: 31% -> 23%; entire residual = the ruled-HARD passive ('Authorization is confirmed...') — passive-with-evidence-attribution extension or engine-prose fix pends founder ruling. 1325/1325 gates green.
>
> **✓ SUBMIT COPY FIXES LANDED 2026-08-15** ``538c0ec`` — interpolation seams -> template literals; brand cap stated once (counter kept); credits sub now "plan adds N at renewal" never echoing balance; ASIN gating confirmed ($149+Scale on KEEPA flip, test-locked). Track 6 explainer delivered in-chat. 1306/1306 · gates green.
>
> **✓ AREA-CLAIMS RULING FULLY LANDED 2026-08-14** `126d440` — help-page full-depth claim
> replaced (plan-neutral truth, "Research Dimensions" heading retired); $99 loses the
> document-review bullet (planAcceptsUploads); report header/print-head count-derived from the
> case's own findings; how-to-read superseded to plan-includes wording; PDF strings plan-neutral
> (count-derivation REPORTED as not possible in the paused renderer — lands with the PDF lane);
> "research dimensions" → "assessment areas" across all public copy, five-area marketing framing
> kept as ruled. 1306/1306 · tsc 0 · eslint 0 · build clean · frozen engine untouched.
>
> **✓ CLAIMS FIX LANDED 2026-08-14** `1d1ba42` — onboarding research bullet plan-derived from
> the track registry ($99 = 3 named areas; others = all five). ⚠ SWEEP FINDS, REPORTED NOT
> FIXED (pending ruling): help page "All five run at full depth on every plan" (flat false on
> $99, worst); onboarding "Document review when you upload paperwork" bullet on $99 (no-uploads
> tier); report-view "five assessment areas" header/how-to-read/print-head on $99 reports;
> marketing FAQ Decision-Snapshot answer "across five research dimensions"; PDF structural copy
> (reportDocument.ts) five-area lines on a $99 case; auth pill "Five assessment areas" (generic
> marketing, borderline). 1304/1304 · gates green.
>
> **✓ HUMANISE PASS LANDED 2026-08-14** `2c2a866` — jargon sweep clean (0 hits); density fixes:
> "Ready to read" (download stub honesty), document-review bullet de-teched, creditExplainer
> plain. ⚠ FLAGGED: "Full 5-dimension research" onboarding bullet renders on the 3-dimension
> $99 tier — claims fix pends ruling. §1 (client source links) + §3 (engine prose tone)
> REPORTED in-chat, nothing built. 1302/1302 · tsc 0 · eslint 0 · build clean.
>
> **✓ EMPTY-TAB GUARDS + RATIFIED READABILITY LANDED 2026-08-14** `5420fe3` — stub-headline
> guard (<20 chars = absent, structural); conditional Checklist/Could-not-confirm tabs (content
> or nothing, print inherits); ratified segmentation live (label-marker fusion + guarded
> sentence splits, under-split-only failure mode); bank-coordinate filter live (Documentation-
> scoped, shared by portal + admin client view). Unknowns-fill NOT built (ruled).
> **BACKLOG (recorded by ruling):** (a) confirm whether the delivery-time banned-language gate
> walks the `unknowns` column — any future decision to surface unknowns client-side depends on
> it; (b) imperative-phrasing contingency rule for M8 (admit ask-verb imperatives, reject
> `^[a-z_]+:` internals) — ready if a non-interrogative M8 entry ever appears; no stored case
> needs it. 1277/1277 · tsc 0 · eslint 0 · build clean · frozen diff empty.
>
> **✓ READABILITY 2+3 LANDED 2026-08-13** `eabd9e3` — finding-section headings now real anchors
> (settled scale, engine casing verbatim); admin client-text renders via the shared FindingBody;
> admin client view PINNED to the delivered attempt (rows + snapshot through the client path's
> own readers). ⚠ PENDING FOUNDER RULING: §1 sentence-segmentation rule (labels with (N)
> prefixes + guarded sentence splits) and §4 invoice-transcription rule (bank-coordinate
> sentence filter now; transcription style is a Track-4 prompt matter) — both reported in-chat,
> nothing built. 1269/1269 · tsc 0 · eslint 0 · build clean · frozen diff empty.
>
> **✓ ADMIN REVIEW SCREEN REBUILT 2026-08-13** `85833bb` — findings-first per the ruling:
> per-area client text (polished, labeled) over evidence (category/points/3-value certainty/
> source links) with analyst context demoted; contradictions in full anatomy; identity always;
> direction line (veto/floor or margin) instead of arithmetic; client view = the REAL ReportView
> over the same pure projection (extraction test-locked, projection behavior unchanged);
> escalation banner names the pipeline reason; last-decision surfaced (internal_notes OVERWRITES
> — append-ledger pends a founder call); SLA at the decide point. CUT: why-not list, confidence
> paragraph, coverage tiles, missing-evidence lists, hypotheses/doubt panels. Engine Trace stays
> as the provenance disclosure. 1269/1269 · tsc 0 · eslint 0 · build clean · lib/research untouched.
>
> **✓ PROSE-CLEANUP RULING BUILT 2026-08-13** `888cb5e` — Rules 1+2 ratified and live at the
> client projection: source-disposal sentences dropped (subject-source + disposal-verb shape
> only; method narration survives, test-locked), internal dimension names substituted never
> deleted (Track 0–6 + snake_case keys → the five client area names, article-aware). Rule 3
> left alone as ruled. Admin raw text intact (consumer list client-only); lossless parser
> invariant re-verified. 1261/1261 · tsc 0 · eslint 0 · build clean · frozen diff empty.
>
> **✓ REPORT POLISH LANDED 2026-08-13** `e361ac9` — src_N strip CLIENT-SIDE ONLY (ruled): deep
> strip in getCaseFindings over everything crossing the RSC boundary; admin keeps every tag
> (consumer list grep-verified client-only). Finding readability: parseFindingStructure renders
> the engine's own labels/numbering as headed blocks + lists, lossless, prose-unchanged fallback.
> Housekeeping-prose investigation REPORTED (no filter built): 3 classes — true source-disposal
> log (1/25 rows), internal Track-N vocabulary in real findings (3/25 — needs substitution, not
> deletion), method-discipline narration (2/25) — proposed rules await founder ruling.
> 1250/1250 exit 0 · tsc 0 · eslint 0 · build clean · frozen diff empty.
>
> **✓ CLIENT PORTAL FULL BUILD — CORE LANDED 2026-08-13** `1601bdc`+`9fd9579`+`9337495` —
> THE REPORT: Decision Snapshot wired to clients (headline/real-risk/interpretation/monitor +
> M8 questions, structural ?-filter, src_N/E-id strip, delivery-gate-covered, allowlist intact);
> report-view per approved prototype (decision never tabbed, 4-level scale w/ position, honest
> split, print-flat); case page split delivered→report / active→tracker (scope flow stays dead).
> SUBMIT: 4-step logic-preserving restructure (cap-2 now legible — supersedes silent-guardrail).
> Guides shell, settings invoice-promise reword, 60+ claim removed. 59 new strings in MUST_PASS.
> NOT built (reported): invoices route (needs Stripe read), client name-edit, dashboard rail
> quick-actions/plan cards, reports-list search, separate FAQ route (help carries ruled copy).
> 1239/1239 exit 0 · tsc 0 · eslint 0 · build clean · frozen engine untouched.
>
> **✓ SLA COPY RULING LANDED 2026-08-12** `470c184` — client promise = 24h, matching
> CASE_SLA_HOURS; PLAN_SLA_DAYS retired (absence locked); every delivery statement derives from
> the one constant (submit estimate, onboarding ×2, pricing bullets + comparison row, FAQ,
> marketing page ×3, how-it-works); Scale priority framing removed everywhere; all new strings in
> MUST_PASS. Debug sweep fixed the 24h-broken day math: portal SLA Risk (was every-active-case),
> case table, deadline chips, admin queue — all hour-granularity now.
> ⚠ UNRULED for founder: `SLA_RISK_WINDOW_HOURS = 6` (the "at risk" window — my constant).
> 1165/1165 exit 0 · tsc 0 · eslint 0 · build clean.
>
> **✓ THREE-ITEM BATCH LANDED 2026-08-12** — 1153/1153 unpiped exit 0 · tsc 0 · eslint 0 · build clean:
> **(1) SLA ruled 24h** `d3a6f88` — `CASE_SLA_HOURS=24`, `sla_deadline` stamped at submission on
> BOTH intake paths; all displays fill automatically; `DELIVERY_SLA_HOURS` retired; ruling locked
> in `sla.lock.test.ts`. PLAN_SLA_DAYS + client copy untouched (separate ruling).
> **(2) Settings placeholder** `6a6fb3c` — now states the truth, names no invented settings.
> **(3) Credit/usage semantics RULED + LOCKED** `3e284a1` — four cases stated as LAW in
> SAAS_ARCHITECTURE §I + ADMIN_FOUNDATIONS §5 (refund formula's basis, never re-derived from
> code). Adjust route → `adjust_client_credits` (balance-only), fails closed 503 until the
> ⛔ **FOUNDER-RUN migration `20260812000000_credit_semantics_adjust_rpc.sql`** is applied
> (NOT applied, not via MCP — describe-and-stop honored). Live audit_log check: zero past admin
> adjustments → no inflated-usage rows exist, no corrective SQL needed.
>
> **✓ ADMIN DEV CLOSE-OUT LANDED 2026-08-11 (founder-ordered, 9 items)** — 1150/1150 unpiped
> exit 0 · tsc 0 · eslint 0 errors · build clean · frozen diff empty (16 files, all admin/data/auth):
> **(1+2) Run-a-case** `b290a88` — single_149 in the tier dropdown; document upload on the
> operator path (multipart route, same fileSniff rules as client submit, house-prefix storage,
> uploads BEFORE enqueue — Documentation Review no longer silently starves on operator cases).
> **(3) House row out of the money** `d194035` — MRR corrected $1,277 → **$778 (live-verified
> vs founder figure)**; excluded from revenue summary, plan/billing-status counts, Active
> Clients, and the client list via `neq(OPERATOR_HOUSE_CLIENT_ID)`; case attribution untouched.
> **(4) last_active_at** `d194035` — now written on every client-authenticated portal load
> (15-min throttle, non-fatal); Active Clients ordering is truthful.
> **(5) Users screen** `a33c08e` — invitations wired (invite-by-email, pending/claimed/expired/
> revoked, revoke, share-link fallback), super-admin client assignment per staff row, plain-
> English capability labels everywhere. Containment rules untouched.
> **(6) Credit adjust** `277ed02` — over-deduction now 409s loudly, no audit row for a no-op.
> FINDING: negative admin adjustments count as client usage (deduct RPC), positive ones don't
> reverse it — asymmetry pends a founder ruling (RPC change = migration).
> **(7) Page gates** `7d8ee63` — view_cases on /admin/cases + review + support; view_billing on
> /admin/revenue; Publish/Override need review_publish, Investigate needs rerun — no
> visible-but-refusing buttons remain.
> **(8) SLA — NOT BUILT** (no founder confirmation of 24h on record): nothing changed; removal
> impact reported in-chat. **(9)** Billing-discoverability + settings reports delivered in-chat.
>
> **✓ GAP-CLOSE BATCH LANDED 2026-08-10 (founder-ordered, four items)** — 1146/1146 unpiped
> exit 0 · tsc 0 · eslint 0 errors · build clean · frozen engine untouched:
> **(1) Submission confirmation email** `1c2cac2` — the SECOND of the two ruled transactional
> emails (corrects the 08-08 delivery-only ruling record). Gated notify helper; LOCKED content
> machine-checked in tests (no verdict/finding/risk/guarantee language, no delivery-time
> promise); sent only after successful enqueue; idempotent via a per-case audit-row check; a
> failed send records `skipped:*`, never "sent". Delivery-email misroute also closed: operator
> house-row cases skip as `skipped:operator_house` (the `operator@hyprriq.internal` placeholder
> is never mailed).
> **(2) Checkout state guard** `4f0b43a` — pulled forward from CAN-FOLLOW: `/api/checkout/session`
> fails closed pre-Stripe (pure `checkoutStateError`, 10 TDD cases). Live subscriber → 409 on any
> plan purchase (second-subscription + plan_type-clobber traps closed); cancelled subscriber
> keeps reactivation; top-ups now require a live subscription server-side.
> **(3) Tier NAME RE-RULED** `2ca75c1` — `single_149` = **"Single Deep Report"** (matches the
> Stripe product; supersedes 08-08 "Complete Report"). All display sites reconciled.
> **(4)** Both email templates reported verbatim to the founder in-chat, content rules confirmed.
>
> **✓ PRE-DESIGN BATCH CLOSED 2026-08-10 — all six blocks-design items LANDED** (1125/1125
> unpiped exit 0 · tsc 0 · eslint 0 errors · build clean · ZERO frozen-engine files touched):
> husks excised `ffc77c4` · change-request entry `dab6515` · delivery email `f41d880` (gated
> soft — sends nothing until Resend env exists) · billing rebuy + plan card `ae88441` ·
> Growth→Scale path `63ca32f` · marketing reconciled + dead links removed `43b789e`.
> **The design lane is CLEAR.** Ledger keeps: Resend account + `RESEND_API_KEY`/`RESEND_FROM`/
> `SUPPORT_INBOX` env (F) · the 3 remaining transactional emails (submission-confirm,
> payment-failed, cancel-confirm) · Stripe portal plan-switch VERIFY (F — the new Change Plan
> card depends on it) · live Stripe Scale product description still carries Keepa language
> (F, describe-and-stop) · legal pages (1.6) · sample-report page (1.8).
>
> **⚡ PRE-DESIGN BATCH OPENED (founder-ruled 2026-08-08)** — the founder chose the recommended
> ~1-day pre-design dev batch over opening the design lane directly. Scope = the six
> BLOCKS-DESIGN items from the 2026-08-07 gap audit (preserved in full in
> `HANDOVER_DEV_COMPLETE.md` §5): change-request entry point · delivery email · billing rebuy
> hardcode · Growth→Scale dead-end · dead client-facing husks · marketing-vs-ladder copy.
> Plan: `docs/superpowers/plans/2026-08-07-pre-design-batch.md`. **Rulings taken this sitting:**
> (1) **Emails: delivery notification ONLY this batch** — submission-confirm, payment-failed,
> cancel-confirm stay on the ledger; Resend account + `RESEND_API_KEY`/`RESEND_FROM` env remain
> the founder's setup step (code ships gated, degrades soft). (2) **`single_149` display name
> RULED: "Complete Report"** — the placeholder is promoted; §6.4's UNRULED marker is closed.
> (3) **Dead links REMOVED** (footer About/Terms/Privacy, `/sample-report.pdf`) — they return
> when the legal-pages ruling (1.6) lands; nothing fake ships meanwhile.

## 1. LAUNCH-BLOCKING — nothing ships without these

| # | Item | Status | Owner | Notes |
|---|---|---|---|---|
| 1.1 | **Client report — on-screen + PDF** | ✅ | UX→FA | ~~Placeholder only today~~ **DONE (verified live 2026-08-20):** five real PDFs rendered → stored → downloaded via signed URLs; on-screen report is the same projection. See §0-A. |
| 1.2 | **Client-projection layer** | ✅ | FA | **DONE `cf033f5` (2026-08-19).** One projection function, corpus-measured 34/35 → 6/35 cases carrying an internal token, backed by the presence checkpoint + a render-path lock test. ⚠ Note the original spec wording ("present in 021's narrative, absent in 022's") was itself a TWO-CASE read — the corpus then showed four leak classes and five grammar shapes. The row is closed; the lesson is the standing rule. |
| 1.3 | **ASIN intake field + one-brand cap** | ✅ | FA | **BUILT 2026-07-30 (dev batch) + MIGRATION APPLIED 2026-07-30.** Code guard `lib/portal/asinIntake.ts` (1 ASIN/brand, ≤ plan cap, format, Scale-only; caps from `PLAN_BRAND_CAPS`, never the NULL DB column) + form (Scale-only progressive disclosure, "the ASIN you're actually planning to buy" copy, graceful at-cap line) + threading via `lib/research/intakeExtras.ts` (contracts.ts FROZEN — additive intersection type). `cases.brand_asins jsonb` live (read-back verified: column present, 0 populated rows). **Executed via Supabase MCP on EXPLICIT one-time founder authorization (chat, 2026-07-30) — the founder-runs-prod law STANDS; this is not a precedent.** **ASIN-optional RULED (founder, 2026-07-30): optional as built; revisit when Keepa ships** (the `asinIntake.ts` header comment still says UNRULED — one-line cleanup rides the next code-touching pass). Keepa is unblocked. |
| 1.4 | **Mobile layout** | ✅ | UX→FA | ~~Portal does not load on mobile. Broken surface.~~ **STALE — cleared 2026-08-20 (§0-A):** `shell-chrome.tsx` carries a real drawer (`lg:static` sidebar, slide-in below); no overflow at 375px. **LAYOUT PHASE DONE 2026-08-04:** diagnosis = fixed 248px sidebar w/ no breakpoint + CaseTable fixed-column grid (~610px min) + px-7 paddings; 3 nav-direction mockups in `mockups/mobile-1.4/` (A tab bar / B drawer / C hub-and-spoke; shared card system replaces the table on mobile) — AWAITING FOUNDER RULING on direction before build. Critique note carried to build: `text-muted` fails AA (3.1–3.6:1) at 12–13px on desktop too — global fix candidate, founder to rule scope. **2026-08-05 (FABLE_BRIEF re-scope):** full client-portal PROTOTYPE delivered in `public/prototype/` (moved from `prototype/` for staging URL access) (11 pages, new locked skin, report MOCKED in 3 directions on 022 content, mobile throughout, drawer as interim nav) — production gates waived per brief's authorized deviations; awaiting founder rulings on report direction + mobile nav + two locked-skin AA flags (verdict-pill inks 3.2–3.3:1, `--muted` 3.8–4.1:1). **2026-08-05 later:** report RULED C→C+ (built as `public/prototype/client/report.html`; a/b/c archived) + cool re-skin RULED (TOKENS_CORRECTED_cool applied to tokens.css + DESIGN_SYSTEM_reference, AA flags resolved; two tint-bgs micro-lightened to honor the spec's AA intent — noted in tokens.css). **2026-08-06: mobile nav RULED — DRAWER** (founder; confirmed by the 10-item nav-count critique — tab-bar would force nesting Completed reports/Invoices). **2026-08-06 FINAL PASS (portal LOCKED):** sticky depth tabs w/ all four visible on mobile (2x2 grid, honesty tab marked) · 16px mobile body floor (assets/mobile-type.css, family unchanged) · [hidden] display fix (mobile filter chips now actually filter — root cause of "chips don't work" report) · spacing sweep (invoices num/desc, card sub-lines) · submit = three card-steps + Marketplace selector mirroring the REAL intake field (lib/content/submit.ts MARKETPLACES; CaseIntake.marketplace) · asset links cache-busted ?v=3. **BACKEND FINDING (read-only, engine untouched):** the engine stores marketplace but does NOT vary research by it — no query interpolates it, Serper sends no gl/hl geo params, Track 6 has no per-marketplace variation; only consumer is the eligibility-disclaimer pass-through. **2026-08-06 CONTENT DROP-IN (founder-final copy, rendering-only):** chips = "Verified / Assessed" · how-to-read panel final ("Got it — hide this" dismiss) · 11 tooltips final (verdict scale, both chips, could-not-confirm, not-assessed, five areas incl. documents-never-raise-verdict + sourcing-logic-informational). Meaning checks: verdict-is-the-recommendation preserved, "guarantee" appears only as negation, absence-not-accusation framing throughout. **2026-08-11 SKIN+STRUCTURE PORT phase 1 (into the LIVE app):** ruled cool tokens + Fraunces/Instrument Sans/JetBrains Mono ported to app/globals.css + layout.tsx (utility names unchanged — values only; ONE token layer, admin/marketing share it by design); Clerk colorPrimary mirrored #173e63; portal shell rebuilt (navy sidebar, SVG icons, mobile drawer <lg via thin client ShellChrome — boundary-safe), CaseTable renders cards below md, dashboard emoji icons -> SVG (labels untouched). Mobile portal now WORKS in the real app. Gates: 1146/1146, tsc 0, eslint 0, build clean, frozen diff empty. AA carries over (same hex as verified prototype; muted now 5.5:1 — old desktop failure fixed). REMAINING on 1.4: submit-form stepper structural port (logic-preserving). Report renderer confirmed NET-NEW (status view ≠ report) — stays with the 1.1/1.2 gate, NOT ported. Invoices route flagged: needs a Stripe API, out of scope. STILL OPEN: marketplace-localization decision (backend). |
| 1.5 | **Credits display (BUG-2)** | ✅ | FA | **FIXED 2026-07-30:** `lib/portal/creditsDisplay.ts` — ONE computation for all render sites (billing ×2, dashboard, sidebar). Balance and plan allotment stated as distinct quantities ("7 credits available · plan renews to 5/cycle · includes 2 extra"); bar hard-capped at 100. Test-locked: can never say "7 of 5". Visual redesign stays UX. |
| 1.6 | **Legal pages** | 🔴 | F+PT | Terms · Privacy · Data policy · Refund/cancellation · Cookie policy **+ consent banner** (mandatory once pixels are added) · IP/claims · no-guarantee disclaimer. |
| 1.7 | **Contact page** | 🔴 | UX | Plus a working inbound route. |
| 1.8 | **Sample-report page** | ✅ | UX | **BUILT 2026-08-20** (`9212296`) — `/sample-report`, the whole deliverable incl. the checklist and the limits section. ⚠ Sample is ANONYMIZED (defamation exposure naming a real vendor beside a negative verdict) — founder call to swap in a real case. |
| 1.9 | **Env separation (test/live keys)** | 🟡 | F+FA | **CODE HALF DONE 2026-08-20** (`b17805c`): live Stripe keys are refused outside Vercel Production, asserted at the one client-construction site (VERCEL_ENV, never NODE_ENV). **Founder half:** put live keys in Production env only. |
| 1.10 | **RLS suite / tenancy isolation** | 🟡 | FA | **PROVEN 2026-08-20** (`a7e7d53`, `078220e`): 40-check adversarial suite — 34 tables + write + GUC injection + both storage buckets, all clean; cross-client isolation verified in-DB (B sees 0 of A's 38 cases). **🔴 One latent finding:** `clients_self` role escalation — describe-and-stop SQL written, **fix before Clerk→GUC wiring**. |
| 1.11 | **Stripe live mode** | 🔴 | F | Incl. a LIVE-mode $149 price (test price must never reach Production env). |
| 1.12 | **staging → main promotion** | 🔴 | F | main is still create-next-app scaffold. Carries the reconciled Track 6 migration. |

---

## 2. MARKETING SITE

| # | Item | Status | Owner |
|---|---|---|---|
| 2.1 | Website redo — better design + more content | 🔴 | UX |
| 2.2 | Pricing page redo — FAQs, clearer instructions, "how we work" | 🔴 | UX |
| 2.3 | Legal pages (see 1.6) | 🔴 | F+PT |
| 2.4 | Contact + Help pages | 🔴 | UX |
| 2.5 | Blog / Sanity CMS + 5–10 SEO posts pre-launch | 🔴 | F+Cowork |
| 2.6 | Full SEO — keywords, Search Console, pixels | 🔴 | UX |
| 2.7 | About page | 🔴 | UX |
| 2.8 | Login page + error pages (404/500) | 🔴 | UX |
| 2.9 | ~~Technical SEO plumbing~~ **BUILT 2026-08-20** (`4fd6ba1`): `robots.txt` (marketing allowed; portal/admin/api/auth disallowed), `sitemap.xml`, generated OG card + `metadataBase` (without which every card URL was relative and broken), Twitter `summary_large_image`. Org JSON-LD already existed. | ✅ | FA |
| 2.10 | Analytics (GA4 or similar) | 🔴 | F |
| 2.11 | ~~`#pricing` href in announcement-bar~~ **FIXED 2026-08-20** (`be3bbc2`) — now `/pricing`; no element with that id existed on any page | ✅ | FA |
| 2.12 | Email capture / newsletter signup | 🔴 | UX |
| 2.13 | **Go-live gate condition:** site must not go public advertising category flags unless built — **now satisfiable** (Track 6 is live) | 🟡 | F |
| 2.14 | Copy edits marked PROPOSED at the banned-language gate: `help.ts` action line, `how-it-works.ts` negation | 🔴 | PT |
| 2.15 | ~~`SAAS_ARCHITECTURE.md:32` still shows retired $79/$197~~ **fixed 2026-07-30** (marked retired, current `single_99` $99 named) | ✅ | FA |

---

## 3. CLIENT PORTAL

| # | Item | Status | Owner |
|---|---|---|---|
| 3.1 | **Case output / report redo** — most important; what the client reads | 🔴 | UX→FA |
| 3.2 | Portal page redesign | 🔴 | UX |
| 3.3 | Credits section fix (BUG-2) — see 1.5, **fixed 2026-07-30** | ✅ | FA |
| 3.4 | ~~Plan-upgrade button (missing)~~ **✅ VERIFIED BUILT** — "Upgrade to a subscription" card + Upgrade action live on the billing page | ✅ | — |
| 3.5 | Billing overhaul — credit FAQs, per-case usage, top-up clarity | 🔴 | UX |
| 3.6 | Latest-news section (Sanity posts) | 🔴 | UX |
| 3.7 | **ASIN field + one-brand cap** (see 1.3 — ✅ complete 2026-07-30, migration applied) | ✅ | FA |
| 3.8 | Mobile (see 1.4) | 🔴 | UX→FA |
| 3.9 | ~~Settings page — never built~~ **✅ VERIFIED BUILT** — real page (profile form, contact/billing/tax fields, `SettingsForm`). If v2 meant a richer scope, log the delta as a NEW item | ✅ | — |
| 3.10 | Case status/progress view — **DATA+VIEW EXIST (source-verified 2026-07-30):** StatusBadge (14 statuses → 8 client labels; `research_failed` = "Delayed — under review"), Research Dimensions grid (5 rows, per-track pills), Timeline stepper, 4s refresh while researching. **Method-exposure fork DEFERRED to the design pass (founder, 2026-07-30) with a LEAN ON RECORD: naming the five dimensions is fine (WHAT we assess); per-dimension live STATUS during research may cross the line. Rule with the real screen.** | 🟡 | UX |
| 3.11 | Download-PDF action — ✅ **LIVE 2026-08-20** (`62dfe1f`): client route + admin route, per-click signed URLs, three honest states (202 rendering / 404-403 not-yours / transient). ~~stub placed 2026-07-30:~~ disabled "Download PDF (coming soon)" on the delivered client case view; generator = client-surface gate. NOTE: the named seam (`GET /api/admin/cases/[id]/report` over `buildVerdictViewModel`) is ADMIN-scoped; the client download needs its own client-scoped route in front of the same view-model — the gate rules that | 🟡 | FA |
| 3.15 | **Subscriber tier switch (Growth ⇄ Scale)** — **webhook half BUILT 2026-07-30** (price → `planForPriceId` → `plan_type`/`plan_category` + `upgrade`/`downgrade` events). **CREDIT RULINGS LOCKED 2026-07-30 (Option A + riders):** upgrade raises credits UP TO the new allotment via `raise_credits_to_allotment` RPC (GREATEST — atomic, idempotent, never stacks) · **RIDER 1:** at most ONE grant per billing period (guard: `billing_audit` `upgrade` rows with the grant-note prefix since `current_period_start` — kills the spend-then-re-upgrade farm; test-proven both ways) · **RIDER 2:** downgrade = NO immediate clawback; renewal rollover clamp unchanged · audit row per grant · **edge-6 alignment:** checkout `activatePlan` uses the same GREATEST semantic (legacy-SET fallback pre-migration, loud). **Founder steps remaining:** run the `raise_credits_to_allotment` migration + enable plan-switching in the Stripe portal config | 🟡 | FA→F |
| 3.12 | Clarification / dispute request flow | 🔴 | UX |
| 3.13 | ~~Submission form: drag-drop upload, conditional notes~~ **✅ VERIFIED BUILT** — drag-drop path shares validation with the button path; notes REQUIRED when no document uploaded (the conditional rule, live) | ✅ | — |
| 3.14 | Client-facing checkpoint emails (OQ-3, currently gated — admin-digest only) | 🗄️ | PT |

### Report content rules (carry into design)
- **Verified/Assessed RULED + WIRED (2026-08-07):** client certainty = the two-value derivation in `lib/portal/certainty.ts` (Verified iff ≥1 attached evidence item is LLM-certainty "verified"; else Assessed; absence = Assessed, never doubt), computed READ-SIDE in the client projection because every `finding_certainty` WRITE site is frozen (pipeline.steps ×6, categoryStep ×1 — all hardcode "unknown"; the write-side fix is a separate founder-run engine pass). NEVER derive from `confidence_band` (term collision). "Unconfirmed"/"Inferred" no longer exist on client surfaces. Old delivered rows render correctly via the derivation — no backfill required for display.
- Remove "Dimension N" labels · scrub `src_N` and evidence tags (`(A1, E2)`, `(A10, RG-02)`)
- Rewrite engine headers into plain client language · hide operator states and "informational; does not affect verdict" notes
- Render `documentation_review` etc. as human labels, never raw snake_case
- `category_verdict` **never** shown to a client as "verdict" (Condition 3)
- Category client projection is a **gate-closing requirement** — the $499 differentiator
- `brand_evidence_status` render (OQ-S4 option ii)
- The "beyond our control" alert + closing disclaimer placed
- Design must survive: 1-line or 6-line risk paragraphs · 130-word single blocks · a dimension "not assessed" · 1 or 5 brands · empty analyst block · 2–14 verify questions

---

## 4. ADMIN CONSOLE

**RULING (founder, 2026-07-30) — super-admin identity, Option B:** `gautamnaidu.p@gmail.com`
(Clerk `user_3FMpveJshdQq9bDAzxygPyPaMy2`) **IS the super-admin/master** — single owner identity.
The earlier g@hyprriq.com no-client-row plan is **SUPERSEDED** for this account (the migration
file's g@ seed template is now a dead comment, harmless). Sub-user hierarchy **DEFERRED until
there is staff**. No conflict with his clients row: `admin_permissions` wins by explicit
precedence in `getOperator`; portal/dual-identity unaffected; by-design edge — a `disabled=true`
permissions row blocks everything including the legacy fallback. **Seed CONFIRMED RUN (read-only
probe 2026-07-30): exactly one row — the master Clerk id, role=super_admin, disabled=false.**

**Admin batch shipped `d71da31` + `b548447` (2026-07-30, fast-and-rough per standing rule 10):**
role hierarchy (`lib/auth/permissions.ts`, fail-closed, six checked capabilities, no
self-escalation) · `requireAdmin` = `getOperator` (two-sided proven; all nine pages + six legacy
API routes funnel through it) · run-a-case · attempt history · pipeline progress · billing reads ·
credit adjust · three thin screens (`/admin/users`, `/admin/cases/run`, credit-adjust widget).

**FIX (2026-07-30, founder-ordered, log-confirmed):** `/admin/users` crashed client-side (200 +
"Application error") because `users-manager.tsx` ("use client") imported the `CAPABILITIES` value
from `permissions.ts`, dragging `supabaseAdmin` into the browser bundle where the service key is
stripped → `createClient` threw pre-mount. Fixed: constants extracted to dependency-free
`lib/auth/capabilities.ts` (re-exported from `permissions.ts`; server callsites untouched) +
`import "server-only"` in `lib/supabase/admin.ts` (client-bundle inclusion now FAILS `next build`
— proven two-sided by temporary reintroduction) + `clientBoundary.lock.test.ts` (walks the
value-import graph from every "use client" module; failed BY NAME pre-fix). **Consequence for
founder-run scripts:** the probe template is now
`npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local <script>`
(the server-only poison throws under plain Node without the condition; vitest stubs it).

| # | Item | Status | Owner | Notes |
|---|---|---|---|---|
| 4.1 | Admin redesign — output reading format | 🔴 | UX | Denser than client side by design |
| 4.2 | **Rerun button + attempt-history versioning** (OQ-CASE-RERUN) | ✅ | FA | ~~Re-runs currently overwrite in place~~ **FALSE (source-verified 2026-07-30):** the rerun path already existed (review route `request_investigation`) and H1 appends attempts. Added `rerun`/`review_publish` capability gates + `AttemptHistory` (DELIVERED pin, LATEST marker; per-attempt verdict not stored — shown as markers, honestly). **Dispute-rerun button on DELIVERED cases added 2026-07-30** (surfaces the already-tested frozen-delivered API path; distinct styling, own confirm step, `rerun`-capability gated). |
| 4.3 | **Operator-added material — Modes A & B** | 🔴 | F→FA | A = note/links → report only, no verdict change. B = finding → track → **must trigger re-run**. **SEQUENCING RULED (founder, 2026-07-30): BOTH modes at the client-surface gate, SPEC-FIRST** — Mode A's value only materializes when the report renders it; Mode B's open questions (evidence shape, `source_type` with contracts.ts frozen, scanner treatment, weight ceiling) are already on the gate's ruling board — building either now would rule gate items out of band. **Mode B's MECHANISM is DONE and is the enforcement point by construction** (dispute-rerun → H1 append → `reinvestigation_pending`; a track addition without a re-run is structurally impossible — absence of any door, like the credit bypass). Remaining = intake surface + injection spec, both gate work. State 2026-07-30: ZERO intake code (closest existing: `additional_questions` CRUD, admin-only). |
| 4.4 | Live pipeline-progress tracker (UX-1) | ✅ | FA | `PipelineProgress` chips on review page over `track_0..6_status`; failed stages named. Diagnostic-grade; UX restyle stays under 4.1. |
| 4.5 | **Super user — unlimited credits, run reports for direct clients** | ✅ | FA | Shipped as one feature with 4.7: `POST /api/admin/cases/run`, normal pipeline, `cases.origin='operator'` + `operator_meta` = one-query provenance, audit row per run, house row `operator-house` (0 credits, inert) for attribution. Super-admin seed **confirmed run 2026-07-30** (Option-B ruling above). Tier fork STOP-2 → 4.14. |
| 4.6 | **Manual client creation** | 🔴 | FA | Attribution matters: reports must belong to a client for delivery + corpus. Interim: operator runs attribute to the `operator-house` row. |
| 4.7 | **Credit bypass for admin-run cases** | ✅ | FA | Proven: NO credit call anywhere on the operator-run path (rpc spy untouched), audited per run, explicit capability (`run_case`). |
| 4.8 | **Billing control** — view invoices, manual refunds, partial refunds, add credits | 🟡 | FA | Reads ✅ (`lib/data/stripeBilling.ts`, read-only, key-safe — NO write call exists) + credit adjust ✅ (H6 atomic RPCs only, REQUIRED reason, audited) + **per-client ACCOUNTING read ✅ 2026-08-02** (`getClientAccounting`: credits held/used, per-case usage, adjustments, plan events, invoices/payments — the ONE read the UI section calls; `docs/ADMIN_FOUNDATIONS.md` §5). **Refunds = STOP-3 → 4.15, deliberately unbuilt.** Remaining = the UI section itself (UX thread). |
| 4.9 | **Invoice format/branding** | 🔴 | F | Do Stripe invoice branding settings FIRST (logo/colour/footer, ~20 min) before any custom generator |
| 4.10 | Staff accounts + permissions | 🟡 | FA→F | Mechanism ✅ built (`admin_permissions`: super_admin \| sub_user, now SEVEN checked capabilities incl. `view_all_clients`, FULL_ACCESS preset, fail-closed, disabled-beats-all; manage-users is the super_admin ROLE — self-escalation structurally impossible three ways incl. the invitation claim path). **ADMIN FOUNDATIONS 2026-08-02:** email invitations ENGINEERED (Resend + Clerk-verified-email claim at first admin visit, audited both ends) + CLIENT PARTITIONING built (`staff_client_assignments`; sub_user default assigned-only; `view_all_clients` = the grantable elevation; enforcement at pages via `requireAdmin.clientScope` AND every client/case admin API via `clientInScope`/`caseInScope`; FAIL-CLOSED test-locked). Full record: `docs/ADMIN_FOUNDATIONS.md`. **Migration `20260802000000` APPLIED 2026-08-02 via MCP on explicit founder authorization** (read-back: both tables present, 0 rows — the founder-runs-prod law otherwise stands). The 20260801 credits RPC was verified founder-run. Invitations + partitioning are LIVE end-to-end. **PERMISSION HIERARCHY (super_admin > admin > sub_user) ruled + built 2026-08-02; migration `20260803` (role CHECK) APPLIED 2026-08-03 via MCP on explicit founder authorization — read-back: three-role CHECK live, existing rows untouched (1 super_admin). Full record: `ADMIN_FOUNDATIONS.md` §9b.** Activation still waits on actual staff. |
| 4.11 | ~~Verify ⚖ LEGAL FLAG banner renders~~ | ✅ | F | **VERIFIED 2026-08-20** (`4644878`): extracted to `components/admin/legal-flag-banner.tsx` and rendered through `react-dom/server`, two-sided (fires on a lawsuit disclosure with the signal named; renders NOTHING on innocent notes). |
| 4.12 | Outcome panel refinement | 🔴 | UX | Recurring task, not a buried field |
| 4.13 | Agency panel | 🔒 | — | Phase K |
| 4.14 | ~~STOP-2 fork~~ **STOP-2 RULED (founder, 2026-07-30): Option B — the operator picks the tier per run, NO default.** The built shape stands as-is; no code change. | ✅ | — | Options were: (A) always scale_499 · (B) per-run pick (chosen) · (C) fixed lower tier. |
| 4.15 | ~~STOP-3 fork~~ **STOP-3 RULED (2026-07-30) + REFUND POLICY LOCKED (2026-08-02, build DEFERRED to the billing-section pass):** dashboard-only until then; NO refund write exists. Policy captured verbatim in `ADMIN_FOUNDATIONS.md` §9c (14-day window; undelivered single 100% + credit clawback; delivered single 30%; unused sub/top-up credits per-credit value + clawback; used credits 30%, reports stay; nothing after 14 days; window from delivery/charge). Constants live: `DELIVERY_SLA_HOURS = 1`, `REFUND_WINDOW_DAYS = 14`. ⚠ `PLAN_SLA_DAYS` (3–5 days) tension flagged for founder. | ✅ | — | Build at the billing-section pass. |

---

## 5. SECURITY / RELIABILITY (Phase I)

| # | Item | Status | Owner |
|---|---|---|---|
| 5.1 | Env separation (see 1.9) | 🔴 | F+FA |
| 5.2 | RLS suite (see 1.10) | 🔴 | FA |
| 5.3 | ~~Sentry — not wired~~ **WIRED 2026-08-20** (`645b560`), key-safe: server + client instrumentation, `captureException` on the root error boundary. **Founder half:** create the project, set `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`. Replays deliberately OFF (client report content must never ship as session video). | 🟡 | FA→F |
| 5.4 | UptimeRobot | 🔴 | F |
| 5.5 | Support widget | 🔴 | F |
| 5.6a | Determinism suite — **EXISTS (split 2026-07-30):** the H1 determinism proof is the founder-run rejudge harness (`scripts/rejudge-case.ts`, AT-3, read-only re-derivation vs stored) + the lock tests | ✅ | FA |
| 5.6b | Credit-concurrency + gating-matrix suites — genuinely ABSENT | 🔴 | FA |
| 5.7 | Whole-platform audit (the bug hunt was seam-only) | 🗄️ | FA |

---

## 6. ENGINE / BACKEND — deferred or conditional

| # | Item | Status | Notes |
|---|---|---|---|
| 6.1 | **Keepa gate** | 🗄️ | Needs ASIN field. Plugin, scenario intelligence, NEVER a verdict input (Q-K1). Remove the 3 dormant weight keys. Reporting law: brand enforcement = brand-wide (Track 3); seller dynamics = per-ASIN (Keepa) |
| 6.2 | vendor×brand relationship records | 🗄️ | Never built; lost in the G007 reshape. **Backfillable** at G6 from `intelligence_events.brands_normalized` + `case_outcomes` |
| 6.3 | Degraded-write tripwire | ✅ | Built + registered (`degradedWrites.ts`, daily cron, three families, silent on clean days) |
| 6.4 | **$149 tier assembly** | 🟡 | **BUILT 2026-08-07 (founder-ruled spec):** `single_149` = 1 credit · 3 brands · all 5 areas · category compliance YES (`CATEGORY_PLANS`; growth DELIBERATELY excluded) · uploads 2 · standard SLA · no rollover/top-ups · ASIN only when `KEEPA_LIVE`. Full ladder re-ruled same date: caps 3/3/5/5; uploads 0/2/2/2 ($99 upload field DISABLED-with-upsell, server-enforced); `KEEPA_LIVE=false` gates all ASIN collection (nothing renders anywhere until the flag flips). **Migration `20260807` APPLIED 2026-08-07 via MCP on explicit founder authorization** — triple-verified: MCP read-back (both plan_type CHECKs carry all four values; live rows untouched: growth/scale/single_99), CLI probe via the app's own creds (all live values within the four-plan set; compiled caps 3/3/5/5), Vercel deploy of `687b70a` READY on staging. **ONE FOUNDER STEP remains: create the Stripe price (one-time $149, metadata plan_type=single_149 / billing_type=one_time / credits_granted=1) and set `STRIPE_PRICE_SINGLE_149` in Vercel + .env.local.** Until then: tier visible, checkout 503s cleanly. ~~Tier NAME "Complete Report" = UNRULED placeholder~~ **NAME RULED 2026-08-08: "Complete Report"** (pre-design batch block above). |
| 6.5 | G4 threshold recalibration | 🗄️ | Against the outcome corpus. **Entry conditions (recorded at the S-1 freeze):** k-term noise dominance in the gap axis · degenerate cost axis (59/66 low, 0 severe) · A6 per-hypothesis scoring vs H1 immutability (the write path is G4's design problem) |
| 6.6 | G6 Institutional Memory read-side | 🔒 | ~50–100 delivered cases. **Heavy gate** — as specced it reopens the frozen verdict engine. Alternative to weigh: scenario-intelligence-only (Keepa pattern) |
| 6.7 | Category Compliance V2 (ASIN-level) | 🗄️ | `scope` field is the upgrade hinge |
| 6.8 | OQ-CC2 — M9 narrative mentions category | 🗄️ | V2 engine-touch, own gate |
| 6.9 | Engine-voice question | 🗄️ | Does M9 write our-voice legitimacy conclusions often enough to warrant a prompt fix? Data so far: blocking sentence on attempt 10, clean on attempt 13 — **intermittent** |
| 6.10 | Opus 4.8 → Opus 5 | 🗄️ | Free capability upgrade, same price. **Post-launch recalibration gate** — re-run A5, re-rule thresholds, re-freeze. Do alongside G4 |
| 6.11 | `max_brands_per_credit` is NULL on all client rows | 🔴 | Brand cap enforced from `PLAN_BRAND_CAPS` in code, not per-client. Resolve in the client-surface gate |
| 6.12 | Track 4 signal flap (`soft_fail` → `n_a` between runs on 021) | 🟡 | Logged, not acted on. Watch if it recurs |
| 6.13 | **ADR-008 corpus caching (90-day reuse) + synthesis memoization** | 🗄️ | **NAMED DROP (standing rule 6, founder-ruled 2026-08-02):** was founder-ruled a PRE-LAUNCH requirement 2026-07-11; **hereby DEMOTED to post-launch** — a decision, not a silent drop (closing the exact gap that made v2 carry it nowhere). WHY: the read-back CONSUMER (G6 read-side, 6.6) is itself deferred to ~50–100 delivered cases; caching feeds a capability not yet in use on a corpus not yet at volume; the value is real but FUTURE and accrues from whenever it's switched on with no penalty for waiting (write-side stays live; only re-run cost + read-back readiness change, neither pre-launch-critical) — while STANDS would put a migration + memoization build on the critical path at first-paying-client time (the depth-first trap the roadmaps flagged). Home: the post-launch scaling cluster with G4 (6.5), G6 (6.6), Keepa (6.1), relationship-records backfill (6.2) — "make the corpus smarter once there's volume." **ENTRY CONDITION:** build when re-run volume or G6 read-side work makes it worthwhile. **BINDING CONSTRAINT PRESERVED (Q4 ruled (b), 2026-07-16, verbatim in HISTORY):** memoization keys ONLY on `synthesis_input_hash` (full synthesis input, additive founder-run column), NEVER on `evidence_hash` alone — the unsoundness closed 2026-07-16 must not be rebuilt from old code. The F5 rollups-on-adoption flag travels with this item. |

---

## 7. GTM (not UI/UX — separate lane)

| # | Item | Status |
|---|---|---|
| 7.1 | Email marketing platform + sequences | 🔴 |
| 7.2 | LinkedIn presence + content cadence | 🔴 |
| 7.3 | Affiliate/referral (columns exist: `referral_code`, `referred_by`) | 🗄️ |
| 7.4 | YouTube avatar strategy | 🗄️ |

---

## 7b. CARRIED FROM THE PRIOR TRACKER (missed by the v2 draft — its mirror was dated 2026-07-04)

| # | Item | Status | Owner | Notes |
|---|---|---|---|---|
| 7b.1 | BUG-1 live check | 🔴 | F | Standing founder-ledger item since the S-1F handover |
| 7b.2 | Canary panel — first monthly run | 🔴 | F | All four amendment items implemented; the run itself never happened |
| 7b.3 | Untracked-folders ruling (`backups/`, `codex-fresh-design/`, `mockups-codex-exploration/`) + `skills-lock.json` | 🔴 | F | Standing ledger; the tree carries them every commit |
| 7b.4 | OQ-CC5/H4 embed decision — **now UNBLOCKED** | 🟡 | PT | The H4 negation carve-out is live: both founder-authored denial strings (the §8 governing law + the OQ-CC5 scope sentence) are embeddable at the client-surface gate. Was a blocker; now a choice |
| 7b.5 | Identity-discrepancy client-note enhancement ("the website you provided belongs to X" wording upgrade) | 🗄️ | PT | Logged pre-S-1; natural home = client-surface refresh |
| 7b.6 | Keepa Q-K2 test-gate corpus requirements | 🗄️ | PT | (a) the stall-breaker end-to-end (Keepa resolves the lean WITHOUT moving the verdict) · (b) a wrong/junk-link case (validation fires, graceful) · (c) real ASINs across scenarios — attach to 6.1 when the gate opens |
| 7b.7 | Q-K1's flagged consequence: the three dormant Keepa weight keys contradict the ruled design | 🗄️ | PT | Removal is a 6.1 build step; flagged UNRULED in `weights.ts` until then |

## 8. STANDING RULES

1. Founder runs ALL live/prod actions (migrations, batch re-runs, Stripe live). Fable never touches prod.
2. Spec → founder rulings → RED-first build → founder ATs → freeze declared → Fable records.
3. **Two-sided is three sides:** mandated denials, verdict vocabulary, and the evidence's own research vocabulary. Any new rule tests all three.
4. **No output scanner freezes until run against REAL stored engine output** from at least one delivered case.
5. Founder-authored spec docs the build depends on must live in the repo where verification can read them.
6. **When a design supersedes a spec, the superseding record must NAME what it drops.** (Three silent drops so far: category flags, banned-language surfaces, relationship records.)
7. New extractions land as NEW files — never re-copied over annotated ones.
8. Any new client-facing string joins the must-pass fixture in the SAME commit.
9. Client wording is a RENDERING concern — never a stored-literal change. No client-wording ruling may reopen a freeze.
10. **Productization gets built fast and rough — NOT gated like the engine.** The heavy gates are done.

---

## 9. RULED SEQUENCE TO FIRST PAYING CLIENT

1. ~~Founder hour — migration, re-runs, publish, test checkout~~ ✅ **DONE 2026-07-29**
2. **Client-surface / PDF gate** — spec first; ~~ASIN field + one-brand cap~~ ✅ **done 2026-07-30 (pulled forward into the final dev batch; migration applied)**. Remaining gate scope: **report + projection layer + category projection + client wording** (incl. the Modes A/B spec per the 2026-07-30 sequencing ruling, the OQ-CC5/H4 embed choice, VERDICT_SENTENCES-as-rendering, §9.1 rephrase, brand_evidence_status render)
3. **Env separation + RLS suite** — pulled ahead of Keepa (the DB is the least-hardened thing in the system)
4. **Keepa gate**
5. **$149 tier assembly**
6. **Phase J** — live keys, legal, staging→main, Sentry, final E2E as a stranger

---

## 10. CUT LINE (≈3-week window)

**Must ship:** §1 in full. (ADR-008 caching ruled OUT of pre-launch 2026-08-02 — demoted to §6.13 with the drop named.)
**Ship shortly after:** blog/SEO · admin redesign (4.1) · manual client creation (4.6) · invoice branding (4.9) · news section (3.6) · outcome panel refinement (4.12).
**Post-launch:** email marketing · sub-user activation (mechanism built, 4.10) · agency panel · analytics depth · refunds tooling (post-Phase-J per STOP-3).
*(Refreshed 2026-07-30: the old "cut the super-user/rerun/billing cluster" advice is retired — rerun button ✅, super-user runs ✅, billing reads + credit adjust ✅ all shipped in the admin batch.)*

**If the window compresses, cut first:** manual client creation (4.6) + invoice branding (4.9) + news section (3.6) — operator/marketing convenience; none blocks a stranger paying you. The uncuttable core is §1: report + projection, mobile, legal/contact/sample pages, env separation + RLS, Stripe live, staging→main.

---

*Open Items Tracker v2 — Hyprr Retail LLC — Internal.*

