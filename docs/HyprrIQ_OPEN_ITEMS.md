# HyprrIQ — Open Items Tracker (v2, merged)

**THE SSOT. Supersedes BOTH prior versions:** the founder's standalone v2 draft (preserved verbatim at commit `a1d883c`) and the accretion tracker 2026-07-04 → 2026-07-28 (archived with its full ruling history at `docs/HyprrIQ_OPEN_ITEMS_HISTORY.md` — read it for the WHY behind any line here).
**Merged + source-verified:** 2026-07-29 (build thread). Every ✅/❌ correction below was checked against code/git/live-DB, not carried.
**Last updated:** 2026-08-31 (**§0-R THE RESPONSIVE REMEDIATION IS COMPLETE — the offender list is EMPTY; six lists migrated to the new `<ListTable>` primitive, 36 client controls to 44px, 16 reading paragraphs to 16px, the homepage service section compressed below 960px and the rail unified to the same breakpoint. THREE MISTAKES WORTH KEEPING, none caught by review: the primitive reintroduced the clipping it exists to end, the lock could not have caught that because it only checked 360px, and the compression was written default-hidden — which LOSES COPY when a boundary rule misses. ⚠ AN EMPTY OFFENDER LIST IS THE MOST DANGEROUS STATE THE LOCK CAN BE IN, so it now carries a CANARY. Prior: **§0-P INNGEST WAS REGISTERED AGAINST A PREVIEW DEPLOYMENT — split and confirmed; the retention sweep had deleted nothing and could not have until June 2027. Prior: **§0-Q PRODUCTION WAS FOURTEEN COMMITS BEHIND — the homepage had not drifted; deployed state was being read as build state. Prior: 2026-08-24 (**§0-J APP SHELL ALIGNMENT — the 60px headings were an UNLAYERED-CSS cascade bug, not a sizing choice (measured before/after; marketing keeps its scale); portal and admin now share one AppHeader and one top baseline; the five text-base headings are fixed. ⚠ THE text-base TOKEN COLLISION IS HANDED TO THE UI/UX THREAD — rename or lock, not a note. Prior: **§0-G THE AUDITS RUN THEMSELVES — every hand-run census is now a standing BLOCK/ALERT/SURFACE check with a measured zero false-positive rate, nightly sweep paging once per NEW finding, and /admin/integrity where green means measured green. Prior: **§0-F ADR-013 PENDINGS CLOSED — the marker leak was REAL and reached three delivered reports (measured, then closed at the class); the golden-case suite now replays 40 cases through the real verdict chain on every deploy. Prior: **§0-E CTO CLOSE-OUT AUDIT — dev-lane exit review: the delivery email no longer announces reports the client cannot read, the admin boundary is enforced by the layout instead of by every page remembering, the real-money dev routes are disarmed in production, and the last legacy admin check is gone. Live-DB verified; partner_requests is LIVE. DEV LANE CLOSED — the design lane is next.** Prior: **§0-D MONEY-SURFACES BATCH — 149/Scale + top-ups off sale behind ONE sellability registry with the checkout route as the control, paid top-ups land as unclippable purchased credits, four silent-zeros in the webhook money path now fail loud.** Prior: **§0-C FOUR-ITEM BATCH — /partners request flow live (mailto dead, public-route class fix), top-up copy pulled, rollover-RPC fix described-and-stopped, two operator runbooks.** Prior: **§0-B RULINGS EXECUTED — polarity gate 1.8.0, manufacturer-direct g003-1.2.0, download-in-place, email re-skins+lock+welcome+consent; two migrations + the 031 correction wait on the founder.** Prior: 2026-08-20 §0-A STALE-ROW CLEARANCE — seven rows were reporting fixed things as broken; all verified live and cleared. Plus: RLS proven as a 40-check suite with one latent escalation found (describe-and-stop SQL written, fix before Clerk→GUC wiring), env guard, Sentry, SEO plumbing, sample-report page, prose-override UI, resolved brand names on PDF covers.** Prior: 2026-08-18 §1 BUILT — token leaks + presence checkpoint; the P0's root cause CORRECTED, see the top dated block. Prior: END-TO-END AUDIT — see the dated block below §0; findings in `docs/AUDIT_FINDINGS_2026-08-18.md`. Prior: 2026-08-17 ENGINE-PROSE PASS built — see the dated block below §0. Prior: 2026-08-08 PRE-DESIGN BATCH opened — see the dated block below §0. Prior: 2026-08-02 ADR-008 RULED: superseded/demoted to post-launch, drop named — §6.13. *Dating note: sittings span midnights; a batch's entries may carry the opening date.*)
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
> | **SECOND BATCH (same day, planning-thread ruling):** ① grant validity COLLAPSED to one notion per layer — `lib/data/grantLink.ts` (pure) + `grantCheck.ts` (the one lookup) drive landing, /partners banner (which had trusted a bare `?invited=1` query param), sign-up check, and admin labels; the RPC stays the gate; caller lock test walks the filesystem. Fail-open on DB error is founder-accepted AND recorded (`audit_log` `grant_link_fail_open` + console) so it can never be mistaken for the pre-fix bug. ② Typed codes get a home AT REGISTRATION (ruled against billing-box-only): validate-before-account via public `/api/grants/check` → same cookie as the link path → same attach; dead codes speak the pinned REDEEM_COPY words. ③ **GRANTS ARE growth_279 (LOCKED)** — scale_499 was a `??` fallback in `createGrant` that the founder discovered by reading a DB row (the route comment even called it "ruled"); now `GRANT_PLAN_TYPE`/`GRANT_CREDITS` constants, createGrant takes NO product defaults, unsold tiers structurally ungrantable (no plan input on any API). ⛔ **F runs the described SQL** (session deliverable): update live unredeemed scale_499 rows + tighten the DB CHECK; revoked rows need nothing (RPC refuses before reading the tier). ⚠ FLAGGED CONTRADICTION: the brief calls single_149/scale_499 "coming soon" but the pricing page + checkout SELL both today — founder to rule. 3d sweep: submit route's `?? "clean"` virus-stamp fabrication removed (DB DEFAULT 'pending' is the honest state); webhook `TOPUP credits ?? 0` (money paid → 0 credits silently) flagged NOT touched (Stripe) | ✅ SHIPPED | fixtures at every caller |
> | **④ Operator runbooks for the two by-hand obligations** — `docs/runbooks/RUNBOOK_ACCOUNT_CLOSURE_DELETION.md` (30-days-after-closure deletion: the admin delete button, the `intelligence_events` RESTRICT workaround, the email_log scrub the button does not do, four zero-row read-backs) + `docs/runbooks/RUNBOOK_REFUND_BY_FORMULA.md` (classify → count used → locked formula, round once at the end → Stripe dashboard → rule-c/d credit handling → read-backs). Pointer comments at the three code sites. NOT the documentation lane — that stays parked for its own session | ✅ WRITTEN | **found during ④: closure deletion FAILS for any client with completed research** (intelligence_events ON DELETE RESTRICT + append-only trigger) — manual escape documented; corpus-preserving schema fix offered in the describe-and-stop block §C, unruled |

---

## 0-D. MONEY-SURFACES BATCH — 2026-08-22 (third batch; promises the system cannot deliver)

> Stripe-CODE authority granted for this batch (webhook credit path + checkout gate); the
> Stripe account/dashboard stayed founder-only.
>
> | Item | State | Where |
> |---|---|---|
> | **① Tiers we cannot deliver are OFF SALE (LOCKED)** — single_149/scale_499 need category compliance → Keepa → unbuilt. `PLANS_ON_SALE = [single_99, growth_279]` + `TOPUPS_ON_SALE=false` in `lib/constants/plans.ts` is the ONE sellability source; `/api/checkout/session` refuses off-sale items pre-Stripe (the route is the control); pricing cards render coming-soon as a roadmap (chip + honest note, no broken button, "Most popular" moved off the unbuyable); portal pickers (billing plan-less, one-time upgrade card, onboarding step 3), the rebuy button, and the dashboard CTA all derive from the registry; the Growth "Change Plan"→Stripe-portal card REMOVED. Lock test derives the Keepa tie from categoryStep source | ✅ SHIPPED | ⛔ **F, Stripe dashboard: portal plan-switch config** — if the customer portal's update list carries the Scale price, a Growth client can still reach Scale with no app button; also archive the 149/Scale prices from any payment links |
> | **② Top-ups off sale + unclippable when they return** — billing card flag-gated (one-flag return-to-sale); webhook lands paid packs via `add_purchased_credits` (balance + floor). AS-APPLIED records for the founder-run SQL, both live-verified by read-only MCP before writing: `20260822300000_purchased_credits.sql` + `20260822300100_acquisition_grants_growth_only.sql`. Cycle fixture-locked two-layer (SQL expressions verbatim + numeric proof: buy-3 → renewal → paid 3 survive, plan clips, plan-burns-first, 3-renewal survival) | ✅ SHIPPED | re-sale preconditions listed in the 2026-08-22 session deliverable |
> | **③ Silent zeros in the money path DEAD** — the `?? 0` was one of FOUR: unknown paid top-up id (0 credits granted, "Top-up: 0 credits" recorded), paid subscription checkout with unmapped price (provisioned NOTHING, marked processed), paid one-time with garbage metadata kind (silent ACK), paid RENEWAL with lookup miss (card charged, zero cycle credits). All four throw via fixture-enforced helpers → `stripe_events.error` → retried + visible; `subscription.updated` deliberately logs-not-throws (status must survive) with an audit row on unmapped prices. B2 is fixtures now (`plans.paidLookups.test.ts`), incl. prototype-chain shapes that caught a real hole in the first draft | ✅ SHIPPED | |
> | **④ Fabricated verdict** — CLOSED by the follow-up ruling same day (verdict-ADJACENT authority: display of absence only, never computation): **ABSENCE IS NOT A VALUE.** One shared presence notion (`lib/portal/verdictPresence.ts`, keys derived from `VERDICT_SCALE_ORDER`) + one loud reporter (console + `audit_log` `{verdict_absent_at_render}` + ops pager). PDF first: `no_verdict` joins the `no_client_name` refusal pattern; the template's three fallbacks (meta/ink/tone) are total lookups now. On-screen: the portal case page refuses with an honest panel (refusal state over a 500 — "Try again" would be false advice); report-view keeps the throwing belt; the admin review preview no longer shows a fabricated VBP client screen for a verdictless mid-review case (the live item-7 catch — a wrong preview becomes a wrong report). Filesystem lock over the render layers: no fallback TO a verdict value; honest non-verdicts ("pending", "—") stay legal. Engine untouched | ✅ SHIPPED | fixtures + caller lock |

---

## 0-S. THE INSTRUMENTS BATCH — heartbeats, production gates, and a guard refusing its own keys — 2026-08-31

**Owner: UX built, F ruled.** Four commits — `9ba1919`, `466575e`, `0d29f8b` and this. Every item
here is one shape: **something that reports success while doing nothing.**

### 0-S.1 · THE 2B TABLE — "has this guard ever run IN ITS CURRENT FORM?"

**The founder's ruling: this question gets asked routinely, not once.** It is the most reusable thing
in this batch, so it leads.

**The method, which is the point.** Not "when was it written" — *has this guard's code changed since
the last time real data flowed through it?* A guard modified after the last real case has never been
exercised in the form that is deployed.

- Last real case: **created 2026-08-20 15:48Z, delivered 16:07Z** (from `cases`, not recalled).
- Any guard whose file was touched after that has had **no real input**.

| guard | last modified | ever run in this form? |
|---|---|---|
| `content/reportDocument.ts` | 2026-08-24 15:56 | ❌ → ✅ *converted 08-31* |
| `portal/clientTokenCheckpoint.ts` | 2026-08-23 11:28 | ❌ → ✅ *converted 08-31* |
| `integrity/checks.ts` | 2026-08-23 11:28 | ❌ patterns ✅, corpus checks pending the nightly sweep |
| `portal/clientReport.ts` | 2026-08-23 11:28 | ❌ → ✅ *converted 08-31* |
| `portal/verdictPresence.ts` | 2026-08-22 16:04 | ❌ → ✅ *converted 08-31* |
| `pdf/renderReportPdf.ts` | 2026-08-22 16:04 | ❌ **and it was BROKEN** → ✅ *fixed and converted* |
| `portal/publishGate.ts` | 2026-08-20 09:21 | ✅ predates the cutoff |
| `billing/envGuard.ts` | 2026-08-20 14:00 | ✅ |
| `research/proseRepairLoop.ts` | 2026-08-20 11:10 | ✅ |
| `research/methodScanReport.ts` | 2026-08-17 23:59 | ✅ |

**Six of ten had never run. One of those six was broken, and only running it revealed that.** The
other five were converted by the same successful render on 2026-08-31 — see 0-S.4.

⚠ **THE LIMIT OF THE METHOD, STATED SO IT IS NOT OVERSOLD.** It proves *untested*, never *broken*.
It is a question, not a verdict. The only thing that converts a ❌ is real data passing through.

### 0-S.2 · THE PDF GUARD WAS REFUSING ITS OWN LOOKUP KEYS — nine days

Both fired events triggered the function and **both FAILED**: `InternalTokenLeak … 5 occurrence(s)`,
one per assessment area, every one at `findings[N].track_key`.

`track_key` holds `supplier_identity` — one of `INTERNAL_CONTENT_PATTERNS`. **It never renders**: the
PDF prints "Supplier Legitimacy" and the key is the lookup that produces it. All five areas match, so
**every PDF failed**. Broken since the patterns shipped 2026-08-22, silent because no case had
rendered since 08-20.

**A publish gate that refuses every valid document is indistinguishable from a working one until
someone tries it.** That is the crons' shape — five of seven could not be distinguished from never
having run — one layer up.

Fixed the **projection**, never the guard: `clientTokenCheckpoint.ts` is unchanged, per its own law
against grammar-awareness. **And the pattern already existed — the PDF was the outlier.**
`integrity/sweep.ts` scans "ONLY the fields a client actually reads"; the portal and publish paths
see prose only. Four call sites, three already scoped; the fourth now agrees.

**Every field classified with its reason** (`lib/pdf/clientReadableSurface.ts`), because the next
person adding one needs to know the side. `verdict` is flagged as a lookup too — it passes today only
because verdict keys are not yet in the pattern list, and it would fail identically if they were.

**The canary matters more than the fix**: a track key IN PROSE still refuses, the same key as a
LOOKUP passes. Narrowing what is scanned is exactly how a backstop gets quietly disabled.

### 0-S.3 · EVERY CRON PROVES IT RAN, AND THE DESTRUCTIVE ONES ARE PRODUCTION-ONLY

| # | Item | State |
|---|---|---|
| a | The integrity sweep inserted `record_id: null` into a `text NOT NULL` column — **every run threw for six days** behind a page reading "Never checked". Fixed to `table_name "system"`, `record_id "corpus"`. The read moved with the write in **two** places; a lock asserts all three agree. | ✅ |
| b | ⚠ The irony is in the original comment: it avoided a migration so the dashboard would not say "never checked for a week". It said exactly that for six days **because** of that choice — the constraint it sidestepped is what rejected it. | ✅ recorded |
| c | **All seven crons now write a heartbeat on every run.** Written at the END (a throw leaves no row, so a failure reads as a miss — both mean the check is not protecting you) and **best-effort** (a failed write raises a false alarm, never a false calm). | ✅ |
| d | `/admin/integrity` renders a row per cron, overdue at **more than twice** the interval. Crons with no row at all are rendered, never omitted. | ✅ |
| e | ⚠ **THE HEARTBEATS EARNED THEIR KEEP IN MINUTES.** `pipeline-watchdog` recorded two beats **four seconds apart** — one per Inngest environment, both against the SAME database. Demonstrated, not theorised. | ✅ |
| f | So: **six of seven crons gated to `VERCEL_ENV === "production"`** — anything that writes, deletes or emails a client. `degraded-writes-watchdog` is read-only and runs in both, with only its ALERT gated. | ✅ |
| g | ⚠ The gate broke **15 tests**, and that was the important part: `VERCEL_ENV` is undefined in a test runner, so every one would have **passed by being SKIPPED**. Rule 14 in the least visible place — not in an instrument, but in the suite that validates them. | ✅ |

### 0-S.4 · THE RENDER THAT CONVERTED FIVE GUARDS

Fired at production 2026-08-31 09:49:14Z. **Stored 8.4 seconds later**: 182,855 bytes, 10 pages.
1,565 bytes larger than the 08-20 file, consistent with the signpost line added on 08-24.

Verified by opening the PDF, not by trusting the job: page one carries the verdict and the signpost
(`hyprriq.com/portal/…`), page two carries the `SECTIONS` contents with real page numbers, and **no
internal token appears in either**. That output is the artefact proving `verdictPresence`,
`clientReport`, `reportDocument`, `clientTokenCheckpoint` and `renderReportPdf` all executed on real
case data — not merely imported.

🔴 **F — COST TELEMETRY IS DEAD, AND THIS MATTERS BEFORE LIVE STRIPE.** `prompt_runs` has **zero
rows**; `case_track_results.cost_usd` and `.token_count` are **zero on every case**. Only
`case_acquisition_metrics` records anything — $0.027–$0.073 per case across 368 calls. **The LLM
half, which is the entire cost, is recorded nowhere.** The code comment says this feeds AT-SYN-COST
and OQ-S3. It is another "shipped, never exercised" — for observability rather than a guard — and it
means there is no measured per-case margin to price against.

---

## 0-R. THE RESPONSIVE REMEDIATION — COMPLETE — 2026-08-25/31

**Owner: UX. The offender list is EMPTY.** Everything §0-O measured is fixed, the lock that measured
it is green, and both are on `main`. This is the DOC-DELTA for six commits — `4798cdc`, `505242b`,
`ec6eac4`, `174cd7f`, `ed8ef79`, `1bb01d6` — carried across four sittings and recorded here once.

### 0-R.1 · What shipped

| # | Item | State |
|---|---|---|
| a | **The lock BEFORE the fixes** (founder-ruled). "If it ships last, the fixes are verified by the same eye that missed these." It caught an error in the audit that produced it within the hour — see 0-O.6. | ✅ |
| b | **Client surfaces first** (founder-ruled priority): 36 controls raised to the 44px floor, 16 reading paragraphs to 16px. `min-h-11` alone would not have worked — min-height does nothing on an inline element, so each control also got a display that respects it. | ✅ |
| c | `<ListTable>` — one dense table for the desk, one card list for a phone, declared once. It is `components/portal/case-table.tsx` generalised; the portal had this since sitting three and admin never did. | ✅ |
| d | Five lists migrated: `/admin/support` (374px over), `/admin/billing` (320), `/admin/dashboard` ×2 (166 + 110), `/admin/clients` (50). | ✅ |
| e | `users-manager.tsx` stacked BY HAND, not through the primitive — its last cell holds an interactive Revoke button, and the card form has slots for text, not controls. **Forcing it through the primitive to make a number go green would have been the wrong instinct.** | ✅ |
| f | The homepage service section compresses below 960px (spec line 437), measured 4811 → 2754px at 360. | ✅ |
| g | The rail breakpoint unified at 960 so ONE NUMBER governs it and the compression. | ✅ |
| h | 🔴 **F — the two admin screens the narrowed ruling named** (`/admin/cases`, `/admin/cases/[id]/review`) are still OUTSIDE the 44px tap-target scope. `case-review.tsx` carries 16 controls under 44px, smallest 28px. Deliberately deferred; not forgotten. | 🔴 F |
| i | 🔴 **F — seven `<table>` elements still have no horizontal scroll container.** Listed in the lock, allowlisted, POOR not BROKEN: their cells wrap rather than overflow. | 🔴 F |

### 0-R.2 · Measured, at every ruled width

Same-origin iframes at exact widths, `getBoundingClientRect` / `scrollWidth` / `elementFromPoint`.
**Document overflow 0 at 360, 390, 430, 768 and 1024 on every migrated surface.**

| surface | below md | at 1024 |
|---|---|---|
| `/admin/support` | cards, all seven fields present | dense, 61px excess **scrollable** |
| `/admin/billing` | cards, `elementFromPoint` → THE LINK | dense, scrollable |
| `/admin/dashboard` ×2 | cards; the support strip has **no href by design** | dense, scrollable |
| `/admin/clients` | cards, the credits figure present | dense, → THE LINK |
| invitations sub-list | flex-wrap, long email readable, → THE BUTTON | grid, row overflow 0 |
| homepage service section | number + question + limit | rail + summary + detail boxes |

### 0-R.3 · The three mistakes worth keeping

**None of these was caught by review. Each was caught by measuring, and two by the lock itself.**

1. **THE PRIMITIVE REINTRODUCED THE DEFECT IT EXISTS TO END.** I wrapped its dense table in
   `overflow-hidden`. The `md:` gate keys off the VIEWPORT while the table lives in a CONTENT BOX the
   sidebar narrows — 1024px viewport gives 728px, the columns need 750px, so it was **clipped by
   61px on a laptop.** Now `overflow-x-auto`.
2. **AND THE LOCK COULD NOT HAVE CAUGHT IT**, because `isOffender` only checked 360px. A grid gated
   to `md` skips 360 and 390 and was therefore **never examined at all** — while being clipped on a
   real machine. It checks every ruled width the grid renders at now, and treats a SCROLLING wrapper
   as acceptable.
3. **THE COMPRESSION WAS WRITTEN THE DANGEROUS WAY FIRST.** `hidden min-[961px]:block` — measured at
   a 961px iframe the copy STAYED HIDDEN, because devicePixelRatio 1.25 put the layout viewport at
   ~960.8 and `matchMedia("(min-width: 961px)")` returned false. **Default-hidden means the copy
   disappears when a boundary rule misses.** Rewritten as `max-[960px]:hidden`: the same failure now
   shows too much rather than losing content. **A rule whose job is hiding real copy must fail open.**

### 0-R.4 · ⚠ AN EMPTY OFFENDER LIST IS THE MOST DANGEROUS STATE THE LOCK CAN BE IN

Standing rule 14 at its sharpest. With nothing left to find, every "is it still broken" assertion is
trivially satisfied, and **a scanner that quietly stopped reading the codebase would look identical
to a clean one.** Three defences, all in `responsive.lock.test.ts`:

- **THE CANARY.** `isOffender()` is handed `/admin/support` AS IT WAS — 750px, ungated, clipped — and
  must still return TRUE. Two mirrors must return FALSE: the same width when SCROLLABLE, and a width
  that fits. *A detector that flags everything gets ignored as fast as one that flags nothing.*
- **Proofs of life anchored on files that EXIST**, never on defects that no longer do. The lock made
  that mistake once already: its constant-resolution self-test used `/admin/support`'s `COLS` as the
  specimen, and **expired the moment that page was migrated** — rule 14 inside the test written to
  enforce it. Re-anchored on `case-table.tsx`'s ternary constant.
- **The migrated routes are asserted SEEN, not merely absent** — each must still render through
  `<ListTable>`, and the scanner must still find grids under `app/(admin)`, so "clean" cannot be read
  as "blind".

### 0-R.5 · Does the lock catch a NEW admin screen?

**Yes — it does not work from a list.** `KNOWN_OFFENDERS` is an allowlist of things already broken;
the rule runs against everything `scanAll()` walks, and "no NEW offender" fails on anything not on
it. A screen created next month is by definition not on it. It resolves `COLS` constants, sees
wrapper gates above inner `.map` returns, and does not false-positive a correctly-built component.

**Where it would miss, stated plainly:** a screen that overflows by a mechanism other than a
fixed-track grid, an unwrapped `<table>`, or a sized control — a `min-w-[900px]`, a
`whitespace-nowrap` row, a flex child that will not shrink. It polices three known shapes well and
does not know a fourth exists. Under rule 14 the right response is not to claim coverage but to keep
reporting how much was examined.

---

## 0-Q. PRODUCTION IS FOURTEEN COMMITS BEHIND — THE "DRIFT" IS AN UNMERGED BRANCH — 2026-08-25

**⛔ STOP-AND-TELL, per the standing rule "if the codebase contradicts the brief, STOP and tell me
first." Nothing in the homepage/graphics brief was built this sitting.**

The founder reported the live homepage as having **drifted from the spec** — the portal mock naming
`Northgate Wholesale Co.` where the spec says `Example Trading LLC`, and the three portal cards not
sharing a baseline. Both symptoms are real. **Neither is drift.**

**`main` is at `d688377`. `staging` is fourteen commits ahead of it.** Every one of those symptoms —
and almost every item in the brief's "newer additions" list — was built earlier in this same sitting
and has been sitting on `staging`, unmerged, while `hyprriq.com` serves `main`.

**MEASURED on both live origins, same probes, same minute:**

| probe | staging | production |
|---|---|---|
| `Example Trading LLC` | **4** | **0** |
| `Northgate` | **0** | **4** |
| `hq-ring-arc` (the progress ring) | **1** | **0** |
| `hq-pulse-dot` (the state markers) | **2** | **0** |
| `role="img"` on `/what-we-check` | **1** | **0** |
| `role="img"` on `/method` | **1** | **0** |
| `role="img"` on `/how-to-read` | **1** | **0** |

| brief item | actually |
|---|---|
| 2a — vendor name is `Northgate` | **fixed `0314ca1`**, on staging |
| 2a — portal cards share no baseline | **fixed `9c77403`** (subgrid), on staging |
| 2b — progress ring, 2 of 5 | **built `9c77403`**, geometry derived not copied |
| 2b — state markers (filled / pulsing / hollow) | **built `9c77403`** |
| 2b — one-in-one-back flow visual | **built `9c77403`** |
| 2b — verdict text at 9.5px in that SVG | **built `9c77403`**, founder-ruled to stay |
| 2b — **mobile compression below 960px** | 🔴 **GENUINELY NEW.** Not built. |
| 2c — masked invoice → `/what-we-check` | **built `c07c434`** |
| 2c — checkable/not-checkable → `/method` | **built `c07c434`** |
| 2c — verdict ladder → `/how-to-read` | **built `c07c434`**, reads `VERDICT_PALETTE` |

**ONE ITEM IN THE BRIEF IS GENUINELY NEW:** the service-section mobile compression, spec line 437 —
`.pan .pm, .pan .d { display: none }` below 960px, leaving the number, the question and the limit.
It post-dates the build and is not in the repo.

🔴 **F — THE FIX IS A MERGE, NOT A BUILD.** Promoting `staging` to `main` is a deploy to `main`, which
stops at the founder. A full "drift report" of the other twelve items would be a report on the gap
between two branches, not on anything wrong with the code.

**THE LESSON, and it is a new shape:** every prior finding this sitting came from measuring the live
domain, and that was right. This one shows the other edge of the same habit — **the live domain is
evidence of what is DEPLOYED, never of what is BUILT.** Fourteen commits of verified, locked,
green-tested work were invisible to it, and read as regression.

---

## 0-P. INNGEST WAS REGISTERED AGAINST A PREVIEW DEPLOYMENT — 2026-08-25 (founder-found) ✅ FIXED

### 0-P.0 · ✅ EXECUTED AND CONFIRMED BY THE FOUNDER, 2026-08-25

| environment | app | serve URL |
|---|---|---|
| Production | `hyprriq` | `https://hyprriq.com/api/inngest` |
| `staging` | `hyprriq` | `https://hyprriq-git-staging-hyprrx-hyprriq.vercel.app/api/inngest` — 10 functions |

**THE PROOF WAS THE ONE THE RUNBOOK ASKED FOR:** the founder deployed staging and **production's URL
did not move.** Before the fix a staging deploy would have overwritten it. That is the whole defect,
demonstrated absent.

**And the runbook's correction held: there was nothing to archive.** One app, corrected in place by
the production redeploy — exactly as §0-P.5 predicted after I checked instead of assuming.



**Owner: F executes, UX described. DESCRIBE-AND-STOP: nothing in here has been changed.** The
founder found the Inngest dashboard showing one app whose serve URL was a single immutable Vercel
deployment, and held the PDF render until it was settled.

### 0-P.1 · Diagnosis — confirmed, with one correction that changes the risk

The URL **was** a deployment-specific immutable one, and execution **was** pinned to it. But the
founder's reading of *which* build was wrong, and it matters:

`hyprriq-605r5bmfv-…` resolves to `dpl_BXfNeU33SJQGMSJDdPZMZeJtDsWQ` = commit **`b12b254`**, branch
**`staging`**, `"target": null` — a **PREVIEW** deployment created **the same afternoon the founder
asked**. Not an old build. The failure is not staleness:

> One Inngest app + the SAME keys in both Vercel scopes → **every deployment on either branch syncs
> to the same Inngest environment and overwrites its serve URL. Last deploy wins, regardless of
> branch.** Production case execution runs on whatever deployed most recently — as of the diagnosis,
> staging code in a `VERCEL_ENV=preview` runtime — and flips on the next deploy either side.

| # | Finding | State |
|---|---|---|
| 0-P.1a | Registered URL is a preview deployment of `staging`, minutes old — not a stale build | ✅ measured |
| 0-P.1b | `serveOrigin: process.env.INNGEST_SERVE_ORIGIN` **already exists** in `app/api/inngest/route.ts`, with a comment describing this exact problem. **The mechanism was built and the variable was never set.** | ✅ |
| 0-P.1c | ⚠ SEVEN CRON FUNCTIONS are registered and have been firing against that preview deployment — `retention-sweep` (daily 03:00, permanently deletes client documents), `pipeline-watchdog` (15 min), `stalled-case-alarm` (hourly), `email-reminders` (daily 13:00), plus three sweeps | ✅ |
| 0-P.1d | Whether it auto-syncs every deploy or was synced once could NOT be determined from here. **Both are broken and both take the same fix.** If it does not auto-sync, a second failure waits: preview deployments are subject to retention, and when that one is removed every Inngest call 404s | 🔴 F to observe |

### 0-P.2 · What the crons have actually DONE — the founder's urgent question, answered

**NOTHING HAS BEEN DELETED, AND IT WAS STRUCTURALLY IMPOSSIBLE FOR IT TO BE.** Read-only queries
against the shared production database:

| probe | result |
|---|---|
| `uploaded_files` total | **3** |
| `uploaded_files` with a retention deletion stamp | **0** |
| files past `delete_after` and still live | **0** |
| earliest `delete_after` on any file | **2027-06-20** — twenty-two months away |
| `email_log` `retention_warning` rows | **0** |
| dormant-notice rows | **0** |
| `audit_log` retention rows | **0** |

Phase 2 only deletes a file whose `delete_after` **has passed**. Nothing qualifies until **June
2027**. Even with `RETENTION_SWEEP_ENABLED=1` set in both scopes, the sweep had nothing to act on.

**What the crons DID do, four days of it:** 4 `admin_alert` emails **to the founder**, and 108
`audit_log` rows from `stalled-case-alarm` recording `stalled_alert: true` / `hours_overdue` against
long-waiting cases. Those rows carry an **empty `old_value`** — they are AUDIT-ONLY, which is why
`cases.updated_at` still maxes at 2026-08-21 while the audit log runs to today. The one `welcome`
email was a real signup, not a cron.

**Zero client emails. Zero deletions. Zero case mutations.** The crons ran from the wrong runtime and
did nothing harmful — by luck of the calendar, not by design.

### 0-P.3 · Which build has been executing cases — and why the sync history cannot change the answer

The founder asked for the Inngest sync history, correctly, as the only authoritative record of what
was registered when. **I have no Inngest API access and could not read it.** But the underlying
question is answered without it:

| probe | result |
|---|---|
| cases created ≥ 2026-08-22 | **0** |
| cases updated ≥ 2026-08-22 | **0** |
| cases delivered ≥ 2026-08-22 | **0** |
| MAX `created_at` across all cases | **2026-08-20 15:48** |
| MAX `delivered_at` | **2026-08-20 16:07** |

The verdict-absence and email guards landed **2026-08-22**. **No case has executed since 2026-08-20.**
So every case in the system predates those guards *by commit date*, whatever URL was registered —
the sync history cannot move that. And the engine code in the registered build is **byte-identical to
production `main`** (`lib/research`, `lib/inngest`, `lib/pdf`, `lib/verdict`, `lib/data` — zero diff;
last engine commit `cb88053`, 2026-08-24). **It does not predate this month's engine fixes.**

🟡 **Still worth reading** when the founder is in the dashboard: the sync history would show whether
the URL churns per deploy (0-P.1d). That is an observation, not a blocker.

### 0-P.4 · The fix — TWO independent defects, both required

The founder framed three options as alternatives; **two of them are both needed**, and they
confirmed the point.

| Defect | Fix |
|---|---|
| The URL is deployment-specific | `INNGEST_SERVE_ORIGIN` → a stable alias per environment |
| Production and staging share ONE Inngest environment | Separate Inngest **environments**, each with its own keys |

⚠ **VERIFIED AGAINST INNGEST'S LIVE DOCS, not memory** (the founder's instruction, and the right
call — my knowledge of their variable names was a year stale):

- `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` — **confirmed**. The signing key is what decides
  *which environment an app syncs into*.
- `INNGEST_ENV` — **confirmed** to exist; it names the Inngest environment to send/receive from,
  is auto-detected on some platforms and needs setting manually on others, and can be overridden by
  `env` in `new Inngest()`.
- **The Vercel Marketplace integration auto-creates a Branch Environment per Git branch**, sending
  the branch name and the preview URL to Inngest. **All Branch Environments share one Event Key and
  one Signing Key**, distinct from Production's.
- For a **custom** environment (e.g. "staging"), the documented route is exactly what is prescribed
  below: add `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY` scoped to that Vercel environment only.

**This also confirms the integration is NOT installed** — if it were, staging deploys would have
landed in a `staging` Branch Environment instead of overwriting Production's serve URL.

**Env vars to set — Vercel → hyprriq → Settings → Environment Variables. Four entries, four
DISTINCT values:**

| Variable | Scope | Value |
|---|---|---|
| `INNGEST_SERVE_ORIGIN` | **Production only** | `https://hyprriq.com` |
| `INNGEST_SERVE_ORIGIN` | **Preview only** | `https://hyprriq-git-staging-hyprrx-hyprriq.vercel.app` |
| `INNGEST_EVENT_KEY` | **Production only** | Event Key from Inngest's **Production** environment |
| `INNGEST_SIGNING_KEY` | **Production only** | Signing Key from Inngest's **Production** environment |
| `INNGEST_EVENT_KEY` | **Preview only** | Event Key from a **new custom Inngest environment** ("staging") |
| `INNGEST_SIGNING_KEY` | **Preview only** | Signing Key from that same environment |

⚠ The Preview scope covers **every** branch's previews, not just staging — a PR branch will register
the staging alias and staging will serve it. Acceptable today. If per-PR isolation is ever wanted,
install the Marketplace integration and branch environments arrive automatically.

### 0-P.5 · Switchover — nothing is lost, but the crons must be handled DURING it

**▶ THE STEP-BY-STEP IS `docs/runbooks/RUNBOOK_INNGEST_ENVIRONMENT_SPLIT.md`** (written 2026-08-25,
founder executes). It carries the dashboard paths, the six variables with scopes, the redeploy order,
the exact serve URL to expect after each, and the failure signatures.

⚠ **AND IT CORRECTS ONE THING THE FOUNDER RULED ON MY FRAMING.** I said a stale app would keep seven
cron triggers alive and that it must be archived as part of the switch. Inngest identifies an app by
its app ID (`"hyprriq"`) **within an environment** — so there is almost certainly only ONE app, and
**the production redeploy corrects its serve URL in place with nothing to archive.** The runbook
therefore CHECKS the Apps page rather than assuming a duplicate, and archives only if one is there.
The archive action is real and is the right tool if it is needed (it archives every function on the
app, stopping new runs) — the error was assuming it would be.



**No in-flight case exists.** Verified, not assumed: `awaiting_review` 19 (a human wait, not a live
run), `delivered` 14, `manual_override_required` 8, `research_failed` 3, `submission_failed` 1.
**Nothing is running.** The window is clean.

1. Set the six variables above.
2. Redeploy **production**; confirm Inngest's Production environment shows `https://hyprriq.com/api/inngest`.
3. Redeploy **staging**; confirm the staging environment shows the branch alias.
4. ⚠ **ARCHIVE THE OLD REGISTRATION AS PART OF THIS, NOT AFTER** (founder-ruled). The old app keeps
   its **seven cron triggers** pointed at the old URL. Left alive, `retention-sweep` can fire twice
   daily, from a stale build, against shared production data — and after June 2027 it would have
   something to delete.
5. Submit nothing during the window: an event sent with the old key lands in the old environment.

### 0-P.6 · Deployment protection is off entirely — same root cause as the prototype exposure

Verified: `passwordProtection` false, `ssoProtection` false, `trustedIps` false. The founder is right
that this is the same class as §0-M — **the default posture is "reachable", and nothing was ever
deliberately opened.**

**What turning it on would break, and the founder's suspicion is correct:** Vercel Authentication on
**Preview** blocks every external caller that must reach a preview deployment — Inngest (which is why
it works today), plus any Stripe/Clerk/Resend webhook pointed at staging. On **Production** it would
break the live site outright; never enable it there.

**The out, verified against Vercel's live docs:** **Protection Bypass for Automation**. Vercel injects
the secret as `VERCEL_AUTOMATION_BYPASS_SECRET`, and a caller presents it as the
`x-vercel-protection-bypass` header, or as a **query parameter** when the tool cannot set headers —
which is the documented route for third-party webhooks. It covers Password Protection, Vercel
Authentication and Trusted IPs.

### 0-P.7 · What actually points at staging — the enumeration, 2026-08-25

Read from the route table, not recalled. `app/api/**` has **one** inbound third-party webhook.

| caller | endpoint | breaks? | the route |
|---|---|---|---|
| **Inngest** (staging env) | `/api/inngest` | **YES** | ⚠ No clean bypass. Inngest posts to `<serveOrigin>/api/inngest`; there is nowhere to attach a header, and putting the secret in the path would break signature/path matching. **Realistically: enabling Preview protection stops staging's Inngest.** |
| **Stripe** (test mode) | `/api/webhooks/stripe` | **YES, if an endpoint is configured against the staging alias** | **Query parameter** — Stripe cannot set custom headers. Append `?x-vercel-protection-bypass=<VERCEL_AUTOMATION_BYPASS_SECRET>` to the endpoint URL in the Stripe test dashboard. |
| Uptime / monitoring | `/api/health` | YES if any exists | Header `x-vercel-protection-bypass`, or query parameter |
| **Clerk** | — | **NO** | ⚠ **There is NO Clerk webhook in this codebase** — `app/api/webhooks/` contains `stripe` only, and nothing uses svix. Clerk runs in the browser; a protected preview blocks the *person* before Clerk loads, which is the intended effect. |
| **Resend** | — | **NO** | Outbound only. No inbound handler exists. |

**JUDGEMENT, offered not taken:** the protection this would add to Preview is thin. Every app route is
already Clerk-gated, the marketing pages are public by design, `SEARCH_INDEXING_ENABLED=false` puts
`noindex` site-wide, and the one thing that was genuinely exposed — `public/prototype/**` — is
deleted. The cost is that staging's Inngest stops, with no clean bypass. **A defensible answer is to
leave Preview unprotected and treat Clerk as the control it already is.** The founder decides.

🔴 **F — ORDER MATTERS AND THE FOUNDER HAD IT RIGHT: separate the environments FIRST.** While
production execution depends on a preview deployment being reachable, enabling protection on Preview
takes production down. Once the environments are split, the only thing that breaks is *staging's own*
Inngest — which is then a contained, testable problem with a documented bypass.

---

## 0-O. RESPONSIVE AUDIT — PORTAL AND ADMIN — 2026-08-25 (measured, not surveyed)

**Owner: UX. AUDIT ONLY — one functional bug fixed, nothing else.** Founder ruling: audit before
fixing, because every time this project has fixed before measuring it fixed the wrong thing.

### 0-O.1 · METHOD, and why it had to change twice

The portal and admin routes are auth-gated, so they cannot be driven in a browser without a session.
The first instrument was a static scanner over the source. **It produced three different answers to
the same question**, and each correction is worth recording because each is a way a layout audit
lies:

1. it read the grid's own class string and reported `components/portal/case-table.tsx` as broken —
   but that component's gate is on the WRAPPER (`hidden … md:block`) with a `md:hidden` card list
   behind it. **A correctly-built component was reported as a defect.**
2. its backward scan for that wrapper stopped at the `return (` of an inner `.map` callback, so it
   missed wrappers more than a few lines up.
3. it skipped `/admin/support` entirely, because that file keeps the word `grid` INSIDE its `COLS`
   constant, so the className string never contains it. **The single worst grid in the codebase was
   invisible to three passes of its own detector.**

At that point the scanner had earned no trust, so the numbers below come from **a real browser**: a
temporary dev-only route rendering the real markup, loaded in **same-origin iframes of exact width**
so `sm:`/`md:`/`lg:` resolve exactly as they would on a device. Every figure is
`getBoundingClientRect`, `scrollWidth` or `document.elementFromPoint`. The instrument was deleted and
`git status` verified clean before this entry was written.

**Content box, measured from the shells** — this is what a row actually gets:

| viewport | admin | portal | note |
|---|---|---|---|
| 360px | 328px | 328px | |
| 390px | 358px | 358px | |
| 768px | 720px | 712px | |
| **1024px** | **728px** | **720px** | ⚠ **CORRECTED 2026-08-25 — see 0-O.6.** 1024 is NOT narrower than 768; it is 8px WIDER. The sidebar becomes a static 248px column at `lg` and eats 248 of the 256 extra pixels, so crossing the breakpoint gains almost nothing. The real gap is against 1280px, which hands you 984px — **256px more than a real 1024 laptop.** |

### 0-O.2 · THE FUNCTIONAL BUG — diagnosed, fixed, verified

Case links on `/admin/cases` did nothing when tapped. **It was none of the four candidates.**

| what it looked like | what it was |
|---|---|
| tap target too small | the link is 62×23px — under 44px, but irrelevant here |
| an overlay intercepting | nothing overlays it |
| a hydration failure | it hydrates; it is a real `<Link>` in the DOM |
| not rendering as a link at that breakpoint | it renders, correctly, as a link |

**MEASURED at 360px:** the row grid demands **604px** (528px fixed tracks + 60px gaps + 32px
padding) inside a **328px** box, the wrapper is `overflow-hidden`, and there is no scroll container
anywhere above it. The link had **0px of itself inside the clip**; `elementFromPoint` at its centre
returned **nothing at all**, because the centre sits **267px past the right edge of the viewport**.
At 390px it is still 0px visible, 237px past the edge.

**And the reason "doesn't work" was the right description rather than "too small": the case number
in that row is a `<span>`, not a link. There was NO REACHABLE LINK IN THE ROW AT ALL.**

Fixed with the pattern this codebase already had and admin never got — a `md:hidden` card list where
**the whole card is the link**, dense grid kept behind `hidden md:block`. Verified with the same hit
test that proved the bug: 360px → card 328×148px fully in viewport, `elementFromPoint` → the card
link, document overflow 0. Committed as `4798cdc`.

### 0-O.3 · THE FULL TABLE — route · width · issue · severity

**BROKEN = cannot be used · POOR = usable but bad · MINOR.** `+N` is measured overflow in px.

| route | 360 | 390 | 768 | 1024 | issue | severity |
|---|---|---|---|---|---|---|
| `/admin/support` | +374 | +344 | ok | ok | row grid needs 734px, `overflow-hidden`. **The row contains no `<Link>` at all** — nothing on this screen can be opened on a phone | **BROKEN** |
| `/admin/billing` | +320 | +290 | ok | ok | row grid 680px, `overflow-hidden`; the row's only link measured 0px visible, hit test returns nothing | **BROKEN** |
| `/admin/dashboard` (cases list) | +166 | +136 | ok | ok | row grid 526px, `overflow-hidden`; only link 0px visible | **BROKEN** |
| `/admin/cases` | — | — | ok | ok | **FIXED this sitting** (0-O.2) | ✅ |
| `/admin/users` | +196 | +166 | ok | ok | row grid 556px with **no wrapper at all** → the whole document scrolls sideways by **229px** at 360, 199px at 390. Content is reachable, so not BROKEN | POOR |
| `/admin/dashboard` (second list) | +62 | +32 | ok | ok | row grid 422px, `overflow-hidden`. Informational row with no action — **data is lost, not navigation** | POOR |
| `/admin/clients` | +2 | ok | ok | ok | row grid 362px. **The row IS a `<Link>`**, so it still navigates; the trailing column is clipped 17px at 360 | POOR |
| `/admin/brands` | squeeze | squeeze | ok | ok | 5-col `<table>`, no scroll container. No `whitespace-nowrap`, so cells wrap rather than overflow — ~65px per column | POOR |
| `/admin/outcomes` | squeeze | squeeze | ok | ok | **7-col** `<table>`, no scroll container — ~47px per column | POOR |
| `/admin/suppliers` | squeeze | squeeze | ok | ok | 4-col `<table>`, no scroll container | POOR |
| `/admin/revenue` | squeeze | squeeze | ok | ok | `<table>`, no scroll container | POOR |
| `/admin/clients/[id]/accounting` | squeeze | squeeze | ok | ok | **FOUR** `<table>`s, none with a scroll container | POOR |
| `/admin/cases/[id]/review` | squeeze | squeeze | ok | ok | 2 unwrapped `<table>`s + `attempt-history`'s; **16 controls under 44px, smallest 28px**; 33 paragraphs under 16px. The founder's second priority screen | POOR |
| `/admin/clients/[id]` | ok | ok | ok | ok | 4 controls under 44px (min 32px) | MINOR |
| `/admin/acquisition` | ok | ok | ok | ok | 5 controls under 44px (min 32px) | MINOR |
| `/admin/cases/run` | ok | ok | ok | ok | 2 controls under 44px (min 32px) | MINOR |
| `/admin/bulk`, `/admin/integrity`, `/admin/prompts`, `/admin/settings`, `/admin/design-system` | ok | ok | ok | ok | `design-system` has a `min-w-[640px]` block, but it is an internal specimen sheet | MINOR |
| **CLIENT SURFACES** | | | | | | |
| `/portal`, `/portal/dashboard`, `/portal/cases` | ok | ok | ok | ok | **No overflow at any width.** `case-table.tsx` already ships a `md:hidden` card list where the whole card is a link | ✅ |
| `/portal/cases/[id]` | ok | ok | ok | ok | report renders; `report-view` carries 4 controls under 44px (min 28px, the "Got it — hide this" dismiss) | POOR |
| `/portal/submit` | ok | ok | ok | ok | 6 controls under 44px — **all 40px**, so close; 17 paragraphs under 16px. **The surface a client spends a credit on** | POOR |
| `/portal/billing` | ok | ok | ok | ok | fixed grid needs only 294px — **measured to fit**; 4 controls under 44px (min 36px) | MINOR |
| `/portal/onboarding` | ok | ok | ok | ok | 2 controls under 44px (min 36px) | MINOR |
| `/portal/settings`, `/portal/support`, `/portal/cases/[id]/change` | ok | ok | ok | ok | 1–3 controls at 40px | MINOR |
| `/portal/guides`, `/portal/help` | ok | ok | ok | ok | clean | ✅ |
| `/sign-in`, `/sign-up`, `/unsubscribe` | ok | ok | ok | ok | `sign-up` has one 36px control; Clerk's own fields were fixed in sitting three | MINOR |

**Totals: 3 BROKEN, 10 POOR, the rest MINOR or clean. Every BROKEN one is admin. No client surface
has horizontal overflow at any of the four widths.**

Site-wide, computed from source: **84 interactive elements under 44px across 31 files** (smallest
24px), and **187 paragraphs under 16px across 49 files**. The 16px floor for FORM CONTROLS is
already locked (`mobile.lock.test.ts`, the iOS zoom bug); 44px targets and reading prose are not.

### 0-O.4 · THE SHAPE OF THE WORK

**Yes — the admin was built desktop-only and needs a responsive layer.** Saying it plainly, as asked.

But it is **not** five sittings of page-by-page work, and the reason is the good news in this audit:
**the correct pattern already exists in this repo and is already proven.**
`components/portal/case-table.tsx` renders a dense grid above `md` and a card list below it where
the whole card is a link. The portal got that in sitting three. Admin never did.

So the work is ONE PRIMITIVE plus application sites, not N designs:

| # | Work | Sitting |
|---|---|---|
| 1 | Extract `case-table.tsx`'s two-form pattern into a shared `<ListTable>` primitive: columns declared once, dense grid ≥md, card list <md, whole card the link. | 1 |
| 2 | Apply it to the 3 BROKEN admin lists (`/admin/support`, `/admin/billing`, `/admin/dashboard`) and the 3 POOR ones (`/admin/users`, `/admin/clients`, dashboard's second list). Six application sites, no new design decisions. | 1 |
| 3 | Wrap the 10 unwrapped `<table>`s — one `overflow-x-auto` container, applied as a class. `/admin/cases/[id]/review` first, per the narrowed ruling. | 1 (shared with 2) |
| 4 | Tap targets and reading sizes on CLIENT surfaces. Mechanical, and the smallest values are 36–40px rather than 24px. | ½ |
| 5 | The lock (0-O.5), so this cannot recur. | ½ |

**Honest estimate: two sittings after this one.** Not five, because nothing here needs a new layout
idea — it needs one component built once and used six times.

### 0-O.5 · HOW ADMIN GOT BUILT DESKTOP-ONLY, AND WHAT STOPS THE NEXT SCREEN

**How.** Three things compounding, and only the third is fixable:

1. **A ruling, applied wider than it was meant.** "Admin usable, not beautiful — operators work at a
   desk" was read as permission to skip mobile in admin. It was narrowed on 2026-08-25 to exclude the
   cases list and case detail; §0-K already recorded the same mis-reading once ("that meant do not
   restyle admin, not leave a shell that breaks on a phone").
2. **The shell fix looked like the whole fix.** Sitting three gave admin a mobile drawer, and the
   screens then LOADED on a phone. Loading is not working. The drawer made the failure quieter.
3. **⚠ AND THE REAL ONE: CROSSING 1024px BUYS EIGHT PIXELS.** ⚠ *This row was WRONG when first
   written — it said 1024 was NARROWER than 768. The lock's own arithmetic assertion caught it: 728
   is not less than 720. Corrected here rather than quietly edited, because the founder acted on the
   wrong version.* The sidebar is an off-canvas drawer below `lg` and a **static 248px column** at
   `lg` and above, so it eats 248 of the 256 pixels the viewport gains: **768 → 720px of content,
   1024 → 728px.** 1024 is effectively tablet-portrait width. The flattering width is **1280 → 984px,
   which is 256px more than a real 1024 laptop hands over.** The screens were not carelessly built;
   they were built and verified in a window that gives a third more room than the machine they were
   being built for.

**What stops the next screen shipping the same way.** Not a note, and not a review habit — the same
answer this project reaches every time: **a lock**, and this audit already contains its
implementation. The rule it encodes:

> A grid whose fixed tracks + gaps + padding exceed the 328px content box must either carry a
> breakpoint prefix, or its file must ship a `md:hidden` alternative form. A `<table>` must have an
> `overflow-x-auto` ancestor.

The scanner written for this audit computes exactly that and is wrapper-aware — including the three
blind spots it was caught by, which are the three a naive version would repeat. **It also has to
assert it finds the known offenders**, because a scanner that silently matches nothing is the failure
mode this project has already hit twice (the backspace regexes, standing rule 11).

🔴 **F — the lock is NOT built.** The founder's brief was audit only, and building it is item 5 above.

### 0-O.6 · THE 1024px STANDING NOTE — and a correction to this entry

**Founder ruling 2026-08-25: this becomes a standing note.** It is standing rule 13 in §8.

⚠ **AND THE FIRST VERSION OF IT WAS WRONG — THE FOUNDER ACTED ON IT.** I wrote "1024px is the
tightest width in the system". The founder did not merely read that: **they issued a ruling from it**
("THE 1024px FINDING goes in the tracker as a standing note … the sidebar makes 1024 the tightest
width in the system"), and standing rule 13 was drafted off the back of it. A wrong measurement
became a standing instruction inside one exchange. **It is not true.** The arithmetic:

| viewport | admin content | what happens |
|---|---|---|
| 360px | 328px | sidebar is an off-canvas drawer |
| 768px | 720px | still a drawer |
| **1024px** | **728px** | sidebar becomes a **static 248px column** — it eats 248 of the 256 pixels gained, so crossing `lg` buys **EIGHT PIXELS** |
| 1280px | 984px | the width everything was verified at |

So 1024 is **not** narrower than 768 — it is 8px wider, which is the same thing in practice.

**FOUNDER RULING 2026-08-25 ON WHICH HALF SURVIVES: the 1280 claim is the useful one, not the 1024
one.** "1024 is the tightest width" was wrong and is struck. "A 1280px window hands you 256px more
than a real 1024px laptop" is right, is the reason the console shipped desktop-only, and is what the
standing rule tests against. The correct statement:

> **Crossing the `lg` breakpoint gains nothing. 1024px is tablet-portrait width with a sidebar bolted
> on. A 1280px window hands you 256px MORE content than a real 1024px laptop — test at 1024.**

**How the error was caught matters more than the error.** It was not caught by re-reading; it was
caught by `responsive.lock.test.ts` asserting the relationship as arithmetic, which failed with
`expected 728 to be less than 720`. **A lock built before the fixes caught a mistake in the audit
that produced it** — which is exactly the argument the founder made for building it first.

### 0-O.7 · THE LOCK — BUILT FIRST, founder-ruled 2026-08-25

**Ruling: "if it ships last, the fixes are verified by the same eye that missed these. If it ships
first, every fix is verified by the lock as it lands."** So it shipped first.

| # | Piece | State |
|---|---|---|
| a | `lib/design/responsiveScan.ts` — ONE analyser, used by the lock AND by `scripts/responsive-audit.ts`. The standalone `.mjs` is deleted: it drifted from the lock's understanding three times in one sitting. | ✅ |
| b | Each of the scanner's three blind spots is named in its header with the case that caught it — wrapper gates, inner `.map` returns, and `COLS` constants. Those are the three a rewrite would reintroduce. | ✅ |
| c | **THE SELF-TEST THE FOUNDER REQUIRED.** Five assertions prove the scanner is looking at something: it finds grids at all; it resolves `/admin/support`'s constant-declared grid *including the gap and padding held in the constant*; it sees `case-table.tsx`'s wrapper gate above an inner `.map` return **and does not report that correct component as an offender**; it still finds every measured offender; and it names the three BROKEN routes explicitly. | ✅ |
| d | **THE LIST CAN ONLY SHRINK.** `KNOWN_OFFENDERS` pairs with a staleness test: fix one and the lock FAILS until its row is deleted. The list cannot describe a world that no longer exists, and the scanner cannot go blind without saying so. | ✅ |
| e | 44px tap-target floor on **client surfaces** — same scope discipline as the 16px form floor. 36 controls currently listed. Inline links are exempt and fall out for free: only elements with an explicit size class are measured. | ✅ |
| f | `<table>` must have a horizontal scroll container. 7 files listed. | ✅ |
| g | Client surfaces are held to **zero overflow at all four widths**, with no allowlist — the bar that does not bend. | ✅ locked |

**16 assertions, all passing against the current broken state**, because the breakage is recorded
rather than tolerated silently.

---

## 0-N. SITTING FIVE — SPEC GRAPHICS, THREE PAGE GRAPHICS, AND WHAT PRODUCTION DOES DIFFERENTLY — 2026-08-25

**Owner: UX.** Parts 1 and 3 of the founder's sitting-five brief. Part 2 is answered below, honestly,
including the half of it a Windows build cannot prove.

### 0-N.1 · The homepage gets its spec graphics back

| # | Item | State |
|---|---|---|
| a | The six capability line-art marks, restored from the spec. The first build had reduced them to a coloured dot. Drawn in `currentColor`, so the tint/ink pair is the only thing carrying colour. | ✅ |
| b | **Subgrid baselines, in both places.** Six capability cards and three walkthrough steps were independent stacks that only LOOKED aligned while the copy happened to be the same length. MEASURED: all six h3 tops on one pixel, all six bodies on one pixel, all three panel tops on one pixel. | ✅ |
| c | Progress ring — **geometry computed, not copied.** The spec's `188.5`/`113.1` are 2π·30 and that circumference times three-fifths; correct only while there are five areas and two are done. Derived from `ASSESSMENT_AREA_KEYS`; the lock proves the derived form still reproduces the spec's numbers today. | ✅ locked |
| d | State markers — filled / pulsing / hollow. The pulse REUSES `.hq-pulse-dot`, the existing named motion, so it is already covered by the reduced-motion block. | ✅ |
| e | The flow visual — every line of copy inside it is a grey bar; the only real words are the verdict name and the turnaround, both read from constants, warm pair from `VERDICT_PALETTE`. | ✅ |
| f | **BOTH WARM HUES CHANGED — founder-ruled 2026-08-25, and the ruling corrected my reasoning as well as the code.** I applied the ORIGINAL wide rule; the narrowed rule is "reserved on client-facing report surfaces and anywhere a verdict is depicted". On these two the narrow rule reaches the same answer by a better argument. | ✅ |
| f1 | **"Researching" marker → blue.** The decisive fact is not that warm appears on a marketing page — it is that **THIS CARD ALSO SHOWS "Verify Before Purchase" in the same amber-orange family, a few rows below.** Two meanings for one hue on one card is precisely what the rule exists to prevent. It now takes the blue already on that card for the SLA countdown. MEASURED: `--blue` on `--blue-tint` = 4.58:1, and the pair joined `CONTRAST_CONTRACTS` so the lock recomputes it. | ✅ |
| f2 | **Account-risk mark → neutral ink on subtle.** Same reasoning one step removed: the strip sits on a page that teaches the verdict scale. It is the ONE neutral mark deliberately, and that is a design argument rather than a colour dodge — the other five are SUBJECTS WE RESEARCH; account risk is the CONSEQUENCE they feed into. A sixth accent would have said "sixth subject", and there is no cool accent left that is not already carrying one of the five. MEASURED: `--ink` on `--subtle` = 15.69:1. | ✅ |
| f3 | 🔴 **F — ONE MORE OF THE SAME SHAPE, RAISED NOT CHANGED.** The homepage's `1 · The problem` section kicker is `text-verify-ink`, and the actual "Verify Before Purchase" verdict card sits further down the same page. By the f1 argument that is two meanings for one hue on one page. It was not in the founder's two-item ruling and the narrowed rule stands everywhere else, so it is raised rather than swept. *(The chain's final step keeping a verdict-adjacent tint is NOT this — the visual plan calls for it explicitly.)* | 🔴 F |
| g | **The 9.5px verdict text in the flow visual STAYS — founder-ruled 2026-08-25.** It is not a control, the graphic carries an `aria-label` stating the same thing in words, and the stacked mobile form covers the small screen. **Nothing is available only at that size** — that clause is the whole test, and the code now says so, so a later session does not enlarge it "for accessibility" and gain nothing. | ✅ |

### 0-N.2 · The three page graphics

| # | Item | State |
|---|---|---|
| a | **The masked invoice** → `/what-we-check`, under Documentation Review. | ✅ |
| b | ⚠ **"A fourteen-point read" had NO LIST BEHIND IT.** The phrase appeared in three places and nothing could tell you whether it was still true. `lib/content/documentFields.ts` now holds all fourteen — six pinned, eight listed — the graphic enumerates every one, and the lock counts them. A word in a paragraph became a checkable claim. | ✅ |
| c | Every callout says what is CHECKED, never that a field is wrong. Pin 6 carries **escalate, do not accuse** verbatim; the lock refuses twelve accusatory words outright. Pins are `--action`, never a verdict hue. | ✅ locked |
| d | **The boundary** → `/method`. Both columns DERIVED — left one line per assessment area, right from the four limits /method publishes. `CANNOT` moved out of the page into `lib/content/methodBoundary.ts`; it was about to exist twice. Cool accents both sides: the right column is a boundary, not a warning. | ✅ |
| e | **The verdict ladder** → `/how-to-read`, replacing four equal cards. Rungs widen with the level, so the shape carries the ranking. MEASURED 677/741/804/868 units with the four registry tints in scale order. Certainty chips stay in neutral ink. | ✅ |
| f | **Rule 5 of the visual plan is the one that would have been skipped.** All three are 900-unit viewBoxes; at 360px their text renders at about 5px. Each ships TWO FORMS FROM ONE SOURCE — drawn above `md`, stacked below. The lock fails any graphic that has only the drawn one. MEASURED at 360px: drawn form `display:none` on all three, all fourteen invoice fields readable as real text, zero horizontal overflow. | ✅ locked |
| g | **THE SPEC'S FIFTH BOUNDARY ITEM IS CUT — founder-ruled 2026-08-25.** "Where the stock came from before your supplier" would have been a new refusal written into product copy, and there are enough already. **The rule this fixes in place:** if a fifth is ever wanted it is added to `CANNOT` FIRST, as prose the site stands behind, and the graphic picks it up on its own. Never the other way round — **a graphic is not where a product claim debuts.** | ✅ |
| h | The banned-language scanner flagged a line of MY new copy ("whether an invoice will be accepted") as an outcome prediction, and it was right — the banned construction is "&lt;document&gt; will be accepted" and the rule cannot tell a question from an assertion. Rewritten to name whose decision it is. **This was new copy, not closed founder copy** — the rule against editing closed copy to satisfy a gate still stands. | ✅ |

### 0-N.3 · Part 2 — the PDF renderer on production infrastructure, without running a case

Verified by reading the **build trace**, `.next/server/app/api/inngest/route.js.nft.json`, which is the
actual manifest of what ships in the serverless bundle — not by inspecting source and hoping.

| # | Check | Result |
|---|---|---|
| a | `launchBrowser()` takes the `@sparticuz/chromium` branch when `process.env.VERCEL` is set — a **different browser binary from the one any local run uses**. "It works locally" says nothing about this path. | ✅ by design |
| b | All four Chromium brotli payloads are traced into `/api/inngest`: `chromium.br`, `al2023.tar.br`, `fonts.tar.br`, `swiftshader.tar.br`. | ✅ present |
| c | `@napi-rs/canvas` is traced (the `DOMMatrix` failure layer from 2026-08-20). | ✅ present |
| d | `maxDuration = 300` on the Inngest route, far above the platform default a cold Chromium boot would blow through. | ✅ |
| e | `@sparticuz/chromium` ^149 with `puppeteer-core` ^25 — a compatible pairing, and Vercel's runtime is Amazon Linux 2023 (glibc), which is what `-linux-x64-gnu` targets. | ✅ |
| f | ⚠ **THE ONE THING A WINDOWS BUILD CANNOT PROVE.** The platform binary traced here is `@napi-rs/canvas-win32-x64-msvc`, because this build ran on Windows. On Vercel's Linux builder npm installs `-linux-x64-gnu` instead. `next.config.ts` covers it at BOTH hoisting locations and the local trace proves the include MECHANISM resolves — but the Linux artefact itself has not been seen in a bundle. | ⚠ unproven |
| g | 🔴 **And no case has run through the path since.** All three previously measured failure layers (ENOENT on fonts, missing Chromium bin, DOMMatrix) were found by RUNNING real renders. A static trace cannot find a fourth. The cheapest close is one render on production infrastructure — the founder's call, since it spends budget. | 🔴 F |

### 0-N.4 · WHAT PRODUCTION DOES DIFFERENTLY FROM STAGING — the founder's closing question

Measured against the Vercel deployment list, not recalled. **Staging deploys carry `target: null` —
they are PREVIEW deployments, so `VERCEL_ENV === "preview"` there and `"production"` only on `main`.
Every gate written as `VERCEL_ENV === "production"` is therefore OFF on staging by construction.**
That is the exact shape of the console-switcher bug (§0-K) and it will be the shape of the next one.

| # | What differs | Why it matters |
|---|---|---|
| a | 🔴 **The `/prototype` gate is NOT on production.** Live production is `553f917`; the gate landed on `staging` at `d71651e`. **The files are still answering 200 on hyprriq.com as this is written.** | 🔴 F — merging to `main` stops at the founder |
| b | **Supabase is SHARED between the two.** Staging is not an isolated environment — a staging write lands in the same database production reads. Anything that looks like a safe rehearsal on staging is not one. | the most under-appreciated item here |
| c | **Clerk runs a different instance per environment.** Production is bound to the apex domain; the branch alias is not. Sessions do not cross, and a development identity is a different `sub` — which is why the founder holds two `super_admin` rows under one email (§0-K). | auth behaviour genuinely differs |
| d | **Stripe: a live key is REFUSED outside Vercel Production** by `envGuard`, deliberately using `VERCEL_ENV` and never `NODE_ENV` (which reads "production" on previews too). Staging is structurally test-mode-only. | condition 2 of the domain move holds by construction, not by discipline |
| e | **`INNGEST_SERVE_ORIGIN` is set per environment**, and it decides which deployment URL Inngest calls back. If production's value is unset or still points at the staging branch alias, a production case would be executed by staging's code. **Cannot be read from here — the founder should check both environments' value.** | 🔴 F — highest-risk unknown on this list |
| f | **The PDF renderer uses a different browser on Vercel than anywhere else** (0-N.3a). | a local render proves nothing about the deployed one |
| g | Sentry tags `environment` from `VERCEL_ENV`, so preview and production errors are separated. | reporting only, not behaviour |
| h | `SEARCH_INDEXING_ENABLED` is a CODE constant, currently `false` in both. No difference today — it becomes one the moment anyone makes it env-driven, which the lock does not prevent. | worth knowing before flipping it |

---

## 0-M. A PUBLIC DIRECTORY NOBODY MEANT TO PUBLISH — 2026-08-24 (design sitting five)

**Owner: UX. Found by the sweep the founder ordered after ruling on the retired sample module.**

| # | Item | State |
|---|---|---|
| 0-M.1 | `lib/content/sample-report.ts` DELETED — unreferenced, tracked, and carrying real company names lifted unmasked from a delivered case. It rendered nowhere, so no client saw it. | ✅ |
| 0-M.2 | ⚠ **THE NAMES REMAIN IN GIT HISTORY.** Founder-ruled not worth rewriting history over. Recorded here so a future reader does not assume deletion cleaned the repo. | ✅ recorded |
| 0-M.3 | **`public/prototype/**` WAS ANSWERING 200 TO THE OPEN INTERNET** on the live domain — internal admin mockups, client report mockups, the design-system reference, with company names and a real case ID across them. MEASURED on hyprriq.com, not inferred. | ✅ gated |
| 0-M.4 | Cause: the middleware matcher deliberately skips extensioned paths, so **no `.html` under `public/` ever reached Clerk**. The same skip list that hid `/robots.txt` behind auth by omitting `.txt` was, by including `.html`, exposing these. One list, two opposite defects. | ✅ |
| 0-M.5 | Fix: an explicit `"/prototype/:path*"` matcher entry. Runs middleware for those paths regardless of extension; changes no other static file's handling; deletes nothing. Measured after: `/prototype/*` → 307, `/`, `/pricing`, `/robots.txt`, `/sitemap.xml` → 200. Locked. | ✅ |
| 0-M.6 | **DELETED, not gated — founder-ruled 2026-08-25.** All 59 files, 957 KB, gone from the repo. **The ruling's reasoning is the part worth keeping: gated means ONE MATCHER EDIT FROM PUBLIC AGAIN, and that matcher has now failed twice IN OPPOSITE DIRECTIONS** — hiding `/robots.txt` behind auth by omitting `.txt`, and exposing `/prototype` by including `.html`. A control that has been wrong in both directions is not one to lean a data-exposure risk on. **Deletion removes the class; gating only manages it.** | ✅ |
| 0-M.6a | Confirmed before deleting: nothing renders or links them. The only live source pointer was a comment in `report-view.tsx` naming the prototype it was built from — updated to say the file is gone and where. Handover docs keep their references: they are historical records of what was true then. The email previews under it are REGENERABLE from `scripts/email-preview.ts` and were not a loss. | ✅ |
| 0-M.6b | ⚠ **THE NAMES REMAIN IN GIT HISTORY** at `c1b57ec~1`. The deletion cleans the DEPLOY, not the REPO. Recorded so nobody reads "deleted" as "gone". | ✅ recorded |
| 0-M.6c | The lock now asserts `public/prototype` **DOES NOT EXIST**, and separately keeps the matcher entry — belt and braces. Deletion is the control; the matcher is only what shortens the interval between a careless re-add and someone noticing. | ✅ locked |
| 0-M.7 | **MERGED TO `main` AND VERIFIED LIVE, 2026-08-25.** Cherry-picked as `c1b57ec` — the gate alone, no unreviewed design work riding with it. MEASURED on hyprriq.com after the deploy: all four previously-200 paths now answer **404**, while `/`, `/pricing`, `/what-we-check`, `/robots.txt` and `/sitemap.xml` all stay 200. | ✅ |
| 0-M.7a | ⚠ **PRODUCTION ANSWERS 404 WHERE LOCAL ANSWERED 307.** Same gate, different response shape — noted so a future smoke test written against the local 307 does not read the live 404 as a different bug. Neither serves the file, which is the property that matters. | ✅ recorded |

**THE LESSON, and the reason the founder ordered the sweep.** Last sitting I argued the retired
module was safe to leave *because it was unreferenced*. Unreferenced said nothing about what was
inside it, and — as 0-M.3 shows — nothing about whether it was reachable either. **"Nothing links
to it" is not a security property. A URL does not need a link.**

---

## 0-L. THE DOMAIN MOVE — EXECUTED 2026-08-24 (sitting four)

> `main` fast-forwarded from `c9f1934` (the empty Create-Next-App commit) to `c077ab7`.
> **660 commits. hyprriq.com is live.** Phase 2 ran BEFORE the merge on the founder's revision —
> Clerk production instance (DNS 5/5, SSL issued), Resend DKIM, and DNS were all propagating first,
> so the merge landed on a domain that was already resolving.

**VERIFIED ON THE LIVE DOMAIN (automated half):**

| Check | Result |
|---|---|
| Condition 1 — site-wide noindex | `<meta name="robots" content="noindex, nofollow">` ✅ |
| Condition 3 — legal effective date | "August 24, 2026" rendering on /terms ✅ |
| `/terms` + `/privacy` (Stripe points here — permanent) | 200 / 200 ✅ |
| All 13 launch routes + `/how-to-read` | 200 ✅ |
| The 6 legal pages | 200 ✅ |
| `/robots.txt` + `/sitemap.xml` — **the Phase 0 defect** | 200, permissive `Allow: /` ✅ |
| `/portal/*`, `/admin/*` gating | 307 → /sign-in ✅ |
| `/grant/<invalid>` | 307 → `/partners?invite=inactive` ✅ |

> **ONE MEASUREMENT ARTEFACT WORTH RECORDING:** a bare `curl` of `/portal/dashboard` returns **404**,
> not a redirect. That is CORRECT — Clerk's `auth.protect()` answers 404 for non-document requests,
> and curl sends no document `Accept` header. With `Accept: text/html` it 307s properly. A future
> smoke test that curls the portal and sees 404 has NOT found a bug.

> **STILL TO WALK — needs hands, not HTTP:** sign-up on a phone against the production Clerk
> instance · the grant invite cross-device path (create a grant, open on a phone, register on a
> laptop) · a test-mode purchase → webhook → credits · submit → Inngest → PDF render · the delivery
> email → portal link · `/admin/integrity` showing the `AWI-2607-022` finding (**green would mean
> the check is not running**) · admin on a phone.

> **NOTED, NOT A BLOCKER:** one Supabase project serves both environments, so a staging bug can
> write production data. Worth a proper split before real clients.

---

## 0-K. PORTAL AND ADMIN ON MOBILE — 2026-08-24 (design sitting three)

> **THE PREMISE WAS INVERTED, AND THE FOUNDER RECORDED IT AS SUCH.** "The portal does not load on
> mobile" was carried from an old backlog note and never verified. Measured this sitting: the
> portal loads, is responsive, and has had a working mobile drawer since the 1.4 build. **Admin was
> the shell with no mobile mode at all.**

**The 5a diagnosis, measured not read:**

| Check | Result |
|---|---|
| `/portal/*` routing | 302 → `/sign-in?redirect_url=…` → 200. No loop, no crash |
| `/grant/[code]` | invalid code correctly lands on `/partners?invite=inactive` |
| Viewport meta | Next sets it automatically — not a factor |
| `/sign-in`, `/sign-up`, `/partners` @360/390 | zero overflow, Clerk mounts |
| **Real `ReportView`, real data (AWI-2608-037) @360/390/430** | **zero horizontal overflow at all three** |
| `<table>` in portal | none — the portal is card/list based |
| Fixed widths in portal | 3, all bounded (`max-w-[84vw]`, `max-w-[1200px]`, a flexible `min-w-[120px]`) |
| **`components/admin/admin-shell.tsx:121`** | **fixed `w-[248px]` sidebar, no responsive prefix, no drawer, no hamburger** |

| # | Item | State |
|---|---|---|
| **K1** | **THE MOBILE FLOOR.** 36 client form controls raised to 16px with 44px height. iOS Safari zooms the page when a focused input is under 16px AND DOES NOT ZOOM BACK — every portal field was 14px, including the submit form. **This is very likely the origin of the original note: the portal loads, and the first tap on a field breaks the viewport.** Locked | ✅ SHIPPED |
| **K2** | **THE `text-base` COLLISION — RENAMED (ruling 1, option a).** `--color-base` → `--color-canvas`; 132 call sites moved. MEASURED: `text-base` on an element inheriting 11px now yields **16px** with colour still inherited. A new lock fails any colour token named after a Tailwind size utility | ✅ SHIPPED |
| **K3** | **ADMIN GETS THE SHARED DRAWER.** `shell-chrome.tsx` moves to `components/app/`; admin renders through the same chrome as the portal and keeps its dense full-width content via a new `contentClassName`. Ruling 5d respected — nothing restyled | ✅ SHIPPED |
| **K4** | **Grid stacking**, judged per grid: three stack (labelled stat trio, paired fields, City/State/ZIP), two keep their columns (short-label tiles, comfortable at ~160px) | ✅ SHIPPED |
| **K5** | **`/partners` items 6 and 7** — "Request access" reaches 44px; the form and banner button move off the pre-ruling `rounded-lg bg-ink`. Banner COPY and its grant re-check are untouched | ✅ SHIPPED |
| **K6** | **RULING 3, my call:** the dashboard greeting drops from 24px to the 16px section rung (it duplicated the page title directly above it) and the 👋 is removed — it read consumer-app on the surface where a client is about to read a verdict about someone's business | ✅ SHIPPED |

> **5f — THE PDF IS NOT LEGIBLE ON A PHONE.** `@page{size:letter}` (8.5in) with 10pt body
> (`lib/pdf/reportTemplate.ts:242,247`). On a 390px screen that scales to ~46%, rendering 10pt at
> roughly 4.6pt effective. It requires pinch-zoom. NOT redesigned, per the ruling — reported only.
> This matters because a PDF opened on a phone is the most common way a client will read a report.

> **STILL OPEN — the portal's reading sizes.** The portal carries 105 × 13px, 94 × 14px, 82 ×
> `text-sm`, 44 × 12px. The FORM CONTROLS are fixed (K1), which was the functional half. The
> READING half — body prose in the report view and case detail — is not, and it is deliberately not
> a find-and-replace: ruling 4 fixes the ladder at 24 → 16 → 13, so promoting every 13px to 16px
> would collapse meta into the section rung and destroy the ladder. It needs a semantic prose class
> applied to the ~30 body-copy usages in `report-view.tsx`, not a sweep of 380.

---

## 0-J. APP SHELL ALIGNMENT + A CASCADE BUG — 2026-08-24 (portal/admin, dev lane)

> Portal and admin only. No marketing file touched — the UI/UX thread owns those.
>
> **① THE CASCADE BUG (root cause of the 60px headings).** The ruled type scale in
> `app/globals.css` sat **UNLAYERED**. Tailwind v4 imports as `@layer theme, base, components,
> utilities`, and in the CSS cascade an unlayered style beats EVERY layered style regardless of
> specificity — so `h1 { font-size: clamp(40px,4.8vw,60px) }` overrode every `text-*` utility in
> the product. The block's own comment asserted the opposite ("any Tailwind text-* utility still
> wins… the ~40 portal and admin headings keep their size"); that false assertion is what cost us
> this. Fixed by wrapping the block in `@layer base` (that wrap is now marked load-bearing) and
> rewriting the comment. **Measured before → after at 1280px:** admin title 60→18px · portal
> title 60→20px · `/sign-in` "Welcome back" 60→30px · `h2.text-2xl` 46→24px · **marketing h1
> 60→60px, unchanged** — marketing keeps the ruled scale because those pages write no utility.
>
> **THE OTHER TWO UNLAYERED RULES IN `globals.css` — FOUNDER-RULED 2026-08-24: LEAVE BOTH.**
> Flagged is enough; they were deliberately NOT swept in this sitting. They are not the same thing
> as each other, and the difference is the point:
>
> - `p { text-wrap: pretty }` — **latent, cosmetic, low blast radius.** Unlayered, so it would beat
>   a `text-pretty`/`text-balance` utility on a paragraph. Nobody has hit it. Stays flagged; fix it
>   only if it actually bites.
>
> - ⛔ `:where(a, button, input, textarea, select, summary, [tabindex]):focus-visible { outline: … }`
>   — **DO NOT "FIX" THIS. Unlayered is CORRECT here, not a latent bug.** It is the WCAG 2.1 AA
>   focus indicator (1.4.11), and being unlayered is exactly what makes it *unremovable by an
>   accidental utility*: a `focus-visible:outline-none` sitting in `@layer utilities` loses to it.
>   Wrapping it in `@layer base` — the obvious move for anyone repeating the cascade audit that
>   found ① — would make the focus ring **overridable**, and would silently weaken an accessibility
>   control to make a stylesheet look tidy. The `:where()` keeps its specificity at 0 so a
>   deliberate, specific override is still possible; the layer position is what stops a careless
>   one. **If a future sweep proposes layering this rule, that sweep is wrong.**
>
> **② ONE SHARED APP HEADER** — `components/app/app-header.tsx`, rendered by both shells. The bars
> had disagreed on every value (64 vs 56px, sticky vs not, bg-base vs bg-surface, text-xl vs
> text-lg). `APP_SHELL_TOP = 64` is **the one value**: it drives the header height AND the sidebar
> brand block, so nav-under-brand and content-under-header both begin at 64px — that is the shared
> top baseline. Title 24px serif (bottom of the ruled 24–28px app range). `ShellChrome` now takes
> `title` + `actions` instead of one pre-built `header` node.
>
> **③ THE FIVE `text-base` HEADINGS** — fixed to the 16px their authors intended. Admin's two
> ("Case Queue", "Support Queue") had been rendering at **46px**, nearly twice the page title.
>
> ---
>
> ### ⚠ HANDED TO THE UI/UX THREAD — THE `text-base` TOKEN COLLISION (founder-ruled: their call)
>
> **The trap:** the palette defines a `base` colour token, so Tailwind emits
> `.text-base { color: var(--color-base) }`, which **shadows Tailwind's default 16px font-size
> utility**. Anyone writing `text-base` expecting 16px silently gets a colour change and whatever
> size the element inherits. It has already caught five headings and it is invisible at write
> time — the line looks correct.
>
> **Two options; founder's lean is (a):**
> - **(a) RENAME THE COLOUR TOKEN** so `text-base` means 16px again, as every developer and every
>   piece of Tailwind documentation assumes. A rename across the codebase.
> - **(b) KEEP THE TOKEN AND ADD A LOCK** that fails the build when `text-base` is used as a size.
>
> Founder's reasoning for (a): option (b) makes a correct-looking line fail, which is confusing;
> (a) makes the system behave the way everyone already assumes it does.
>
> ⛔ **It must be a rename or a lock — NOT a note.** A trap that is invisible at write time will
> keep catching people. This entry is the hand-off, not the fix.
>
> **Scope note for whoever takes it:** `.text-base` is currently used as a COLOUR in some places
> and mistakenly as a SIZE in others; a rename must distinguish the two, and every heading using
> it as a size has already been corrected (grep for `<h[1-6][^>]*text-base` returns nothing today).

---

## 0-I. THE MARKETING SITE — 2026-08-24 (design sitting two)

> Eleven of the thirteen ruled launch pages are built from `hyprriq_flow_v2.html` and
> `HyprrIQ_CONTENT_FINAL.md`. Mobile is part of the build, not a later pass.

| # | Item | State |
|---|---|---|
| **I1** | **Site chrome.** Header and footer to the spec. Nav points at ROUTES, not the spec's homepage anchors (dead on twelve pages); a mobile menu exists that the spec does not have (it hides the nav below 960px, workable for one page, a dead end for thirteen). The announcement bar is out of the layout — the ruled homepage has none and its copy is not in the closed content file. Component kept, not deleted | ✅ SHIPPED |
| **I2** | **Homepage**, nine sections in the spec's order. Every number derived from a ruled registry; the spec's own case id `AWI-0000-000` matches the LIVE generator shape and would have failed the sample-identifier lock, so `SAMPLE_CASE_ID` is used | ✅ SHIPPED |
| **I3** | **Eight content pages** — `/what-we-check` `/how-it-works` `/method` `/what-we-dont-do` `/security` `/how-we-handle-your-data` `/about` `/contact`. One shared editorial shell. Build notes 2 (US spelling), 3 (cut the "inferred" clause), 5 (no postal address on /contact) and 6 (transit-only encryption) applied as instructed | ✅ SHIPPED |
| **I4** | **`/pricing` and `/faq`.** The three-of-five story is DERIVED from `TRACK_CONFIG` via `areaSplitForPlan()` — both the "answers" and "does not answer" lists, so they move together. FAQPage schema on `/faq` only, generated from the same array the page renders | ✅ SHIPPED |
| **I5** | **`/how-to-read` under founder ruling 2** — launches, side-stripes removed (the verdict wears its own chip from the registry), hardcoded `#FAF9F7` cream gradient removed | ✅ SHIPPED |
| **I6** | **`/contact` is a REAL form** — new public endpoint, ruled abuse posture (server validation, honeypot before rate limit, per-IP brake, no CAPTCHA). ⚠ EMAIL IS THE ONLY RECORD: no contact table exists and creating one is a migration, so a failed send LOSES the message and the route returns 502 rather than a false success | ✅ SHIPPED, flagged |
| **I7** | **Mobile, MEASURED at 360/390/430px** — zero horizontal overflow on every page, one h1 per page, body 16px, and zero standalone controls under 44px. `/pricing`'s table scrolls in its own box | ✅ MEASURED |

> **SEVEN RULINGS APPLIED — 2026-08-24 (second pass).**
> | # | Ruling | State |
> |---|---|---|
> | 1 | Warm/cool narrowed — verdict hues reserved on report surfaces only; the ~40 existing and ~7 homepage uses stay | ✅ no action needed, nothing recoloured |
> | 2 | `/how-to-read` launches (side-stripes + cream gradient gone); `/partners` BUILT | ✅ SHIPPED — banners and request form untouched per the ruling's scope |
> | 3 | `/how-it-works` upload line says `$99` has no upload | ✅ SHIPPED, **derived** — see correction below |
> | 4 | One wordmark product-wide; the marketing text lockup wins | ✅ SHIPPED — `components/brand/wordmark.tsx` replaced, API unchanged, zero call sites edited |
> | 5 | Credit rollover answered from `PLAN_ROLLOVER_LIMIT` | ✅ SHIPPED, derived from the constant + `PLANS_ON_SALE` |
> | 6 | Pricing tabs work without JavaScript | ✅ SHIPPED — measured switching with no `use client` |
> | 7 | Banned-language false positives stay recorded, not fixed | ✅ no action — list + staleness test stand |
>
> **ONE CORRECTION TO RULING 3, and the reason the copy is derived rather than typed.** The ruling
> said "uploads are Growth and above". `planAcceptsUploads` is *every plan except `single_99`*,
> which INCLUDES Single Deep ($149) — a one-time tier priced BELOW Growth, off sale today only
> because `KEEPA_LIVE` is false. "Growth and above" is true of what is on sale and goes wrong the
> day $149 opens. `uploadPlanNames()` intersects `PLANS_ON_SALE` with the predicate, so the sentence
> reads "Growth" today and gains Single Deep by itself.
>
> **THE PRICING TABS COST THREE FAILED APPROACHES**, recorded in the component so nobody repeats
> them: Tailwind's named-peer variants (`peer-checked/single:`) were NEVER EMITTED for those class
> names, verified against the generated stylesheet; the `background` shorthand lost to the label's
> `transition-colors`, which watches `background-color`; and a rule that MATCHED the label
> (confirmed with `.matches()`) still would not paint it. The shipped version rides `display`, the
> one mechanism measured working there, and renders the strip twice — once per selection.
>
> **FLAGGED after ruling 2:** `/partners`'s invite banners and request form now sit inside a page
> built on the new system and read a step older than everything around them (the banner CTA is
> still `rounded-lg bg-ink`, and "Request access" is the one control still under 44px on that page).
> That is the cost of the ruling's scoping, and it is visible.

> **⛔ `/sample-report` — CONTRADICTION RESOLVED, WAITING ON THE CASE (founder ruling 1, 2026-08-24).**
> The founder supplies the case and names it; dev does the masking and the page. Every delivered
> case is his or the house account, so there is no third-party client data — which was the blocker.
> **Still waiting on the case reference.** The original contradiction, for the record:
> `HyprrIQ_DEV_BRIEF.md` says "The page is a frame around a report that does not exist yet. Build
> the report… take a real delivered case and redact it." `HyprrIQ_CONTENT_FINAL.md` line 552 says
> **"[THE REPORT ITSELF GOES HERE — GAUTAM TO SUPPLY]"**. Both cannot be followed. Beyond the
> contradiction, building it means reading a real delivered client case and publishing a redacted
> version publicly — a client-data decision that stops and comes to the founder under the standing
> limits. The existing page is untouched and still live.

> **`/partners` DELIBERATELY UNTOUCHED.** It is on the launch URL map, but the dev brief's "what not
> to do" says do not restyle `/partners`, the invite landing or the request form yet — they are
> queued separately and come after the system exists. It launches as it is.

> **⚠ THE BANNED-LANGUAGE SCANNER BLOCKS THE SITE'S REFUSALS — five so far, one class.** Sentences
> that REFUSE a claim trip the rule that bans the claim. The scanner is built to allow denials
> (H12 is "denial-aware", H14 runs `makeVerdictGuard`) but the guards do not model negation four
> words upstream, negation carried by the subject ("nobody can confirm"), an interrogative ("Will
> this keep my Amazon account safe?" — answer: No), or the OBJECT of a verb ("we do not sell your
> **data**" matching a purchase rule). H3 has no guard at all. THE REAL FIX is in
> `lib/utils/banned-language.ts` — a FROZEN surface — and must be corpus-measured first, because a
> guard that lets a refusal through must never let a real claim through. Until then the five
> literals are allowed BY EXACT TEXT in `clientCopy.bannedLanguage.lock.test.ts`, each with its
> reason, plus a companion test that fails a STALE exemption. Recorded on the founder's
> "list it, we will change later" instruction.

> **OPEN, NEEDS A RULING:** credit roll-over on `/pricing` — the content file marks it
> `[GAUTAM TO CONFIRM]`. Not guessed. `PLAN_ROLLOVER_LIMIT` already answers it (singles 0, Growth 2,
> Scale 4) and the comparison table already renders a "Credit rollover" row from it, so the fact is
> already public; only the FAQ answer is missing. Publishing a rollover PROMISE changes what a
> client is promised.

> **COPY ACCURACY FLAG:** `/how-it-works` says "If you have an invoice or a quote, upload it", but
> `app/api/cases/submit/route.ts:117` REFUSES uploads on `single_99` server-side — Documentation
> Review does not run on that tier, so accepting files would falsely imply review. A $99 buyer
> following that sentence hits a 400. The tier qualification was added AROUND the founder's
> sentence, not inside it.

> **TWO WORDMARKS ON THE SITE TODAY.** The marketing chrome renders the spec's live-text lockup
> (Newsreader, IQ in petrol). `components/brand/wordmark.tsx` — the founder-ruled SVG in Fraunces
> with a COPPER IQ, a typeface and a colour the 2026-08-23 ruling both deleted — is still used by
> auth, admin, `error.tsx` and `not-found.tsx`. The assets need regenerating.

> **CONFIRMED for the content file's "unverified" note:** a case CAN run without an uploaded
> document (`submit/route.ts:42`, files optional by ruling).

---

## 0-H. THE VISUAL SYSTEM IS BUILT AND LOCKED — 2026-08-24 (design sitting one of three)

> The founder's visual ruling (`HyprrIQ_DEV_BRIEF.md`, 2026-08-23) is implemented as a token
> layer that is MEASURED on every build rather than described in a comment. The 2026-08-22 STOP
> marker on `docs/UIUX_SESSION_PROMPT.md` is discharged; its §4 is superseded.

| # | Item | State | Enforcement |
|---|---|---|---|
| **H1** | **The token layer moved to TypeScript.** `lib/design/palette.ts` is the source; `app/globals.css` mirrors it. Cool neutrals, petrol `--anchor`/`--action`, four cool wayfinding accents, the reserved warm verdict ramp, Newsreader / Inter / IBM Plex Mono, two motion curves and three durations. Replaces the 2026-06-17 synthesis direction; `--color-accent-warm` (copper — defined, never used, warm) deleted. Utility NAMES unchanged, so ~30 admin/portal files re-skinned without an edit | ✅ SHIPPED | `palette.lock.test.ts` — CSS↔TS equality, token by token |
| **H2** | **Three ruled values corrected by measurement**, each the minimum lightness shift clearing the brief's own 4.5 floor on a ground the ruled homepage renders it against: `--mut` #687276→#666F73 (was 4.33:1 on sunk, 4.43 mist, 4.44 sand — half its grounds); `--cyan` #007983→#007881 (4.43:1 on the hero gradient stop); footer fine print #6E7B80→#758286 (4.09:1 on ink). Two of the three are visually identical | ✅ SHIPPED | solver `scripts/solve-token.ts`; contracts recomputed each run |
| **H3** | **Two tokens the brief did not have.** `--control-border` #848C90 (a control's edge needs 3:1 per WCAG 1.4.11; the brief's `--ln2` measures 1.65:1 — the secondary button's outline is not perceivably there). `--color-focus` **contextual**: cyan is 5.24:1 on surface but 2.30:1 on the petrol section, so `[data-ground="dark"]` redefines it and the control inherits the right ring instead of someone remembering | ✅ SHIPPED | both in the contrast contracts |
| **H4** | **VERDICT COLOUR DEFECT, live and client-facing.** `/how-to-read` — the public page that teaches a client to read the verdict — hand-wrote its own map and got **three of four wrong**: Source Clear wearing the VERIFY orange, Usable With Conditions wearing the brand navy, Verify Before Purchase wearing `amber-600` from Tailwind's DEFAULT palette. `/portal/help` held a second hand-written map (correct — which is the risk) and `verdict-badge.tsx` a third. All three now read `VERDICT_CLASSES` | ✅ FIXED | lock check 7 fails any file building its own map |
| **H5** | **The lock — the answer to "what stops the next session getting a verdict colour wrong".** 90 assertions, every ratio computed at run time; the file contains no number a human typed. Fails on: a verdict with no colour or a colour with no verdict · any pair under 4.5:1 · two verdicts sharing a hue · CSS/TS drift · a broken contrast contract · a text token in NO contract · a hardcoded reserved hex · a self-built verdict map · a Tailwind default-palette colour on a presentation surface · a stale Clerk brand mirror · a keyframe animation in the operator console | ✅ SHIPPED | `lib/design/palette.lock.test.ts` (+90 tests → 2093) |
| **H6** | **The component sheet is a ROUTE, not a file.** `/admin/design-system`, behind the operator boundary (the launch URL map is closed; a public `/design-system` would be an invented route). Imports the real tokens and real components with contrast computed at render, so it cannot go stale the way `public/prototype/DESIGN_SYSTEM_reference.html` did. Admin nav gains a 19th item, pinned fixture updated same commit | ✅ SHIPPED | `lib/admin/nav.test.ts` |
| **H7** | **Operator-console motion ban made real.** `pipeline-progress.tsx` carried `animate-pulse` on rendered content plus three Tailwind-default amber colours. Removed. Loading skeletons are exempt by an explicit two-entry list with reasons, and a companion test fails a STALE exemption so the list cannot become where animations hide | ✅ SHIPPED | lock check 10 |

> **TWO PREMISES IN THE BRIEF THAT THE CODEBASE DOES NOT SUPPORT — reported, not built to.**
> The brief states two defects "both verified in the current build". Measured across every
> palette in the repo — `app/globals.css`, `public/prototype/assets/tokens.css`,
> `DESIGN_SYSTEM_reference.html`, the PDF template, and an exhaustive tree sweep including the
> untracked working folders:
> - **"Three of four verdict badges fail contrast (3.22, 3.31, 4.33)"** — all four PASSED:
>   5.42, 4.62, 4.62, 5.87:1. No palette in the repo produces those three numbers.
> - **"`--muted #767E8A` measures 3.76:1, not the >=4.5 its own comment claims"** — `#767E8A`
>   **exists nowhere in the repository.** The real `--color-muted` is `#5C6570` at 5.5:1, and
>   its comment is accurate.
>
> The ruling stands regardless — the new system is a complete, measured, enforceable one and the
> old one was none of those things. But the STATED REASON was wrong, it had propagated verbatim
> through three documents (`UIUX_SESSION_PROMPT.md` → the 2026-08-23 handover → the dev brief)
> with no measurement behind it, and **the founder's instinct that verdict colour was broken was
> RIGHT — it was recorded as the wrong defect.** The real one was H4: three of four verdicts
> rendered in the wrong colour on the page that explains them.

> **OPEN, NEEDS A FOUNDER RULING — the organising rule vs ~40 existing usages.** The brief's
> organising rule ("green, amber, orange and red may only ever mean a verdict") is contradicted
> today by roughly forty verdict-token usages that mean something else: subscription status
> (active / past_due), support ticket status, integrity tones, outcome correct/wrong, credit
> deltas, the portal's "Your plan is inactive" banner, and marketing capability icons. Enforcing
> the rule wholesale would recolour every status chip across admin and portal — a three-surface
> change, not a token decision. The lock enforces the narrow half now (verdict colours are
> correct, complete, measured, undriftable) and the wide half is left to the founder. **The ruled
> homepage HTML itself uses the reserved ramp for ~7 non-verdict things** (status tags, the
> problem-chain card, the section kicker, the × marks, the trend graph, the Learn label chips),
> so this must be ruled before sitting two builds thirteen pages on top of it.

---

## 0-G. THE AUDITS RUN THEMSELVES — 2026-08-22 (systemic pass)

> Every census run by hand this week became a STANDING CHECK. Hand-auditing works at 45 cases
> with one person reading everything; it does not work at 500.
>
> | Check | Shape | Where | Measured across 45 cases |
> |---|---|---|---|
> | Internal citation markers in a client report | **BLOCK** + ALERT | publish gate refuses 422 · nightly sweep re-checks delivered | CLEAN 45/45 (after 17 leaks on 4 cases, 3 delivered, were closed) |
> | Internal vocabulary in a client report (the 1e class) | **BLOCK** + ALERT | presence checkpoint · nightly sweep | CLEAN 45/45 (after `(brand_risk)` was found on a DELIVERED report) |
> | Delivered verdict vs current engine replay | ALERT | nightly sweep (only visible corpus-wide) | 1 finding — AWI-2607-022, genuine and known |
> | Delivered case with no verdict | ALERT | nightly sweep (render surfaces already refuse) | CLEAN 45/45 |
> | Live-shaped case IDs on presentation surfaces | **BLOCK** | the build (filesystem-walking lock) | 5 surfaces corrected; **verified it catches a NEW surface** via a probe file |
>
> **False positives across every new check: ZERO.** A check that fires on healthy cases did not
> ship — a false-alarm system is worse than none.
>
> **The 1e root cause was the marker class one level up:** `SNAKE_NAMES` was a HAND-ENUMERATED
> list that knew `brand_risk_assessment` but not the short alias `brand_risk`. It now DERIVES
> from `AREA_NAMES`, longest-key-first, with a measured alias table.
>
> **ALERTING (`lib/inngest/functions/integritySweep.ts`):** nightly 06:20 UTC, **one page per NEW
> finding, never a digest** — dedup by finding key against the previous run stored in `audit_log`
> (deliberately NO migration; a health dashboard must not wait on one). Zero external spend: DB
> reads plus pure replays. Seven fixtures pin the dedup contract.
>
> **SURFACE — `/admin/integrity`:** every check in plain English, when it last ran, what it found,
> which cases. **Green means MEASURED green with a timestamp**; "never checked" and "stale (>36h)"
> are their own states, and unevaluated cases are shown separately, never folded into clean.
>
> ⛔ **THE DIVERGENCE LAW (founder-locked):** a delivered verdict that no longer matches the engine
> is INVESTIGATED, never smoothed — never rebaselined away, never regenerated to make a suite go
> green, never removed from the pinned list. Recorded in `docs/goldenCases.md`; the pin and the
> nightly sweep report it independently, so deleting the pin only makes two records disagree.

---

## 0-F. ADR-013 PENDINGS CLOSED — 2026-08-22 (marker leak measured, golden suite built)

> | Item | State | Detail |
> |---|---|---|
> | **① A\d{2} marker vocabulary — MEASURED, THEN CLOSED** | ✅ SHIPPED | Census over all 45 cases through the REAL projection: **17 genuine leaks across 4 cases, THREE ALREADY DELIVERED** (-033 `(RG02)`, -038 `(A-010)`, -039 `(A-014, RG-002)`); **zero** false positives in the A/RG space. So it was a defect, not a trade. **1c, the class:** `A\d{2}` was never the whole vocabulary — the census found `RG` entirely and the hyphenated `A-NNN` form. Both joined the grouped vocabulary; `stripTokensInMixedGroups` closes the second failure mode (a citation beside a real word — `(A10, unresolved)` → `(unresolved)`). **Why it is NOT a general `[A-Z]+-?\d+` rule:** the same corpus carries `(S-1, S-3, 10-K)` (true SEC filings) and the ASIN `B007EARF3O` — a general rule deletes the client's own content. Backstop added to the presence checkpoint in the two measured-clean prefixes. Post-fix census: **0 surviving, 45/45.** ⚠ The first instrument gave a FALSE ZERO (`.maybeSingle()` errors on the 20 multi-attempt cases) — rebuilt on the production reader |
> | **② `SLA_RISK_WINDOW_HOURS = 6`** | ✅ RULED | Recorded as founder-ruled with its reason; no longer an unnamed constant |
> | **③ Golden-case regression suite** | ✅ SHIPPED | `lib/research/goldenCases.test.ts` — 40 real cases replayed through `stageVerdict()`, one test each, pure (no LLM/cost). **Engine untouched: it was already replayable.** Detector VERIFIED by perturbing a weight (6 named failures, then reverted byte-identical). ⚠ **Deviation flagged:** ~30 *delivered* cases was impossible — only 14 delivered have replay data and ZERO delivered are `do_not_rely`. ⚠ **`source_clear` has no real anchor** (guarded synthetically). ⚠ **`AWI-2607-022` is DELIVERED and today's engine would decide it differently** (Verify → Usable). Full catches/gaps list: `docs/goldenCases.md` |
> | **④ `Inferred` + real case IDs** | ✅ SHIPPED | Both were LIVE ON THE MARKETING HOMEPAGE, not only in the reference file. `Inferred` → `Assessed` (locked vocabulary); five presentation surfaces moved onto one reserved series (`AWI-SAMPLE-NNN`) that the DB generator **cannot** produce, since it always writes four digits in that segment. `AWI-2607-022 · TD SYNNEX` was a real delivered case beside a real distributor. Filesystem lock; provenance comments exempt |
> | **⑤ UIUX_SESSION_PROMPT staleness marker** | ✅ SHIPPED | STOP marker naming the three failing verdict badges and the rejected base colour; scoped to VISUAL guidance only. §5 surface map, copy MUST_PASS locks, §2/§3/§6/§7 all still stand. Nothing restyled |

---

## 0-E. CTO CLOSE-OUT AUDIT — 2026-08-22 (dev-lane exit review before the design lane opens)

> Full-codebase sweep for incomplete/stubbed functionality, plus live-DB verification of every
> founder-run migration. Everything below was VERIFIED against the tree and the database, not
> read off this file.
>
> **FIXED THIS PASS**
>
> | Finding | Why it mattered | State |
> |---|---|---|
> | **Delivery email announced reports the client cannot read** | The email says "ready — view it in your portal"; for a `no_verdict` refusal the portal page REFUSES, so the sentence was false. `no_client_name`/`no_snapshot` still leave a readable page and still send | ✅ `shouldEmailClient` takes the refusal reason; suppression NAMED in the record (`skipped:no_verdict_unreadable`); ops alert no longer says "sending without the attachment" when nothing was sent |
> | **The admin boundary was authentication-only** | `app/(admin)/layout.tsx` ran `auth.protect()` and a deferred role-check marker under its own warning not to expose admin data — while 18 pages did. No leak (all 18 call `requireAdmin()`, verified) but deny-by-default rested on every page remembering | ✅ `requireOperatorAccess()` in the layout — same operator test AND invitation claim (a naive guard would bounce brand-new invited operators), minus per-page reads. Filesystem lock over all admin pages |
> | **Dev validation routes live in the prod tree** | `/api/admin/dev/validate-{track1,acquisition}` run the REAL pipeline, seed throwaway cases, and spend real AI/Serper/WHOIS budget per call. Their own headers said to gate them "once frozen" — Track 1 and 5.1a are frozen | ✅ Arm-gated by `DEV_VALIDATION_ROUTES=1`, else **404** (not 403 — a disabled dev tool does not advertise itself). NOT deleted: they are the instruments that prove the stack after an engine change |
> | **Last legacy admin check** | `validate-track1` still read `clients.role !== "client"` — the one site the 2026-07-30 ADMIN ACCESS FIX missed. Failed closed (no leak) but locked out the founder's own super-admin identity, which has no clients row by ruling | ✅ `getOperator`, like every other surface |
>
> **VERIFIED CLEAN — investigated and found to be correct as-is** (recorded so the next audit does not re-open them): `awaiting_client` is DB-legal with no writer — `confirm-scope` only writes it back on its own revert path and nothing calls that route, so the badge comment is accurate and the route is an inert husk of the excised scope flow · the five reserved `IdentityDiscrepancyKind` values have a safe honest `default:` in `clientNote()` and are code-emitted, never model-parsed · `NATIVE_WEB_SEARCH_ENABLED=false` is a documented never-needed fallback (Serper is primary) · `seedInitialTrackRows` (the manual-research seam) has **zero callers** — there is no live disagreement between intake paths; the Inngest pipeline is the only path · every 503 in the money/consent/grant routes is env- or migration-gated fail-soft, never a dead endpoint · the PDF download "disabled affordance" comment is stale — it shipped working 2026-08-20.
>
> **LIVE-DB VERIFICATION** (read-only MCP, 2026-08-22): `partner_requests` EXISTS and matches the spec exactly (9 columns) — **the /partners request flow is fully live, no longer fail-soft** · `purchased_credits` + all four credit RPCs match their as-applied records verbatim · `acquisition_grants` CHECK = `growth_279` NOT VALID, both value defaults dropped, zero live wrong-tier grants · `email_log.dedup_key`, `marketing_contacts`, `redeem_acquisition_grant` all present · `clients_self` escalation FIXED live (separate read/update policies; the update policy pins `role` and `is_admin` to their current values) · **45 cases, ZERO delivered without a verdict** — the invariant the absence-refusals guard is healthy.
>
> **REMAINS OPEN — and why none of it blocks the design lane**
>
> | Item | Owner | Assessment |
> |---|---|---|
> | **Keepa integration** | F (in test) | Known. `KEEPA_LIVE=false` is the best-enforced flag in the codebase and is fixture-locked so no Keepa-dependent tier can go on sale while it is false |
> | **Closure machinery** (`clients.closed_at`, auto-close, 30-day post-closure deletion) | FA + F migration | **Deliberate manual process with a runbook** (`docs/runbooks/RUNBOOK_ACCOUNT_CLOSURE_DELETION.md`). The Data Policy was written to describe exactly this — "a commitment a human keeps", never automation that does not run. Correct for current volume; revisit at scale |
> | **Email 5 (cancellation)** | FA | Blocked on closure semantics, as ruled — nothing that promises deletion ships before something deletes |
> | **In-app refunds** | F | Policy locked, build deferred, Stripe dashboard is the mechanism, runbook exists (`RUNBOOK_REFUND_BY_FORMULA.md`) |
> | **`A\d{2}` citation vocabulary not asserted** at the token checkpoint | ⚠ F ruling | Known leak vector, deliberately unasserted (false-refusal tradeoff). The only *unresolved* item on a client-facing publish gate — worth a ruling, not a blocker |
> | **`SLA_RISK_WINDOW_HOURS = 6`** | ⚠ F ruling | My constant, flagged under the laws-get-named rule |
> | **Founder actions** | F | Stripe live mode + env separation · `main` promotion · Sentry DSN · 031 re-run · Stripe customer-portal plan-switch config (from 0-D) · retention flag when the first uploads near 12 months (~2027-06) |

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
11. **NEVER write a regex through a bash heredoc.** Bit twice in one sitting, silently both times.
    A `` word-boundary typed into a heredoc is interpreted by the shell as a **literal backspace
    byte, 0x08**, before the file is ever written. The result compiles, the test passes, and the
    pattern it claims to enforce **can never match anything** — a lock that is permanently green and
    permanently blind, which is worse than no lock. The same trap catches `	`, `
`, ``, ``,
    `
` and ``. Write regexes with the editing tools, or a quoted heredoc, or without a regex at
    all; and if a new lock finds zero offenders, prove the scanner sees anything before believing it.
    Sweep command when in doubt: `grep -rlP '' --include='*.ts' --include='*.tsx' .`
12. **"Unreferenced" and "unlinked" are not security properties** (§0-M). Whether a file is *reached*
    is decided by the middleware matcher and the deploy, never by whether the codebase imports it.
13. **TEST AT 1024px, NOT AT 1280px** (§0-O.6, founder-ruled 2026-08-25). The app sidebar is an
    off-canvas drawer below `lg` and a **static 248px column** at `lg` and above. Crossing that
    breakpoint therefore gains **eight pixels** of content (768 → 720px, 1024 → 728px): the sidebar
    eats 248 of the 256 the viewport gained. A 1280px window gives 984px — **256px more than a real
    1024px laptop.** "It works on my laptop" is measured at the one width that flatters the layout,
    and that is how an entire console shipped desktop-only without anyone being careless. The four
    ruled widths are **360 · 390 · 768 · 1024**, and 1024 is a TEST width, not a safe one.
14. **AN INSTRUMENT MUST PROVE IT *LOOKED*, NEVER THAT IT *FOUND*** (founder-ruled 2026-08-25, on the
    THIRD occurrence). Every scanner, census, lock or sweep must assert **how much it EXAMINED**, and
    that assertion must stay true after the last defect is fixed. Three times now the same shape:
      · a hand-run census reported a clean zero it had not earned;
      · a marker pattern matched half the vocabulary and looked complete;
      · the tap-target self-test proved itself by asserting it **found offenders** — so the moment
        the last one was fixed it failed, and the only way to green it would have been to weaken it.
    "Did it find something broken" and "did it look at anything" are different questions, and only
    the second is proof of life. A detector whose proof-of-life is its own hit count is guaranteed to
    go quiet exactly when you start trusting it. See `scanControls()` in `lib/design/responsiveScan.ts`
    for the shape: count what was inspected, assert on that, and check the defects separately.
    Related but distinct: rule 11 covers a pattern that CANNOT match; this covers one that stops
    matching and is read as success.
15. **ASK OF EVERY GUARD: HAS IT RUN IN ITS CURRENT FORM?** (founder-ruled 2026-08-31, §0-S.1 — "one
    I want asked routinely, not once.") The test is NOT when a guard was written. It is whether its
    code has changed since real data last flowed through it: `git log -1` on the file against the
    last real case in `cases`. A guard modified after that has **never been exercised in the form
    that is deployed**, and a refusing gate in that state is indistinguishable from a working one —
    **because a gate that refuses EVERYTHING looks exactly like a gate that refuses nothing until
    somebody tries it.** Six of ten guards were in that state on 2026-08-31; one of them had been
    failing every PDF for nine days, and only running it found out.
    ⚠ It proves UNTESTED, never BROKEN. It is a question to ask, not a verdict to act on, and the
    only thing that answers it is real data passing through.

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

