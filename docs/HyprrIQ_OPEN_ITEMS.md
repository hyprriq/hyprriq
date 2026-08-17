# HyprrIQ — Open Items Tracker (v2, merged)

**THE SSOT. Supersedes BOTH prior versions:** the founder's standalone v2 draft (preserved verbatim at commit `a1d883c`) and the accretion tracker 2026-07-04 → 2026-07-28 (archived with its full ruling history at `docs/HyprrIQ_OPEN_ITEMS_HISTORY.md` — read it for the WHY behind any line here).
**Merged + source-verified:** 2026-07-29 (build thread). Every ✅/❌ correction below was checked against code/git/live-DB, not carried.
**Last updated:** 2026-08-17 (ENGINE-PROSE PASS built — see the dated block below §0. Prior: 2026-08-08 PRE-DESIGN BATCH opened — see the dated block below §0. Prior: 2026-08-02 ADR-008 RULED: superseded/demoted to post-launch, drop named — §6.13. *Dating note: sittings span midnights; a batch's entries may carry the opening date.*)
**Purpose:** One durable list of every open thread across all lanes, so nothing falls off between
sessions or between the planning thread, the UI/UX thread, and Fable.

**Legend:** 🔴 OPEN · 🟡 IN-PROGRESS · ⛔ BLOCKED · ✅ DONE · 🗄️ DEFERRED · 🔒 RESERVED

**Owner key:** **F** = Founder (live/prod actions, rulings) · **FA** = Fable (code) ·
**PT** = Planning thread (specs, rulings, review) · **UX** = UI/UX thread (design)

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

> **✓ ENGINE-PROSE PASS BUILT 2026-08-17 (founder-ruled — the §3.1 blocker)** — the `confirms→supports`
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
| 1.1 | **Client report — on-screen + PDF** | 🔴 | UX→FA | The gap carried by roadmaps v3 AND v4. Placeholder only today. |
| 1.2 | **Client-projection layer** | 🔴 | FA | Named gate deliverable. One projection function — not string-by-string, or it leaks. Must strip `src_N`/evidence tags DEFENSIVELY (present in 021's narrative, absent in 022's). |
| 1.3 | **ASIN intake field + one-brand cap** | ✅ | FA | **BUILT 2026-07-30 (dev batch) + MIGRATION APPLIED 2026-07-30.** Code guard `lib/portal/asinIntake.ts` (1 ASIN/brand, ≤ plan cap, format, Scale-only; caps from `PLAN_BRAND_CAPS`, never the NULL DB column) + form (Scale-only progressive disclosure, "the ASIN you're actually planning to buy" copy, graceful at-cap line) + threading via `lib/research/intakeExtras.ts` (contracts.ts FROZEN — additive intersection type). `cases.brand_asins jsonb` live (read-back verified: column present, 0 populated rows). **Executed via Supabase MCP on EXPLICIT one-time founder authorization (chat, 2026-07-30) — the founder-runs-prod law STANDS; this is not a precedent.** **ASIN-optional RULED (founder, 2026-07-30): optional as built; revisit when Keepa ships** (the `asinIntake.ts` header comment still says UNRULED — one-line cleanup rides the next code-touching pass). Keepa is unblocked. |
| 1.4 | **Mobile layout** | 🟡 | UX→FA | Portal does not load on mobile. Broken surface. **LAYOUT PHASE DONE 2026-08-04:** diagnosis = fixed 248px sidebar w/ no breakpoint + CaseTable fixed-column grid (~610px min) + px-7 paddings; 3 nav-direction mockups in `mockups/mobile-1.4/` (A tab bar / B drawer / C hub-and-spoke; shared card system replaces the table on mobile) — AWAITING FOUNDER RULING on direction before build. Critique note carried to build: `text-muted` fails AA (3.1–3.6:1) at 12–13px on desktop too — global fix candidate, founder to rule scope. **2026-08-05 (FABLE_BRIEF re-scope):** full client-portal PROTOTYPE delivered in `public/prototype/` (moved from `prototype/` for staging URL access) (11 pages, new locked skin, report MOCKED in 3 directions on 022 content, mobile throughout, drawer as interim nav) — production gates waived per brief's authorized deviations; awaiting founder rulings on report direction + mobile nav + two locked-skin AA flags (verdict-pill inks 3.2–3.3:1, `--muted` 3.8–4.1:1). **2026-08-05 later:** report RULED C→C+ (built as `public/prototype/client/report.html`; a/b/c archived) + cool re-skin RULED (TOKENS_CORRECTED_cool applied to tokens.css + DESIGN_SYSTEM_reference, AA flags resolved; two tint-bgs micro-lightened to honor the spec's AA intent — noted in tokens.css). **2026-08-06: mobile nav RULED — DRAWER** (founder; confirmed by the 10-item nav-count critique — tab-bar would force nesting Completed reports/Invoices). **2026-08-06 FINAL PASS (portal LOCKED):** sticky depth tabs w/ all four visible on mobile (2x2 grid, honesty tab marked) · 16px mobile body floor (assets/mobile-type.css, family unchanged) · [hidden] display fix (mobile filter chips now actually filter — root cause of "chips don't work" report) · spacing sweep (invoices num/desc, card sub-lines) · submit = three card-steps + Marketplace selector mirroring the REAL intake field (lib/content/submit.ts MARKETPLACES; CaseIntake.marketplace) · asset links cache-busted ?v=3. **BACKEND FINDING (read-only, engine untouched):** the engine stores marketplace but does NOT vary research by it — no query interpolates it, Serper sends no gl/hl geo params, Track 6 has no per-marketplace variation; only consumer is the eligibility-disclaimer pass-through. **2026-08-06 CONTENT DROP-IN (founder-final copy, rendering-only):** chips = "Verified / Assessed" · how-to-read panel final ("Got it — hide this" dismiss) · 11 tooltips final (verdict scale, both chips, could-not-confirm, not-assessed, five areas incl. documents-never-raise-verdict + sourcing-logic-informational). Meaning checks: verdict-is-the-recommendation preserved, "guarantee" appears only as negation, absence-not-accusation framing throughout. **2026-08-11 SKIN+STRUCTURE PORT phase 1 (into the LIVE app):** ruled cool tokens + Fraunces/Instrument Sans/JetBrains Mono ported to app/globals.css + layout.tsx (utility names unchanged — values only; ONE token layer, admin/marketing share it by design); Clerk colorPrimary mirrored #173e63; portal shell rebuilt (navy sidebar, SVG icons, mobile drawer <lg via thin client ShellChrome — boundary-safe), CaseTable renders cards below md, dashboard emoji icons -> SVG (labels untouched). Mobile portal now WORKS in the real app. Gates: 1146/1146, tsc 0, eslint 0, build clean, frozen diff empty. AA carries over (same hex as verified prototype; muted now 5.5:1 — old desktop failure fixed). REMAINING on 1.4: submit-form stepper structural port (logic-preserving). Report renderer confirmed NET-NEW (status view ≠ report) — stays with the 1.1/1.2 gate, NOT ported. Invoices route flagged: needs a Stripe API, out of scope. STILL OPEN: marketplace-localization decision (backend). |
| 1.5 | **Credits display (BUG-2)** | ✅ | FA | **FIXED 2026-07-30:** `lib/portal/creditsDisplay.ts` — ONE computation for all render sites (billing ×2, dashboard, sidebar). Balance and plan allotment stated as distinct quantities ("7 credits available · plan renews to 5/cycle · includes 2 extra"); bar hard-capped at 100. Test-locked: can never say "7 of 5". Visual redesign stays UX. |
| 1.6 | **Legal pages** | 🔴 | F+PT | Terms · Privacy · Data policy · Refund/cancellation · Cookie policy **+ consent banner** (mandatory once pixels are added) · IP/claims · no-guarantee disclaimer. |
| 1.7 | **Contact page** | 🔴 | UX | Plus a working inbound route. |
| 1.8 | **Sample-report page** | 🔴 | UX | Highest-converting page not yet built — a $499 prospect wants to see the deliverable. |
| 1.9 | **Env separation (test/live keys)** | 🔴 | F+FA | Marked "business-ending risk" in the tracker. |
| 1.10 | **RLS suite / tenancy isolation** | 🔴 | FA | Portal uses service-role with manual scoping. Must be proven before the first real client. |
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
| 2.9 | Technical SEO plumbing — sitemap.xml, robots.txt, schema markup, OG/social cards | 🔴 | FA |
| 2.10 | Analytics (GA4 or similar) | 🔴 | F |
| 2.11 | `#pricing` href in announcement-bar (→ `/pricing`) — **verified still wrong** (`announcement-bar.tsx:27`); footer checked: only `/` links remain, **no dead links found** | 🔴 | FA |
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
| 3.11 | Download-PDF action — **stub placed 2026-07-30:** disabled "Download PDF (coming soon)" on the delivered client case view; generator = client-surface gate. NOTE: the named seam (`GET /api/admin/cases/[id]/report` over `buildVerdictViewModel`) is ADMIN-scoped; the client download needs its own client-scoped route in front of the same view-model — the gate rules that | 🟡 | FA |
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
| 4.11 | Verify ⚖ LEGAL FLAG banner renders | 🔴 | F | Built, unverified |
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
| 5.3 | Sentry — not wired | 🔴 | FA |
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
