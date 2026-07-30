# HyprrIQ — Session Handover · ADMIN BATCH COMPLETE, super-admin seed IN FLIGHT · 2026-07-30

**Working dir:** `D:\Projects\Hyprriq\portal`. **Branch:** `staging`, HEAD `b548447` (NOT yet pushed this arc — push on the founder's word). **Model note:** nothing here is model-specific; follow the artifacts, not memory.
**Read order:** this file → `docs/HyprrIQ_OPEN_ITEMS.md` (THE SSOT, v2-merged structure: lanes/owners/launch-blocking/cut-line) → `docs/HyprrIQ_Build_Roadmap_v5.md` (the map) → `docs/HANDOVER_S1_FREEZE.md` + `docs/HyprrIQ_OPEN_ITEMS_HISTORY.md` (the WHY behind any line).
**Gates at HEAD: suite 996/996 across 107 files, unpiped `$LASTEXITCODE 0` · tsc 0 · eslint 0 · every frozen surface byte-identical.**

## ⚡ WHERE IT STOPPED — MID-CONVERSATION, ONE ACTION IN FLIGHT

The founder ruled **Option B: gautamnaidu.p@gmail.com IS the super-admin/master** (single owner
identity; the earlier g@hyprriq.com no-client-row plan is SUPERSEDED for this account; sub-user
hierarchy deferred until there's staff). The build thread verified from the live DB:
- His clients row: Clerk id `user_3FMpveJshdQq9bDAzxygPyPaMy2`, role=founder, growth_279, 7 credits.
- **`admin_permissions` table is PRESENT — the founder already ran the 20260730 migration.**
- NO CONFLICT between the clients row and the operator layer (permissions row wins by explicit
  precedence in `getOperator`; portal/dual-identity unaffected; the one by-design edge: a
  `disabled=true` permissions row blocks EVERYTHING including the legacy fallback).
- **The seed SQL was handed to the founder** (idempotent, ON CONFLICT upsert to super_admin for
  that Clerk id) **+ a read-back query. UNKNOWN whether he has run it yet.** First move: ask, or
  probe read-only (`SELECT user_id, role, disabled FROM admin_permissions`).
- **NOT YET RECORDED IN THE TRACKER: the Option-B ruling itself** (a ruling that exists only in
  conversation is not a ruling — record it: Option B, single owner identity, g@ superseded,
  sub-users deferred; the migration file's g@ seed template is now a dead comment, harmless).

## WHAT THE LAST TWO COMMITS BUILT (fast-and-light batch — deliberately NOT gate ceremony)

**`d71da31` — the admin batch:**
- **Role hierarchy:** `lib/auth/permissions.ts` — `admin_permissions` (super_admin | sub_user), six
  CHECKED capabilities (view_cases, review_publish, run_case, rerun, adjust_credits, view_billing),
  FULL_ACCESS preset. manage-users is the super_admin ROLE, never a grantable cap (self-escalation
  structurally impossible: API refuses super_admin rows + own row). FAIL CLOSED; disabled beats all;
  TRANSITIONAL fallback (legacy clients.role founder/admin) keeps current access working.
- **Run-a-case:** `lib/data/operatorCase.ts` + `POST /api/admin/cases/run` — normal pipeline, NO
  credit call anywhere on the path (proven: rpc spy untouched), `cases.origin='operator'` +
  `operator_meta` = one-query provenance forever, audit row per run, house client row
  `operator-house` for attribution (0 credits, inert).
- **Rerun/attempt-history:** the rerun path ALREADY EXISTED (review route `request_investigation`;
  H1 appends attempts — v2's "re-runs overwrite" note was FALSE). Added the `rerun`/`review_publish`
  capability gates + `AttemptHistory` (DELIVERED pin, LATEST marker; per-attempt verdict is not
  stored per attempt — shown as markers, honestly) + `PipelineProgress` (UX-1 diagnostic chips over
  track_0..6_status, failed stages named) on the review page.
- **Billing reads** (`lib/data/stripeBilling.ts`, read-only, key-safe, NO write call exists) +
  **credit adjust** (`/api/admin/clients/[id]/credits` — H6 atomic RPCs only, REQUIRED reason,
  audit row with operator/delta/resulting balance).
- **Migration `20260730000000`** (admin_permissions + cases.origin/operator_meta + house row +
  seed templates) — founder-run; **CONFIRMED APPLIED** (table present in live probe).

**`b548447` — the admin access fix (landed BEFORE the seed, by design):**
- **THE BLOCKER CLOSED:** `requireAdmin` = `getOperator(userId) !== null` — one function, all nine
  admin pages funnel through it; two-sided proven (`lib/data/requireAdmin.test.ts`): an operator
  with NO clients row reaches admin; a plain client bounces. Display fields enriched (clients row
  else permissions email — tsc caught page usages of `admin.email/full_name`).
- **Consistency sweep:** all six legacy admin API routes' isAdmin/getActor now route through
  `getOperator` — pages and APIs can never disagree in either direction.
- **Three thin screens** (function only — the UI/UX thread restyles): `/admin/users` (super-admin
  only; structural rules SURFACED, not hit as errors) · `/admin/cases/run` (per-run tier selector,
  NO default — STOP-2 pending) · credit-adjust widget on `/admin/clients/[id]`. Nav entries added.
- PortalShell takes optional `isOperator` prop (dual-identity switcher support; legacy unchanged).

## ⛔ OPEN FORKS (founder rules; do not assume)

1. **STOP-2 — operator-run case tier behavior.** Built as per-run explicit `plan_type`, no default.
   Options presented: (A) always scale_499 (full engine incl. Track 6 — build-thread lean for
   intelligence value) · (B) operator picks per run (the built shape; corpus-honest) · (C) fixed
   lower tier (no case). One-line change on ruling.
2. **STOP-3 — refunds.** DESCRIBED ONLY, deliberately unbuilt: `stripe.refunds.create`, a `refund`
   capability, audit + credit-clawback decision. Build-thread recommendation: dashboard-only until
   Phase J. NO refund write exists anywhere.

## THE RULED SEQUENCE (founder-ratified 2026-07-28, tracker §9) — where this arc sits

(1) Founder hour ✅ → **(2) CLIENT-SURFACE/PDF GATE — NEXT, spec first** (ASIN field + one-brand
cap built once; CLIENT-PROJECTION LAYER a named deliverable; category projection is GATE-CLOSING —
the $499 differentiator; 022 = the delivered development fixture; the gate's full ruling backlog is
assembled in the tracker §3 + §7b) → (3) ENV SEPARATION + RLS SUITE (pulled ahead of Keepa —
"business-ending risk") → (4) Keepa gate → (5) $149 tier → (6) Phase J.
*(The admin batch was an out-of-sequence founder insertion — done; the sequence resumes at (2).)*

## FOUNDER LEDGER (his, small)

Run/confirm the super-admin seed (SQL re-derivable: upsert `user_3FMpveJshdQq9bDAzxygPyPaMy2` →
super_admin) · rule STOP-2 + STOP-3 · staging→main (main is still scaffold; Phase J) · BUG-1 live
check · canary first monthly run · untracked-folders (`backups/`, `codex-fresh-design/`,
`mockups-codex-exploration/`) + `skills-lock.json` rulings · **push `staging` when ready (HEAD
b548447 is local-committed only if the remote lags — verify with `git status -sb`)**.

## STANDING LAWS (compressed — full set: tracker §8 + HISTORY)

Founder runs all prod actions · spec → rulings → RED-first → ATs → freeze (ENGINE work only —
**productization ships fast and rough by standing rule 10; the admin batch is the precedent**) ·
frozen surfaces byte-identical (engine core, CC core, banned-language.ts at `3d46314`-state,
tracks/registry/pipeline.steps/contracts) · two-sided is three sides · no output scanner freezes
without real stored engine output · a ruling only in conversation is not a ruling · casualties
named for every output a ruling kills · client wording = rendering concern, never a stored-literal
change · verify founder claims from source; challenge plainly; correction discipline (mark, never
delete) · `.env.local` env file · read-only DB probes via
`npx tsx --tsconfig tsconfig.json --env-file=.env.local <script>` (async main wrapper — top-level
await fails under CJS).

## KEY IN-CODE FACTS THE NEXT THREAD MUST KNOW

- `getOperator` precedence: admin_permissions row FIRST (super_admin ⇒ everything), else legacy
  clients.role fallback (founder⇒super-equivalent), else null. Disabled beats all.
- The PDF seam (named, unbuilt): `GET /api/admin/cases/[id]/report` serializing the existing
  `buildVerdictViewModel` payload — the client-surface gate implements the renderer behind it.
- `clients.max_brands_per_credit` is NULL on every row — `PLAN_BRAND_CAPS` in code is the authority.
- Two PROPOSED copy edits + the founder-drafted OQ-CC5 scope sentence + `CATEGORY_CLIENT_SUMMARY`
  await the client-surface gate; the H4 carve-out makes both founder denial strings embeddable.
- Engine-voice friction is INTERMITTENT (rephrase-at-review is the flow); the client-projection
  layer must strip evidence tags DEFENSIVELY (present in 021's narrative, absent in 022's).
- Delivered dev fixture: AWI-2607-022 (`1e13b79e-09ce-4100-abf2-4b1333b449c5`); 021 =
  `2b359a6a-98f9-49c9-8f57-c19f4d8daaac` (delivered attempt 6 frozen; latest attempts through the
  wired engine at g005-1.0.0 with extension persisting).

**NEXT THREAD'S OPENING MOVE:** record the Option-B super-admin ruling in the tracker → confirm the
seed ran (read-only probe) → then the sequence resumes: **the client-surface/PDF gate, SPEC FIRST**
— its ruling board is pre-assembled (tracker §1.1–1.3, §3, §7b: report design, projection layer,
category projection, ASIN field + one-brand cap, VERDICT_SENTENCES-as-rendering, operator-material
modes A/B, §9.1 rephrase, the max_brands resolution). The founder rules the spec before any build.
