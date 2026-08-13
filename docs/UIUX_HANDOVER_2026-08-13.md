# UI/UX THREAD — HANDOVER (2026-08-13)

**For the next UI/UX session. Design lane only — dev runs in a PARALLEL thread on this same
repo.** Expect files to change underneath you between sessions (and mid-session): re-read any
file you're about to edit, and when the prototype/mockups and the live code disagree on
*content*, **THE CODE WINS** — the design artifacts govern look and layout only.

**Read order on session start:**
1. This file.
2. `docs/UIUX_SESSION_PROMPT.md` — the standing session protocol (skill roster, workflow,
   design laws). Still governs, with the deltas in §6 below.
3. `docs/HyprrIQ_OPEN_ITEMS.md` — the SSOT tracker. Item 1.4 carries the full design-lane
   ruling history; §1 has the launch-blocking list.
4. `git log --oneline -15` — the dev thread commits daily; check what moved.

---

## 1. WHERE THE LANE STANDS

### Client portal — DESIGNED, RULED, PORTED (one port remaining)
- The full client prototype lives at `public/prototype/` (browsable at
  `/prototype/index.html` on staging; pre-polish snapshot at `public/prototype/backup/`).
  Every ruling is baked in: report = ONE authoritative reading (verdict + full 130-word risk
  always visible, depth in tabs), cool skin, mobile drawer (RULED), submit = 4-step single-page
  stepper with editable review, final content (Verified/**Assessed** chips, how-to-read panel,
  11 tooltips).
- **SKIN + STRUCTURE PORT phase 1 is LIVE in the real app** (commit `ec7d874`): tokens
  (`app/globals.css` — values only, utility names unchanged), fonts
  (Fraunces/Instrument Sans/JetBrains Mono via `next/font` in `app/layout.tsx`),
  Clerk appearance mirrored, portal shell with mobile drawer
  (`components/portal/portal-shell.tsx` + thin client `shell-chrome.tsx`),
  CaseTable desktop-grid/mobile-cards, dashboard SVG icons. Mobile works in the real app.
- **REMAINING PORT (the next client-lane task): the submit-form stepper.**
  `components/portal/submit-form.tsx` (~558 lines, `"use client"`) must become the ruled
  4-step stepper (Supplier+marketplace / Brands / Documents / Review-before-submit) while
  preserving ALL live logic verbatim: upload sniffing + 2-file cap + $99-no-uploads gating,
  notes-required-when-no-files, Scale-only ASIN progressive disclosure, marketplace picker.
  Reference mechanics: `public/prototype/client/submit.html` (one persistent DOM, free
  navigation, review re-renders from live values on entry, empty-supplier guard returns to
  step 1). New client strings (review-step labels) join the banned-language fixture IN THE
  SAME COMMIT.

### Admin console — IN PROGRESS (this is where we are)
Brief: the founder's "ADMIN CONSOLE DESIGN BRIEF" (in-chat, 2026-08-12). Key constraints: the
case review workspace is EXCLUDED (it opens the report lane that follows); density is a
feature; flag-don't-fabricate; absent-not-disabled; fixed vocabulary (4 verdicts, 2 chips
Verified/Assessed, 5 areas); desktop-first, must not break on tablet.

**Done (commits `7a34a7a`, `869d739`, `680b9de`):**
- Design plan written and self-checked (in-chat 2026-08-12 report — density scale, table
  system, nav model, chart language; boldness spent on the Billing overview).
- §8 answers FROM CODE (recorded in the `7a34a7a` commit message): real state machine =
  pending_intake → queued → research_running → awaiting_review → approved → delivered →
  complete (+ cancelled/research_failed/submission_failed); four statuses have NO writer
  (intake_complete, manual_override_required, qa_in_progress, awaiting_client); hold path =
  review action `request_investigation`; credit consumption per case is recorded + shown in
  per-client accounting; engine cost is captured in `lib/ai/runModel` telemetry but NOT
  surfaced per case (candidate for the review lane — flagged, not drawn).
- Admin shell: one navy family (`bg-brand-hover` sidebar, copper IQ), 17-key SVG icon map in
  `components/admin/admin-shell.tsx` (nav.ts capability rules untouched), denser chrome.
- **`/admin/billing`** all-clients overview (NEW, `app/(admin)/admin/billing/page.tsx`):
  3 tiles (navy 28px mono figures; Running-low is STATEFUL — calm at zero, verify-tone hot),
  920px column, 5-col table (billing status is exception-only under the plan), console-voice
  footer, cap `view_billing`, nav lock test updated 16→17.
- **Users redesigned** (`components/admin/users-manager.tsx`): invite-first two-job structure,
  Clerk IDs demoted to tooltips, capability chips, weighted empty state ("No clients assigned"
  verify-ink + adjacent assign control), 4 calm invitation states, Clerk-ID path in a closed
  `<details>` fallback, loading skeleton. ALL wiring byte-identical — restyle only.
- Placeholder audit: Settings/Acquisition already honest (dev reworded Settings 08-12;
  we rewrote Acquisition 08-13); Bulk/Prompts pass the console-voice test.

**REMAINING ADMIN SLICES (priority order):**
1. **Dashboard refine + charts** (`app/(admin)/admin/dashboard/page.tsx`, 139 lines) —
   queue-first ("what needs me next"), metric tiles must drive a decision or come off.
   Charts ONLY on true numbers (MRR/SLA/Active-Clients were fixed the week of 08-10 — verify
   before drawing). Chart language per plan: inline SVG, navy series + one accent, mono axes,
   captioned source, explicit Stripe boundary label. "Email activity" needs its source
   confirmed before pixels.
2. **Clients list + detail** density/rhythm alignment (list is partitioned by scope already).
3. **Run a Case** (`app/(admin)/admin/cases/run/page.tsx`) — recently gained the $149 tier +
   uploads (cap 2, none on $99); bring styling in line, change no rules.
4. **Support** (read-only list, open-count badge already in shell) + **Audit log** (dense,
   filterable, mono — the record that makes delegation safe). NOTE: check whether an audit-log
   ROUTE exists before designing — it was listed in the brief but is not in the route
   inventory (`find app/(admin) -name page.tsx`); if absent, that's a flag-to-founder, not a
   build.
5. **Outcomes / Revenue / Bulk / Supplier DB / Brand DB placeholders** — verify each blurb
   passes the console-voice test (no internal refs/jargon; what will live here + not built).

### Report lane — NOT STARTED, NEXT AFTER ADMIN (excluded from admin pass by ruling)
Operator review → client report renderer → PDF, designed as one continuous piece against the
engine's real output (fixture case AWI-2607-022). The client report renderer is confirmed
NET-NEW (the live `/portal/cases/[id]` is a status/evidence view, not the report). This is
tracker 1.1/1.2 gate work — projection layer first. Do not start it inside another brief.

---

## 2. THE SETTLED SKIN (inherit, never redesign)

- **Tokens:** `app/globals.css` `@theme` — ONE token layer for client + admin + marketing.
  Base `#F5F7F9` · navy `#173E63` (hover/deep `#0E2B47`) · accent `#1E6E8C` (accent-data) ·
  copper `#9A551F` (wordmark-only) · AA verdict pairs (clear/conditional/verify/deny) ·
  `muted #5C6570` (5.5:1). NO new hex, fonts, or tokens — extend the scale, not the system.
- **Type:** Fraunces (display — restraint: page titles, one heading tier) · Instrument Sans
  (body) · JetBrains Mono (IDs, dates, numerics — right-align numerics in tables).
- **Fixed vocabulary:** 4 verdicts · Verified/Assessed · 5 areas (Supplier Legitimacy,
  Supply-Chain Relationship, Brand Risk, Documentation Review, Sourcing Logic). No synonyms,
  no new states, no invented severities.
- **Admin density plan:** nav 13.5px, topbar h-14, content px-6, table rows ~36-40px (audit
  32px), 11px uppercase heads, exception-only status ink, quiet bordered row-action chips,
  working column ~920px unless a table earns full width.

## 3. STANDING RULES (every session, non-negotiable)

- Frozen engine untouchable: `lib/research/`, `lib/utils/banned-language.ts`, verdict engine,
  category gate. `git diff --name-only HEAD -- lib/research lib/utils/banned-language.ts`
  must be empty at session end.
- No business logic, API, pricing, or gating changes from this lane. Wording is
  rendering-only; stored/engine strings never change for design reasons.
- New/changed CLIENT-facing strings → banned-language fixture in the same commit
  (admin-only strings: fixture n/a, but run the banned-words scan anyway).
- Flag, don't fabricate. Absent, not disabled. Numbers from constants
  (`lib/constants/plans.ts`, `creditsView`) — never hardcoded.
- Current price ladder (constants, don't restate elsewhere): $99 single (3 brands, 3 areas,
  no uploads) · $149 Single Deep Report · $279 Growth · $499 Scale. Uploads cap 2 everywhere
  allowed. No Keepa/ASIN-research/PDF/delivery-time promises anywhere.
- AA re-checked on every changed pair (compute, don't assume); visible focus; reduced motion.
- Gates for APP code: `npx vitest run` (1165/1165 as of `680b9de`) · `npx tsc --noEmit` ·
  `npx eslint <touched>` · `npx next build` · frozen diff empty. Static-prototype-only edits
  keep the waived-gates allowance ("renders, matches skin, responsive").
- Deploy: commit to `staging`, push `origin staging` (briefs in this lane have authorized the
  push each time — confirm the brief says deploy). Founder runs all PRODUCTION actions.
- End every pass with a DOC-DELTA one-liner; record rulings in tracker 1.4's history pattern.

## 4. OPEN FLAGS (report-only items awaiting the founder — do not build)

- **Marketplace-localized research** — engine stores `marketplace` but does not vary research
  (no query interpolation, no Serper gl/hl, no per-marketplace Track 6). Founder decision,
  possibly post-soft-launch.
- **Client name collection gap** — Clerk-only capture at first sign-in; Stripe checkout
  discards `customer_details.name` (webhooks route ~line 132); clients can't self-edit
  (backlog). Fix is dev-lane.
- **Invoices client route** — needs a Stripe API; prototype page exists, live route doesn't.
- **Per-case engine cost surfacing** — telemetry exists, unsurfaced; candidate for the review
  lane.
- **Refund surface** — policy locked (`refund = max(0, paid − credits_used × tier_list_price
  × 0.70)`, 14-day window; SLA-breach unconditional); lives on per-client accounting; money +
  credit move together with a recorded reason; show partial-refund resolution before confirm.
  Logic is a dev pass; the surface design is still open on the per-client page.

## 5. VERIFICATION TOOLKIT (what worked in this thread)

- Browser pane JS: iframe-at-375px sweeps for overflow, computed-style checks, contrast math
  (relative-luminance function) — screenshots often unavailable, programmatic checks are the
  reliable path.
- Python batch edits over exact string anchors for multi-file passes; scripts that build the
  new text in memory must write BEFORE any final assert (a crash after replace-but-before-
  write silently drops everything — it bit us once).
- The prototype's `report-standalone.html` is generated (tokens+base+mobile-type+app.js
  inlined) — regenerate it whenever `public/prototype/client/report.html` or its assets change.

## 6. DELTAS TO THE OLD SESSION PROMPT

`docs/UIUX_SESSION_PROMPT.md` predates the re-skin: its token table (warm base `#FAF9F7`,
brand `#1b4b8a`, Schibsted/Hanken) is SUPERSEDED by §2 above; its "1024/1024 suite" figure is
stale (1165 now); mobile-nav and report-structure questions it lists as open are RULED
(drawer; one-report-tabbed-depth). Its skill roster, mockups-before-code discipline,
design-critique requirement, and copy bar all still stand.

**Start here:** re-verify the tracker + git log, then pick up admin slice #1 (dashboard
charts-on-true-numbers) — or the submit-stepper port if the founder re-prioritizes the client
lane. Plan before pixels on anything new; the founder rules structure, you rule mechanics.
