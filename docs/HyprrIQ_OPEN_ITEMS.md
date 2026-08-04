# HyprrIQ — Open Items Tracker (v2, merged)

**THE SSOT. Supersedes BOTH prior versions:** the founder's standalone v2 draft (preserved verbatim at commit `a1d883c`) and the accretion tracker 2026-07-04 → 2026-07-28 (archived with its full ruling history at `docs/HyprrIQ_OPEN_ITEMS_HISTORY.md` — read it for the WHY behind any line here).
**Merged + source-verified:** 2026-07-29 (build thread). Every ✅/❌ correction below was checked against code/git/live-DB, not carried.
**Last updated:** 2026-08-02 (ADR-008 RULED: superseded/demoted to post-launch, drop named — §6.13. Prior same-sitting rulings: Modes A/B → gate spec-first · ASIN optional · dimensions-grid deferred-with-lean · §9/§10/5.6 refresh. *Dating note: this sitting's entries span 2026-07-30 → 08-02 as one continuous working arc — some rows carry the 07-30 label.*)
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

## 1. LAUNCH-BLOCKING — nothing ships without these

| # | Item | Status | Owner | Notes |
|---|---|---|---|---|
| 1.1 | **Client report — on-screen + PDF** | 🔴 | UX→FA | The gap carried by roadmaps v3 AND v4. Placeholder only today. |
| 1.2 | **Client-projection layer** | 🔴 | FA | Named gate deliverable. One projection function — not string-by-string, or it leaks. Must strip `src_N`/evidence tags DEFENSIVELY (present in 021's narrative, absent in 022's). |
| 1.3 | **ASIN intake field + one-brand cap** | ✅ | FA | **BUILT 2026-07-30 (dev batch) + MIGRATION APPLIED 2026-07-30.** Code guard `lib/portal/asinIntake.ts` (1 ASIN/brand, ≤ plan cap, format, Scale-only; caps from `PLAN_BRAND_CAPS`, never the NULL DB column) + form (Scale-only progressive disclosure, "the ASIN you're actually planning to buy" copy, graceful at-cap line) + threading via `lib/research/intakeExtras.ts` (contracts.ts FROZEN — additive intersection type). `cases.brand_asins jsonb` live (read-back verified: column present, 0 populated rows). **Executed via Supabase MCP on EXPLICIT one-time founder authorization (chat, 2026-07-30) — the founder-runs-prod law STANDS; this is not a precedent.** **ASIN-optional RULED (founder, 2026-07-30): optional as built; revisit when Keepa ships** (the `asinIntake.ts` header comment still says UNRULED — one-line cleanup rides the next code-touching pass). Keepa is unblocked. |
| 1.4 | **Mobile layout** | 🔴 | UX→FA | Portal does not load on mobile. Broken surface. **LAYOUT PHASE DONE 2026-08-04:** diagnosis = fixed 248px sidebar w/ no breakpoint + CaseTable fixed-column grid (~610px min) + px-7 paddings; 3 nav-direction mockups in `mockups/mobile-1.4/` (A tab bar / B drawer / C hub-and-spoke; shared card system replaces the table on mobile) — AWAITING FOUNDER RULING on direction before build. Critique note carried to build: `text-muted` fails AA (3.1–3.6:1) at 12–13px on desktop too — global fix candidate, founder to rule scope. |
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
| 4.8 | **Billing control** — view invoices, manual refunds, partial refunds, add credits | 🟡 | FA | Reads ✅ (`lib/data/stripeBilling.ts`, read-only, key-safe — NO write call exists) + credit adjust ✅ (`/api/admin/clients/[id]/credits`, H6 atomic RPCs only, REQUIRED reason, audited). **Refunds = STOP-3 → 4.15, deliberately unbuilt.** |
| 4.9 | **Invoice format/branding** | 🔴 | F | Do Stripe invoice branding settings FIRST (logo/colour/footer, ~20 min) before any custom generator |
| 4.10 | Staff accounts + permissions | 🟡 | FA | Mechanism ✅ built (`admin_permissions`: super_admin \| sub_user, six checked capabilities, FULL_ACCESS preset, fail-closed, disabled-beats-all; manage-users is the super_admin ROLE, never a grantable cap — self-escalation structurally impossible; `/admin/users` super-admin only). **Activation of sub-users DEFERRED until there is staff (Option-B ruling above).** |
| 4.11 | Verify ⚖ LEGAL FLAG banner renders | 🔴 | F | Built, unverified |
| 4.12 | Outcome panel refinement | 🔴 | UX | Recurring task, not a buried field |
| 4.13 | Agency panel | 🔒 | — | Phase K |
| 4.14 | ~~STOP-2 fork~~ **STOP-2 RULED (founder, 2026-07-30): Option B — the operator picks the tier per run, NO default.** The built shape stands as-is; no code change. | ✅ | — | Options were: (A) always scale_499 · (B) per-run pick (chosen) · (C) fixed lower tier. |
| 4.15 | ~~STOP-3 fork~~ **STOP-3 RULED (founder, 2026-07-30): refunds stay DASHBOARD-ONLY until post-Phase-J.** Deliberately unbuilt: no `stripe.refunds.create`, no `refund` capability, no credit-clawback path. **NO refund write exists anywhere in the codebase** — that absence is now the ruled state, not a gap. | ✅ | — | Revisit at Phase J with the audit + clawback decision. |

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
| 6.4 | **$149 tier assembly** | 🔴 | PlanType + registry + credits + `single_149` joins the category gate + live Stripe price. Sellable only once Keepa + category justify it |
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
