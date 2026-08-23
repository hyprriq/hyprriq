# HyprrIQ — UI/UX SESSION BRIEF (the standing prompt for every design-thread session)

**How to use (founder):** start each new UI/UX session with —
> Read `docs/UIUX_SESSION_PROMPT.md` and follow it exactly. Today's target: <page/surface + what you want>.

Everything below is standing instruction for that session. Written 2026-08-02 at `c97963a` (dev lane closed).

> ## ⛔ STOP — VISUAL SYSTEM IS UNDER ACTIVE RULING (2026-08-22)
>
> **This file's VISUAL guidance is SUPERSEDED pending a founder ruling in the planning thread.**
> The palette, typography and motion described below predate this week's design work. Building
> from them today would inherit **three verdict badges that fail contrast** and a **base colour
> the founder has rejected**. Do not treat §4 ("the existing design system") or any colour,
> token, type or motion instruction in this file as current.
>
> **What DOES still stand, and is not affected by that ruling:**
> - §5 THE SURFACE MAP — including the acquisition-funnel queue (invite landing, /partners
>   request form + confirmation, inactive-invite notice, admin partner-requests panel).
> - The copy MUST_PASS locks and every "restyle, don't rewire" instruction. Copy and structure
>   are content decisions, already ruled; they are not part of the visual system under review.
> - §2 (layouts-first workflow), §3 (hard laws), §6 (session-end gates), §7 (voice & copy bar).
>
> **Before starting a visual session:** get the current palette/type ruling from the founder and
> work from that. This marker is removed by the founder when the ruling lands — not by a design
> session, and not by whoever finds it inconvenient.


---

## 0. WHAT THIS PROJECT IS (60 seconds)

HyprrIQ is a supplier-verification service for Amazon sellers: a client pays ($99 one-time / $279 Growth / $499 Scale monthly), submits a supplier + brands (+ per-brand ASINs on Scale), a research engine investigates across 6 evidence tracks + a synthesis engine, the founder reviews, and a verdict report is delivered. Stack: **Next.js 16 (App Router, Turbopack) · Tailwind (custom tokens) · Clerk · Stripe · Supabase · Inngest**. Branch: `staging`. Working dir: `D:\Projects\Hyprriq\portal`.

**The engine and all dev plumbing are DONE and FROZEN. This thread's job is design only:** layouts, hierarchy, copy, polish — on the marketing site, client portal, and admin console. Function already works; do not rebuild it, re-skin it.

**Read order when you need context:** `docs/HyprrIQ_OPEN_ITEMS.md` (THE SSOT — statuses, rulings, the §3 report-content rules) → `docs/SAAS_ARCHITECTURE.md` (bottom addendum = current-state facts incl. things you must NOT "fix") → `docs/HyprrIQ_Build_Roadmap_v5.md` (the map) → `docs/HyprrIQ_OPEN_ITEMS_HISTORY.md` (the WHY behind any rule).

## 1. SKILLS — INVOKE EVERY SESSION, NOT OPTIONAL

At session start, before any design work, invoke via the Skill tool:
1. **`anthropic-skills:ui-ux-pro-max`** — the design intelligence base (styles, palettes, type pairings, UX guidelines).
2. **`impeccable`** — the working method for shaping/critiquing/polishing every surface you touch.
3. **`design:ux-copy`** — every button label, empty state, error, helper line goes through it.
4. **`anthropic-skills:content-humanizer`** — all client-facing prose leaves sounding human, never engine-voice.
5. **`design:user-research`** — when making layout/IA decisions, ground them in the user (an Amazon seller about to wire money to a supplier; anxious, non-technical, mobile-heavy).

And after ANYTHING is built or mocked: run **`design:design-critique`** against it — a real critique pass with findings, not a rubber stamp. The critique is part of the deliverable, every time.

## 2. THE WORKFLOW — LAYOUTS FIRST, ALWAYS

The founder prompts each piece. The cycle per surface:
1. **LAYOUT PHASE:** produce mockups first — standalone HTML mockups (self-contained files under `mockups/` or rendered for the founder), 2–3 meaningfully different directions when the surface is major, one refined direction when it's minor. NO app code changes in this phase. Present with reasoning (hierarchy, IA, what the user is feeling at that moment).
2. **FOUNDER RULES** on the layout. Do not start coding a direction he hasn't approved.
3. **BUILD PHASE:** implement the approved layout in the real Next.js code. Match existing token/component idiom (see §4). Preserve all function — every button keeps doing what it does.
4. **CRITIQUE PHASE:** `design:design-critique` on the built screen (use the live preview/browser), fix what it finds, then gates (§6), commit.

Sessions are continuous with each other through the repo: check `git log` and the tracker before assuming a surface is untouched.

## 3. HARD LAWS — THESE OVERRIDE ANY DESIGN INSTINCT

1. **Frozen surfaces byte-identical:** never edit anything in `lib/research/` (contracts, tracks, pipeline, synthesis, registry), `lib/utils/banned-language.ts`, or the verdict engine. Design NEVER reaches into the engine.
2. **Client wording is a RENDERING concern (standing rule 9):** stored literals, DB values, and engine output strings never change for a design reason. You re-render; you never re-store.
3. **Any new client-facing string joins the banned-language must-pass fixture IN THE SAME COMMIT (standing rule 8).** No guarantees, no "legit/safe/verified supplier" promises, no fraud/scam assertions in our voice — the scanner blocks delivery, and copy that fights it is wrong by definition.
4. **The report content rules (tracker §3 block) govern all client-facing report/case design:** strip `src_N`/evidence tags and "Dimension N" labels · engine headers become plain language · `category_verdict` is NEVER shown to a client as a "verdict" (Condition 3) · operator states and "informational; does not affect verdict" notes stay hidden · snake_case never reaches a client · the design must survive: 1-line AND 6-line risk paragraphs, 130-word single blocks, a dimension "not assessed", 1 or 5 brands, empty analyst block, 2–14 verify questions.
5. **Two renderings are CORRECT-BY-DESIGN — do not "fix" them** (SAAS_ARCHITECTURE addendum §G): Track 5 Sourcing Logic shows N/A with real text (non-voting arbitration — the client string is the frozen constant "Consistency check — informational; does not affect the verdict"); Track 4 Documentation Review shows N/A on zero uploads (absence ≠ finding).
6. **Dimensions-grid lean (founder, on record):** naming the five research dimensions is fine (WHAT we assess); per-dimension live STATUS during research may cross "no method exposure." Rule sits with the founder at this design pass — present options, don't decide.
7. **Numbers come from constants, never hardcoded:** plan prices/credits/caps render from `lib/constants/plans.ts` (`PLAN_NAME`, `PLAN_PRICE_LABEL`, `PLAN_CREDITS_PER_CYCLE`, `PLAN_BRAND_CAPS`); credit displays go through `lib/portal/creditsDisplay.ts` (`creditsView` — the honest framing is test-locked; restyle around it, never re-derive the math in JSX).
8. **Client components never import server modules** — `lib/supabase/admin.ts` is `server-only` poisoned and `clientBoundary.lock.test.ts` walks every `"use client"` import graph. Client-safe constants live in `lib/auth/capabilities.ts`, `lib/portal/*`, `lib/constants/*`.
9. **The founder runs all prod actions.** Design sessions never touch the DB, Stripe, or migrations.
10. **THE CLIENT REPORT (tracker 1.1/1.2) is gate work — SPEC FIRST.** Its ruling board (projection layer, category projection, client strings, Modes A/B, OQ-CC5 embed) needs founder rulings before build. You may MOCK report layouts to inform the spec, but do not implement report rendering until the founder rules the spec.

## 4. THE EXISTING DESIGN SYSTEM (extend, don't replace)

Tailwind custom tokens are in use everywhere — reuse them: surfaces `bg-base / bg-surface / bg-subtle`, text `text-ink / text-ink-2 / text-muted`, lines `border-line / border-line-strong`, brand `bg-brand / text-brand / bg-brand-tint / text-brand-ink / hover:bg-brand-hover`, semantic `clear-bg/clear-ink` (positive) · `verify-bg/verify-ink` (caution) · `conditional-bg/conditional-ink` (warning) · `deny-bg/deny-ink` (negative), radius `rounded-card`, display font `font-display`. Shared shells: `components/portal/portal-shell.tsx` (client) and `components/admin/admin-shell.tsx` (admin). Badges: `components/portal/badges.tsx` (client status labels — 14 statuses → 8 client labels, e.g. `research_failed` renders "Delayed — under review"; these mappings are ruled, restyle only). If you introduce a new token, add it to the theme once — never inline hex values per-component.

## 5. THE SURFACE MAP (what this thread designs — tracker numbers)

**Marketing site (§2):** full redo 2.1 · pricing page 2.2 · contact/help 2.4 · about 2.7 · login/404/500 2.8 · sample-report page 1.8 (highest-converting page; mock only until the report spec is ruled) · email capture 2.12 · legal-page templates 1.6 (copy = founder+PT; you lay out).
**Client portal (§1/§3):** MOBILE 1.4 (launch-blocking — portal doesn't load on mobile; likely first target) · portal redesign 3.2 · billing overhaul 3.5 · case status view 3.10 (carry the §3.6 lean) · submit flow polish · the report 1.1/1.2 (SPEC-FIRST — see law 10) · dispute/clarification flow 3.12 · news section 3.6.
**Admin console (§4):** 4.1 redesign — DENSER than client side by design (the founder reads a lot fast) · outcome panel 4.12 · the thin screens from the admin batch (`/admin/users`, `/admin/cases/run`, credit-adjust, attempt history, pipeline chips, dispute-rerun panel) were built function-only and expect restyling.
**Acquisition funnel (§2, founder-queued 2026-08-22 — "acquisition-ready" bar):** the invite-link landing (/partners?invited=1 — founder verdict: "clumsy"; a clicked invite should feel like a warm welcome with ONE obvious action, not a banner bolted above a marketing page) · the /partners request form + its confirmation state (function-only build 2026-08-22; expects restyling) · the inactive-invite notice (?invite=inactive) · the admin Partner-requests panel (function-only; DENSER admin idiom applies). Function is live and tested — restyle, don't rewire; the copy is MUST_PASS-locked, propose changes to the founder rather than editing silently.
**Explicitly NOT this thread:** engine anything · billing/credit logic · schema · Keepa/$149/G6 (deferred) · refunds (ruled dashboard-only).

## 6. SESSION END — EVERY TIME

`npx vitest run` (must stay green — currently 1024/1024) · `npx tsc --noEmit` · `npx eslint .` · `npx next build` · frozen-surface diff empty (`git diff --name-only HEAD -- lib/research lib/utils/banned-language.ts` returns nothing) · `design:design-critique` findings addressed or listed honestly · commit with a plain message saying what was designed and what remains · push `staging` only if the founder says so this session. Report what changed, what the critique found, and what's ready for the founder's eye.

## 7. VOICE & COPY BAR

The client is often about to wire five figures to a stranger. Copy is calm, concrete, and never overclaims: we describe OUR evidence and OUR limits, never supplier conclusions ("we could not corroborate X" — never "X is a scammer" or "X is legit"). No urgency theater, no marketing superlatives on money surfaces, no jargon (`n_a`, `soft_fail`, track numbers) anywhere a client looks. Humanize everything through `content-humanizer`; run every client-visible string through the ux-copy lens; when a string is load-bearing (verdicts, denials, limits), propose it to the founder — exact client strings on ruled surfaces are HIS call (standing copy bar).
