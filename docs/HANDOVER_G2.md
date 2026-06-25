# HyprrIQ — Session Handover (Intelligence OS, Phases 1–3 complete)

**Read this + the auto-loaded memory `project-pipeline-state.md` first. Don't re-derive — resume.**
**Date:** 2026-06-25 · **Branch:** `staging` · **HEAD:** `670f9a3` · **Repo:** github.com/hyprriq/hyprriq · **DB:** Supabase `hyprriq / main PRODUCTION` (single project; founder runs migrations by hand; gh NOT installed → PRs via compare URL).
**Working dir:** `D:\Projects\Hyprriq\portal` (lowercase "iq"; ignore any HyprrX cwd).

## What HyprrIQ is now
A **Decision Intelligence OS**. Authoritative docs (in `D:\Projects\Hyprriq\Docs`): **Tech Arch v1.4**, **ADR-G004** (verdict), **ADR-G005** (synthesis), **ADR-G006** (memory), **Master Prompts v2.1**, **Phase G1 Brief**, **CTO Addendum**. Governing ADRs = G001–G006. **Ignore ADR-010 (doesn't exist).**

## The architecture (5 layers, strictly separated in code)
`Evidence(1, LLM) → Normalization(2, code) → [Evidence-Graph seam 2.5, reserved passthrough] → Intelligence(3, adaptive LLM, 9-module synthesis) → Judgment(4, deterministic code) → Communication(5, code, explains-only)`.
- **Human review is OPTIONAL, never required** — engine reaches report-ready autonomously.
- **AI never produces the verdict** — deterministic code does (same input → same verdict).
- **Synchronous for now**; Inngest enters Phase 5 (real track calls). Pipeline is transport-agnostic so the swap is clean.

## Locked decisions (don't re-litigate)
6 enhancements approved: (1) code-derived signals (LLM returns evidence only), (2) evidence-hash determinism/memoization, (3) outcome calibration (write-side now/services later), (4) provider-agnostic `runModel()` — **dev/test = Sonnet 4.6 for ALL incl synthesis; Opus 4.8 for synthesis = config swap before go-live**, (5) full version vector on case_synthesis, (6) `ios_version`. Principle: deterministic reasoning first, model second, upgrades third. **Keep live TEXT PKs** (clients.id text = clerk id) — do NOT adopt v1.4's uuid redesign. **Phase order:** 1 schema → 2 skeleton → 3 deterministic contracts → 4 intelligence engine → 5 track automation → 6 synthesis → 7 calibration. **Verify (tsc+eslint+vitest+next build) + commit/push to staging each change. Confirm a migration is APPLIED (information_schema), not just that pre-flight ran.**

## DONE — Phases 1–3 (all verified + pushed)
- **Phase 1 (migrations, all APPLIED + column-verified):** `case_track_results` = ADR-G001 authoritative + v2.1 evidence cols (evidence_items, reasoning_notes, unknowns, track_verdict_signal, suggested_signal, failure_type, evidence_weights_applied); `track_key` canonical (`intake_scope_guard`/supplier_identity/supply_chain_relationship/brand_risk_assessment/documentation_review/sourcing_logic; transitional CHECK still allows legacy `intake`); `case_synthesis` table (+evidence_hash + version vector + ios_version, admin RLS); `cases.synthesis_status` + `synthesis_running` status; `agencies` + nullable `agency_id`. `research_findings` = legacy (no new writes).
- **Phase 2 (skeleton + wired pipeline):** `lib/research/pipeline.ts` `runPipeline()` orchestrates the 5 layers, called from `app/api/cases/submit/route.ts` (replaced G1 orchestrator). `lib/ai/runModel.ts` + `providers/anthropic.ts` (stub throws until Phase 5). Layer stubs `track1–5.ts`, `track0.ts` (real intake), `normalize.ts`, `graph.ts`, `synthesisEngine.ts`, `verdictEngine.ts`, `reportBuilder.ts`, `ios.ts`. `lib/data/synthesis.ts`, `lib/data/intelligence.ts` (no-op seam). Reaches `awaiting_review` autonomously; writes `case_synthesis`.
- **Phase 3 (deterministic contracts):** `lib/research/weights.ts` (ADR-G003), `signals.ts` `deriveTrackSignal` (code-derived), `verdictEngine.ts` `computeVerdict` (ADR-G004 weighted + 8 vetoes + decision_confidence + confidence_0_15), real SHA-256 `evidence_hash`, memoization. **53 vitest tests** incl ADR-G004 worked example (2.0→VBP) + all vetoes. Stub tracks now → `soft_fail` → verdict `verify_before_purchase` via real veto.

## NEXT — pick up here
**Recommended: Phase 4 (NO API keys)** — surface the real signals/verdict/reasoning in the admin Case Review UI; rework the review screen for the autonomous model (show AI-populated signals + per-track confidence + verdict reasoning + OPTIONAL override, not required scoring); fold in backlog: **archetype investigation playbooks** + **identity-mismatch matrix** (claimed vs observed). All buildable + UI-verifiable now.
**Then Phase 5 (needs keys):** real LLM tracks — add `ANTHROPIC_API_KEY` + `WHOIS_API_KEY` + `SERPER_API_KEY` to Vercel + `.env.local`; stand up Inngest (keys already set); implement `providers/anthropic.ts` real call (web_search_20250305, temp 0, structured JSON) via `runModel`; tracks emit `evidence_items` tagged with `weight_key` (ADR-G003 keys) so the code signal engine scores them. **Phase 6:** real Opus 9-module synthesis. **Phase 7:** calibration.

## Open flags / cleanups
- ⚠ `vendor_intelligence` / `brand_intelligence` tables DON'T EXIST (live DB has `supplier_cache`/`brand_cache`) → ADR-G006 write-side (`lib/data/intelligence.ts`) is a no-op until a migration creates them. Needed before the corpus can build (do early — memory can't be reconstructed retroactively).
- Cleanup later: drop legacy `intake` from track_key CHECK (post-stabilization); drop `research_findings`; remove superseded `lib/research/orchestrator.ts` (still has a passing test; unused by submit).
- Client UX question (flagged): what the client sees DURING research + whether to show a verdict while "In Review" — for the report/UX phase.
- F.11-era founder TODOs still open if not done: mirror Stripe env to Vercel; retest top-up + cancel; open PR `main...staging` (compare URL).
