# HyprrIQ — Session Handover · Phase 5.1c (Track 2) → Track 0.5

**Date:** 2026-06-28 · **Branch:** `staging` · **Repo:** github.com/hyprriq/hyprriq · **Working dir:** `D:\Projects\Hyprriq\portal` (lowercase "iq" — NOT HyprrX, which is the marketing site).
**Read this + the auto-memory `project-pipeline-state.md` first. Don't re-derive — resume.**

## TL;DR — where we are
Track 2 (Supply Chain Relationship) is **CODE-COMPLETE, LIVE-VALIDATED, and FROZEN**. Inngest durabilization is **live + validated**. The next phase is **Track 0.5 — Supplier Identity Resolution (slot 5.1c.5)**: the **spec + implementation plan are written, committed, and refined — AWAITING the founder's full plan review/approval before ANY code.** After Track 0.5: retrofit Track 1 to consume `resolved_domain` (fast follow), then 5.1d (Track 3).

## What shipped & is FROZEN/locked this session (do not reopen)
1. **Portal submit redirect fix** — was hanging on a synchronous `runPipeline`. Now decoupled.
2. **Inngest durabilization (Chunk A) — LIVE + validated** (TD Synnex/Lenovo, 84s full run). `pipeline/run-case` durable function: `set-running → track-0 → fan-out tracks 1–4 (parallel, registry-driven) → track-5 → synthesis → verdict → memory-write → finalize`. Submit now `inngest.send` + returns instantly. Code-owned `pipeline.registry.ts` (PIPELINE_VERSION 1.0.0). Stages extracted to `pipeline.steps.ts` (shared by `runPipeline` [dev route] + the Inngest fn).
   - **Inngest infra fix:** `/api/inngest` made public in Clerk `proxy.ts` (guarded by `lib/auth/public-routes.test.ts`); `serveOrigin`/`servePath` pinned via `INNGEST_SERVE_ORIGIN` env (set on staging Vercel to the stable branch URL); founder synced the `hyprriq` app manually (Inngest dashboard).
3. **Post-submission confirmation screen** — `submit-form.tsx` shows a receipt (case#, supplier, brands, ETA via `PLAN_SLA_DAYS`, credits, View case/Submit another/My cases). Live-progress polling on the case page (`isResearchInProgress`).
4. **Track 2 — FROZEN** (commit `9ec6356`). ADR-T2-001 (`docs/adr-t2-001-loa-exclusion.md`) is the canonical record: LOA excluded from authorization scoring (Compliance layer is future), + the **provenance trust-model correction**:
   - Official-domain classification (metadata-driven `ClassifyContext`: brand domains → `official_brand`, vendor domain → `official_company`), threaded orchestrator→plugin→`buildProvenance`. Optional → Track 1 + frozen pack unchanged.
   - `dealer_page_listed` → `official_brand` only; vendor self-claim → `claims_authorization_unverified`. `no_connection_found` broadened.
   - Provenance gate **v1.1.0**: accepts if ANY cited source matches (was highest-authority-only).
   - `hostOf` normalizes loosely-formatted `vendor_website` (protocol-less/www/path/any-case protocol/whitespace).
5. **x.com classifier fix** (`1adfa31`) — social domains hostname-anchored (`tdsynnex.com`/`netflix.com` no longer → social). ⚠ **Changed source classification → Track 1 (frozen) should get a quick live re-validation to confirm unchanged** (predicted no-effect; Ingram Micro re-run already confirmed Track 1 `infer` unchanged).

**194 tests green. tsc + eslint + next build clean.** `deriveTrackSignal`/`computeVerdict`/`weights.ts` scoring + Evidence Pack contract (`schema_version 1.0.0`) UNTOUCHED throughout.

## The live-validation saga (Track 2) — resolved
First Track 2 live run: all 11 evidence items provenance-rejected. Root cause = the classifier never produced `official_brand`/`official_company` (everything → `news`). Fixed (item 4 above). Second run failed on `dealer_page_listed` again — root cause = **`vendor_website` was not entered** (so `tdsynnex.com` → `news`, not `official_company`); **missing input, not a bug.** Third run with `https://www.tdsynnex.com` entered = clean → froze Track 2.

## NEXT — Track 0.5 (Supplier Identity Resolution), slot 5.1c.5
**Spec:** `docs/superpowers/specs/2026-06-28-track0.5-supplier-identity-resolution-design.md`
**Plan:** `docs/superpowers/plans/2026-06-28-track0.5-supplier-identity-resolution.md` (9 TDD tasks)
**Status:** committed (`c04a814`) + the founder's typo/normalization refinement folded in. **AWAITING founder's full plan review.** No code until approved.

**Why:** `vendor_website` was a hard, optional dependency — blank → engine silently loses domain-age (T1) + official-domain classification (T2). The founder's framing: clients (1) don't always give a website, (2) don't always spell the name right, (3) a name may match multiple real companies. Track 0.5 resolves the supplier's identity once into a `SupplierIdentity` object all tracks consume; `vendor_website` becomes one high-confidence input, not a precondition.

**Design (approved OQ-1..4):** new stage between Track 0 and fan-out; LLM proposes candidates, **conservative deterministic resolver** decides (under-resolve > false official classification); provided-website = high-confidence fast-path; ambiguity → `manual_review_required` escalation (computeVerdict stays locked); Track 2+ wired to `resolved_domain`, Track 1 retrofit deferred (fast follow).
**Founder's 5th refinement (folded in `c04a814`):** typos/aliases/OCR on a high-confidence entity resolve **silently** (`resolution_method: "normalized"`, fuzzy `name_match`, no penalty/no escalation) — DISTINCT from genuine multi-candidate ambiguity (still escalates). `original_input` (raw client name+website) is ALWAYS preserved/logged (audit). Tracks use canonical `resolved_name` only. Required test: `"TD Synexx"` → `"TD SYNNEX Corporation"` high-confidence, zero warning.
**OUT of scope (deferred):** doc upload/parsing, DUNS/VAT/SEC integrations, marketplace (Alibaba/WC) scraping.
**Migration (Task 1, founder-run gate):** `cases.supplier_identity jsonb`.

## Migrations applied to prod this session (founder ran)
`20260628010000` cases.pipeline_version · `20260628020000` case_track_results.questions_to_ask. **Pending (Track 0.5 Task 1):** `20260628030000` cases.supplier_identity (not yet written/run — first step when Track 0.5 starts).

## Open items / gotchas
- **Track 1 re-validation** for the x.com fix (predicted no-change; Ingram re-run confirmed `infer` unchanged — treat as done unless founder wants formal sign-off).
- **`vendor_website` stays optional** (Track 0.5 supersedes "make it required").
- **`main` is stale** ("Initial commit"); all work is on `staging`. Promote staging→main before go-live (then set `INNGEST_SERVE_ORIGIN` + Inngest sync for the prod domain). See `reference-stripe-supabase-vercel.md` memory.
- **Vercel = Hobby (60s function cap).** Inngest steps each < 60s; fine. Don't reintroduce synchronous long work in a request.
- Build detail noted in the Track 0.5 plan: extract a shared host-normalization helper (`hostOf`/`domainLabel`) so resolver + classifier parse identically (DRY).

## Key commits this session (staging)
`df6f869` redirect-decouple · `a2241f0` parallel acquisition · `2455697` registry+pipeline_version mig · `34add98`/`0b4a2da`/`56718be` Track 2 contracts/firewall/plan · `5c49c58` Inngest fn+submit · `51ac588` serveOrigin · `d15e86e` Clerk public route · `675b2f5` public-routes guard · `b094752` questions_to_ask persist+render · `b3759e5` provenance trust-model fix · `1adfa31` x.com anchoring · `ad5567a` source_url in audit · `9ec6356` hostOf normalize + Track 2 FROZEN/ADR · `f07acc6`/`c04a814` Track 0.5 spec+plan(+refinement).

## Working rhythm (founder standing orders)
- Verify (tsc+eslint+vitest+next build) + commit + push staging each change; honest progress.
- Gate-based: spec → founder review → plan → founder review → build (TDD) → founder live-validation → freeze. **No code until the plan is approved.**
- Migrations: write → founder runs → confirm via information_schema → then code. Flag destructive/dashboard steps.
- Proactively hunt + fix bugs/off-track logic in the same pass; flag premises that look wrong before building on them.
- Founder runs all live validations (prod Supabase + real API keys); Claude Code never touches prod data.
- Founder hands prompts as `.md` files in Downloads/Desktop; apply the relevant skill lens (`/architecture`, `/using-superpowers`, brainstorming → writing-plans).

## Key identifiers
Supabase `mjkacjrrrmlwlwkienvq.supabase.co` (single project, prod) · Inngest app `hyprriq` (Production env) · staging URL `hyprriq-git-staging-hyprrx-hyprriq.vercel.app` · founder Clerk `user_3FMpveJshdQq9bDAzxygPyPaMy2`.

## IMMEDIATE next action for the new session
The founder asked (this MD) to confirm the 5th refinement is in the spec — **it now is** (`c04a814`; points 1–5 folded into both spec + plan). **Wait for the founder's full Track 0.5 plan review.** On approval: execute the plan task-by-task (TDD, commit each), hand Task 1's `cases.supplier_identity` migration to the founder as the gate, build Tasks 2–7 (migration-independent), gate Task 8 on the migration, then founder live-validation → freeze Track 0.5 → retrofit Track 1 → 5.1d (Track 3).
