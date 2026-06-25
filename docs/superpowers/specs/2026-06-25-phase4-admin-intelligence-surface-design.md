# Phase 4 — Surface the Intelligence Engine in Admin Review (design)

**Date:** 2026-06-25 · **Branch:** `staging` · **Builds on:** Phases 1–3 (HEAD `670f9a3`+handover).
**Goal:** Make the complete deterministic reasoning flow visible and validatable in the Admin UI using
the existing persisted schema and stub data — **before** any live providers (Phase 5).

Flow to surface:
`Evidence → Track Intelligence → Cross-Track Intelligence → Deterministic Verdict → Executive Intelligence Summary → Report`

## Core principle (founder-locked)
The existing schema is the **single source of truth**. Phase 4 introduces **no parallel domain
objects**. "Executive Intelligence Summary" is the UI name for **Module 9 of ADR-G005**, persisted
in `case_synthesis.decision_snapshot`. The deterministic verdict detail is **recomputed at read time
from persisted inputs** (Fork A) — no new columns, no migration.

## Fork A — recompute the verdict at read time
The full `VerdictResult` (`weighted_score`, `veto_fired`, `veto_reasons`, `decision_confidence`) is
computed in `computeVerdict()` but **not persisted** (only `cases.verdict` + `cases.confidence_score`).
Phase 4 re-runs `computeVerdict(signals, synthesis)` server-side from persisted inputs:
- `signals` ← `case_track_results.track_verdict_signal` (per scoring track)
- `synthesis` ← `case_synthesis` row (contradictions etc.)

Deterministic by design → faithful to what the engine decided, and it makes the determinism property
observable. **Persisting a verdict snapshot is deferred to Phase 7 (calibration)** — flagged, not built.

## Single assembly service — `buildVerdictViewModel()`
One server-side function is the **only** place that assembles the view model. The UI never reconstructs
verdict/synthesis state directly.

Location: `lib/research/verdictViewModel.ts` (pure assembly; no I/O). Data is fetched by the data layer
and passed in, keeping the assembler unit-testable.

```ts
buildVerdictViewModel(input: {
  trackRows: CaseTrackResultRow[];      // from getCaseTrackResults (v2.1 evidence cols)
  synthesis: SynthesisOutput | null;    // from getCaseIntelligence (case_synthesis row)
  ios: IosVersion | null;               // version vector for the Engine Trace
}): VerdictViewModel
```

`VerdictViewModel` (assembled, not persisted) groups the screen sections:
- `executiveSummary` — Module 9 fields: headline, leading_interpretation, the_real_risk,
  what_to_monitor (watch points), and **what_to_verify = Module 8 `vendor_questions`**.
- `verdict` — full `VerdictResult` from recomputed `computeVerdict()` (verdict, weighted_score,
  decision_confidence, confidence_0_15, veto_fired, veto_reasons).
- `crossTrack` — contradictions (Module 4, with is_load_bearing / risk_level), hypotheses (Module 5),
  doubt_calibration (Module 7).
- `tracks[]` — per finding track: dimension label, `track_verdict_signal` + band + score_0_15,
  evidence_items, reasoning_notes, unknowns.
- `trace` — IOS version vector + evidence_hash + raw signal scores (Engine Trace, collapsed by default).
- `engineComplete` — whether synthesis/verdict data exists (drives empty state).

## Data layer — one new read
Add `getCaseIntelligence(caseId)` to `lib/data/synthesis.ts` (admin/service-role): returns the full
`case_synthesis` row mapped to `{ synthesis: SynthesisOutput; ios: IosVersion }` (all 9 modules + the
version vector). Reuses existing contracts; no new tables/types. `getCaseTrackResults` already returns
the v2.1 evidence columns.

## Reworked review screen (`components/admin/case-review.tsx` + review page)
Replaces the manual-scoring gate. Order, top → bottom:

1. **Executive Intelligence Summary** — Module 9. Headline · Leading Interpretation · The Real Risk ·
   What to Monitor · What to Verify (vendor questions).
2. **Verdict Panel** — final verdict + weighted_score + decision_confidence + confidence_0_15; if
   `veto_fired`, list `veto_reasons` prominently ("Verdict locked/floored by: …").
3. **Cross-Track Intelligence** — contradictions (load-bearing / risk badges), hypotheses,
   doubt calibration.
4. **Track Intelligence** — per track: signal chip + band/score, evidence items, reasoning summary,
   unknowns.
5. **Founder Decision** (not "Override") — review is **optional, never required**. Actions:
   - **Publish** — deliver the engine's report as-is.
   - **Override** — change the verdict; requires a reason (audit).
   - **Request Further Investigation** — send the case back for more evidence (status transition).
   - Notes/redaction supported; banned-language check stays on the delivery path.

**Engine Trace** — collapsible panel (collapsed by default) showing the IOS version vector,
evidence_hash, and raw per-track signal scores. Audit/determinism affordance.

## API rework — `app/api/admin/cases/[id]/review/route.ts`
Accept `{ action: 'publish' | 'override' | 'request_investigation', override_verdict?, reason?, notes? }`
instead of required dimension scores. `override` requires `override_verdict` + `reason`;
`request_investigation` transitions case status back to in-research. Keep the banned-language gate.

## Out of scope (deferred to Phase 5)
Archetype investigation playbooks and the identity-mismatch matrix — no real evidence feeds them until
live tracks run. Flagged, not built.

## Testing & verification
- Unit-test `buildVerdictViewModel()` (vitest): stub-data case assembles correct sections; verdict
  recomputation matches `computeVerdict()`; empty state when no synthesis.
- `tsc + eslint + vitest + next build` green.
- Seed one case through `runPipeline` (stub data) and verify the review screen renders the full flow in
  the browser preview.
- Commit + push to `staging` per build discipline.
