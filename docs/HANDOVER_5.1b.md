# HyprrIQ — Session Handover · Phase 5.1b Track 1 Intelligence

**Date:** 2026-06-28 · **Branch:** `staging` · **HEAD:** `e2fc01b` · **Repo:** github.com/hyprriq/hyprriq
**Working dir:** `D:\Projects\Hyprriq\portal` (lowercase "iq"). gh NOT installed; PRs via compare URL.
**Read this + the auto-memory `project-pipeline-state.md` first. Don't re-derive — resume.**

## TL;DR — where we are
Phase 5.1b (Track 1 = Supplier Identity intelligence) is **CODE-COMPLETE and pushed**, with the
root-cause bug from the first live run **fixed**. The only remaining work is **founder-run live
re-validation (2 steps) → then FREEZE Track 1**. No further architectural expansion (founder order).

## The architecture (unchanged, frozen where noted)
`buildTrack1Requests` (capability matrix) → **Research Orchestrator** (Serper primary + WHOIS +
native-fallback-off) → **Evidence Pack (FROZEN schema_version 1.0.0)** → `buildTrack1Prompt` → LLM
**proposes** ADR-G003 `weight_key`s → **6-gate validation firewall** (`weightValidation.ts`) **decides**
→ `deriveTrackSignal` (UNCHANGED, locked) scores → `computeVerdict` (UNCHANGED) → `writeIntelligence`.
**Code decides what to collect + what scores; the AI only proposes.**

### Locked — do NOT touch (CTO §8 + freezes)
ADR-G003/G004/G005, `deriveTrackSignal`, `computeVerdict`, `weights.ts` scoring, and the
**Evidence Pack contract** (`schema_version 1.0.0`, guarded by `lib/research/acquisition/contract-freeze.test.ts`).

## What's built (key files, all committed)
- `lib/research/weightValidation.ts` — the firewall. Per-item gates (stop on first reject):
  `UNKNOWN → ① grounding(no_valid_citation) → ② registry → ③ track → ④ provenance → ⑤ authority(conditional)`;
  cross-item `⑥ contradiction` (dedupe; hard_fail-wins same-source; mutually-exclusive buckets:
  unequal-authority→higher wins, equal→both rejected `contradiction_equal_authority`).
  `VALIDATION_VERSION = "1.0.0"` on every record. Authority gate runs only for
  `VARIABLE_TRUST_PROFILES` (news/forum/social/marketplace/user_upload), skips fixed-trust.
- `lib/research/track1.ts` — real `runTrack1`: acquire → persist pack+metrics → prompt → `runModel`
  → parse → firewall → validated `EvidenceItem[]` (with provenance) + audit + report.
  **Acquisition-failure guard:** empty pack (0 sources) → short-circuits `acquisition_failed=true`.
- `lib/research/track1.prompt.ts` — pack-interpretation prompt + tolerant parser
  (`mapping_justification`, `counter_evidence`, `confidence`, UNKNOWN escape hatch).
- `lib/research/tracks/track1.queries.ts` — `TRACK1_CAPABILITIES` (6 active + 6 `available:false`
  future stubs) + `buildTrack1Requests`.
- `lib/research/track1.report.ts` — deterministic `track_validation_report` (generated_at is an input).
- `lib/data/track-results.ts` — row + COLS extended (weight_validation, 5 classification cols,
  track_validation_report; all optional/nullable).
- `lib/research/pipeline.ts` — Track 1 wiring: **dedupe evidence_types before scoring** (anti-double-count
  fix); classification metrics from the audit; persist all new fields; `writeIntelligence(ctx, signal)`;
  **acquisition-failure guard** → `n_a` (no verdict drag) + skip `writeIntelligence` (no corpus
  pollution) + `manual_review_required` + `track_1_status=manual_required` + case status
  `manual_override_required`.
- `lib/ai/providers/anthropic.ts` — **`parseModelJson`** (strips ```json fences + first balanced {…}
  span) + `max_tokens` 8000. This is the H2 fix (see below).
- Dev route `app/api/admin/dev/validate-track1/route.ts` — runs real `runPipeline` on a throwaway
  case (default Ingram Micro / Samsung) + returns the 5 outputs + `diagnostics` (env_present,
  acquisition_metrics, pack_summary, model_diagnostic) + evidence_hash stability + dedup view.

**144 vitest tests green. tsc + eslint + next build all clean.**

## Migrations (all APPLIED to prod main; founder ran them)
`20260626000000` vendor/brand_intelligence · `20260627000000` acquisition tables (case_evidence_packs,
case_acquisition_metrics) · `20260627010000` metrics acquisition-only · `20260627020000` evidence_hash+schema_version
· `20260627030000` retry_count+final_status · `20260628000000` case_track_results +weight_validation +5 classification
cols +track_validation_report.

## The live-validation saga (root cause FOUND + FIXED)
**Step 1 dev route, first run (Ingram Micro):** returned `evidence_items_count: 0`. Debugged via
boundary instrumentation (systematic-debugging). Evidence: `env_present` all true (keys ARE in
Vercel), all plugins `ok`, **`pack_summary.source_count: 26`** (great profile spread), `model_diagnostic.ok:true`,
6110 tokens — and `raw_json._raw` started with **` ```json `**. **Root cause = H2:** Sonnet wrapped
its (excellent) JSON in markdown fences → `JSON.parse` rejected it → empty items. **FIXED** in
`anthropic.ts` (`parseModelJson` strips fences + balanced-span fallback; +max_tokens 8000). H1
(keys-not-in-Vercel) was disproven by the instrumentation.

## NEXT — pick up here (founder-run validation, then freeze)
1. **Re-run Step 1** (after staging redeploys `e2fc01b`): browser console on staging admin →
   `fetch('/api/admin/dev/validate-track1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({vendor_name:'Ingram Micro',vendor_website:'https://www.ingrammicro.com',brands_submitted:['Samsung']})}).then(r=>r.json()).then(console.log)`
   **Expect now:** non-zero `evidence_items` (government_registration ×2, domain_age_5_plus, address_verifiable…),
   non-zero `classifications_*`, real `track_validation_report`, `vendor_intelligence.overall_risk_signal` set,
   `case_status: awaiting_review` (NOT manual_override_required), `evidence_hash_stable: true`. Confirm the
   5 outputs + dedup behaviour.
2. **Step 2 — portal submission** of the same supplier (portal → orchestrator → Inngest → runPipeline)
   → confirm outputs IDENTICAL to Step 1 (real integration gate incl. case status progression).
   ⚠ Inngest: keys set, but the research function is empty (`app/api/inngest/route.ts` functions: []);
   confirm submission actually drives `runPipeline` (it may be called synchronously from submit today,
   not via Inngest — verify the submit path) before relying on the Inngest leg.
3. **Both pass → FREEZE Track 1.** Mark Track 1 frozen; do NOT expand scope.
4. Cleanup throwaway cases: `node scripts/scenarios/cleanup.mjs` (matches `SEED-%`).

## Founder standing orders (memory)
- Verify (tsc+eslint+vitest+next build) + commit + push staging each change; honest progress.
- **Proactively hunt + fix bugs / off-track logic in the same pass** (don't make him repeat it).
  Examples caught this session: evidence_type double-count (dedupe fix); silent acquisition-failure
  → do_not_rely + corpus pollution (acquisition-failure guard).
- Migrations: write → founder runs → confirm via information_schema → then code. Flag destructive/dashboard steps.
- He hands prompts as `.md` files in Downloads; apply the relevant skill lens.

## Later phases (NOT now)
Tracks 2–5 (own query sets + the firewall pattern reused; consider moving validation metadata into the
weight registry then), real Inngest durabilization, real Opus 9-module synthesis (Phase 6), Phase 7
calibration (persist a verdict snapshot; case_outcomes; vendor×brand relationship table).
