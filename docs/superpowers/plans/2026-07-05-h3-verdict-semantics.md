# H3 — Verdict Semantics Implementation Plan (stubs stop scoring; all four verdicts reachable)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** DRAFT — founder-review artifact. **No code until approved** (same gate as H1/H2, both FROZEN 2026-07-05).
**Phase:** H3 ONLY. No prompt changes, no firewall changes, no Track 3 work.

**Goal:** an unbuilt dimension is an *absence*, not a *finding* — stub Tracks 3/4/5 stop scoring `soft_fail`, the Track-3 floor that pins every case at `verify_before_purchase` disappears, a legitimate supplier can finally clear (to `usable_with_conditions`), and the report says honestly which dimensions were not assessed.

**The defect being fixed (audit N2, live-confirmed):** stubs return empty evidence with no marker (`lib/research/track3.ts:5-13`), `deriveTrackSignal` maps empty→`soft_fail` (`signals.ts:34`), and Track 3's soft-fail floors every case (`verdictEngine.ts:91`). Production shows `soft_fail ×24` uniform on tracks 3/4/5 — only two of four verdicts have ever been reachable by an AI case.

**Approved semantics (design-round OQ-1):** while `brand_risk_assessment` is unassessed, the score-verdict is **capped at `usable_with_conditions`** — a `source_clear` that never examined brand risk (30% weight, "the actual account risk") is indefensible. The cap is keyed on Track 3 specifically; it disappears the day Track 3 ships by deleting call-sites, with `computeVerdict` untouched.

**Frozen-core guarantee:** `deriveTrackSignal`, `computeVerdict`, `weights.ts`, firewall, Evidence Pack contract, H1 ledger, H2 failure taxonomy — untouched. The ceiling is a **pure wrapper applied after** `computeVerdict`, never inside it.

**Migration: NONE.** `'skipped'` already exists in every `track_N_status` CHECK (`initial_schema.sql:169-178`, verified this session) and no new columns are needed. One founder sanity query only (below).

---

## BUG FOUND WHILE PLANNING (drives the design — would have shipped a divergence)

The admin verdict panel does **not** read `cases.verdict` — it **recomputes** `computeVerdict` from the persisted rows (`lib/research/verdictViewModel.ts:113`), and `scripts/rejudge-case.ts` recomputes it too (AT-3 of H1). A ceiling applied only in the pipeline would make the stored verdict `usable_with_conditions` while the admin panel shows `source_clear` and the rejudge determinism proof FAILS. **Therefore the ceiling must be one shared pure function called at all three sites**: `stageVerdict` (pipeline), `buildVerdictViewModel` (admin), `rejudge-case.ts` (proof). Task 3 builds it; Tasks 4–5 wire the other two sites; AT-3 validates the three agree.

Also note (not a bug, a distinction H3 must preserve): after H2 there are now **three causes of `n_a`** — plan-excluded, failed (acquisition/LLM → escalates, held), and now not-implemented (deliberate absence → does NOT escalate, auto-approved). Each writes a distinct marker in `compiled_findings_json` so the ledger stays auditable.

---

## ACCEPTANCE TESTS (defined up front — founder validates before H3 freezes)

**AT-1 — stubs stop scoring; no escalation from absence.** Re-run ONE healthy case (recommend a TD Synnex case — Track 1 scored `pass` in the July re-runs) via the harness, then:
```sql
SELECT track, track_verdict_signal, manual_review_required, founder_review_status,
       compiled_findings_json->>'not_implemented' AS not_impl
FROM case_track_results WHERE case_id = '<CASE_ID>' AND attempt_number = <NEW_ATTEMPT> ORDER BY track_number;
SELECT status, verdict, track_3_status, track_4_status, track_5_status FROM cases WHERE id = '<CASE_ID>';
```
PASS = tracks 3/4/5 are `n_a` with `not_impl = 'true'`, `manual_review_required = false`, `founder_review_status = 'approved'`; `track_3/4/5_status = 'skipped'`; **no `soft_fail` anywhere from stubs**; case at `awaiting_review` (absence ≠ failure ≠ escalation).

**AT-2 — a legitimate supplier can clear, and the ceiling holds.** Same case: PASS = `cases.verdict` is **`usable_with_conditions`** (or better than `verify_before_purchase` at minimum) when Track 1/2 score well — the audit's "legit supplier can never clear" is closed — AND the admin verdict panel shows the same verdict with the ceiling explained ("score qualified for Source Clear; capped — Brand Risk not assessed") plus the not-assessed dimension list. A hard-fail case (JC Sales/globaldist class) must still produce `do_not_rely` — the cap never rescues a bad case, it only limits a good one.

**AT-3 — the three verdict sites agree (determinism proof extended).**
```
npx tsx --env-file=.env scripts/rejudge-case.ts <CASE_ID>
```
PASS = rejudge PASS (exit 0) on the new attempt — the rejudged, ceiling-applied verdict equals `cases.verdict`, and the admin panel shows the same. One function, three sites, zero divergence.

**Founder sanity query (no migration to run):**
```sql
SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'cases_track_3_status_check';
-- or the inline equivalent: confirm 'skipped' present (verified in code review already)
```

**Unit-covered residual:** the client-facing "dimensions not assessed" note renders only on delivered cases; with publish still scanner-blocked on dirty test data (until H5), it validates live at the first clean publish alongside H1's pin-write caveat.

---

## TASKS (execute after founder approves the plan)

### Task 1: stubs declare themselves (`not_implemented`)

**Files:** Modify: `lib/research/contracts.ts` (TrackOutput), `lib/research/track3.ts`, `lib/research/track4.ts`, `lib/research/track5.ts` · Test: Create `lib/research/stubs.test.ts`

- [ ] **Step 1: failing test:**
```ts
import { runTrack3 } from "./track3";
import { runTrack4 } from "./track4";
import { runTrack5 } from "./track5";
it("H3: unbuilt tracks declare not_implemented and carry no evidence", async () => {
  for (const [fn, key] of [[runTrack3, "brand_risk_assessment"], [runTrack4, "documentation_review"], [runTrack5, "sourcing_logic"]] as const) {
    const out = await fn(ctx);
    expect(out.not_implemented).toBe(true);
    expect(out.track_key).toBe(key);
    expect(out.evidence_items).toHaveLength(0);
  }
});
```
- [ ] **Step 2:** run → FAIL. **Step 3: implement** — `TrackOutput` gains `not_implemented?: boolean` ("dimension not built yet: a deliberate ABSENCE — n_a + skipped, never scored, never escalated"); each stub returns `not_implemented: true` with `reasoning_notes: "dimension not yet available — excluded from scoring"` (drop the `"stub track_N for case <uuid>"` strings). **Step 4:** PASS. **Step 5:** Commit `H3: stubs declare not_implemented — absence, not finding`.

### Task 2: pipeline maps absence → `n_a` + `skipped`, never escalates

**Files:** Modify: `lib/research/pipeline.steps.ts` (`stageFindingTrack`, `FindingTrackResult`, `stageFinalize`), `lib/inngest/functions/pipeline.ts`, `lib/research/pipeline.ts` (aggregate `skippedTracks`) · Test: extend `lib/research/pipeline.steps.test.ts`, `lib/inngest/functions/pipeline.test.ts`

- [ ] **Step 1: failing tests:**
```ts
it("H3: not_implemented → n_a, auto-approved, NOT held, NOT failed", async () => {
  runTrack1.mockResolvedValue({ track_key: "supplier_identity", evidence_items: [], reasoning_notes: "dimension not yet available", unknowns: [], not_implemented: true });
  const r = await stageFindingTrack(ctx, 1);
  expect(r.signal).toBe("n_a");
  expect(r.failed).toBe(false);
  expect(r.not_implemented).toBe(true);
  const row = upsertTrackResult.mock.calls[0][0];
  expect(row.manual_review_required).toBe(false);
  expect(row.founder_review_status).toBe("approved");
  expect(row.compiled_findings_json.not_implemented).toBe(true);
});
it("H3: stageFinalize marks not-implemented tracks 'skipped' and does NOT escalate", async () => {
  statusMaybeSingle.mockResolvedValueOnce({ data: { status: "research_running" } });
  await stageFinalize(ctx, { included: new Set([1, 2, 3]), identityAcquisitionFailed: false, failedTracks: new Set(), skippedTracks: new Set([3]), verdict: "usable_with_conditions", confidence_0_15: 10 });
  expect(lastUpdate().status).toBe("awaiting_review");
  expect(lastUpdate().track_3_status).toBe("skipped");
});
```
- [ ] **Step 2:** FAIL. **Step 3: implement** — `stageFindingTrack` gains a `not_implemented` branch BEFORE the failure guards: persist `n_a` row (`founder_review_status: "approved"`, `manual_review_required: false`, `compiled_findings_json: { signal: "n_a", not_implemented: true, summary: out.reasoning_notes }`, throw-on-persist-error per H2), return `{ signal: "n_a", failed: false, not_implemented: true, track_number: n, … }`. `FindingTrackResult` gains `not_implemented: boolean` (both other branches return `false`). `stageFinalize` args gain `skippedTracks?: Set<number>`; status loop order: not-included → `skipped`; `skippedTracks` → `skipped`; `failedTracks` → `manual_required`; else `complete`. Escalation expression UNCHANGED (skipped ∉ escalate). Both orchestrators aggregate `skippedTracks` from `r.not_implemented`. **Step 4:** full suite PASS. **Step 5:** Commit `H3: absence → n_a + skipped, never escalated (three n_a causes now distinct)`.

### Task 3: the verdict ceiling (shared pure function)

**Files:** Create: `lib/research/verdictCeiling.ts` · Test: Create `lib/research/verdictCeiling.test.ts` · Modify: `lib/research/pipeline.steps.ts` (`stageVerdict`)

- [ ] **Step 1: failing tests** (the reachability matrix):
```ts
import { applyVerdictCeiling } from "./verdictCeiling";
import { computeVerdict } from "./verdictEngine";
const synth = EMPTY_SYNTH; // stub-shaped SynthesisOutput fixture
it("caps source_clear at usable_with_conditions while brand risk is unassessed", () => {
  const v = computeVerdict({ supplier_identity: "pass", supply_chain_relationship: "pass", brand_risk_assessment: "n_a", documentation_review: "n_a" }, synth);
  expect(v.verdict).toBe("source_clear"); // score says clear…
  const c = applyVerdictCeiling(v, { supplier_identity: "pass", supply_chain_relationship: "pass", brand_risk_assessment: "n_a", documentation_review: "n_a" });
  expect(c.verdict).toBe("usable_with_conditions"); // …ceiling says not without brand risk
  expect(c.ceiling_applied).toBe(true);
  expect(c.original_verdict).toBe("source_clear");
  expect(c.unassessed).toContain("brand_risk_assessment");
});
it("never rescues a bad case: do_not_rely and verify_before_purchase pass through untouched", () => {
  const bad = computeVerdict({ supplier_identity: "hard_fail", brand_risk_assessment: "n_a" }, synth);
  expect(applyVerdictCeiling(bad, { supplier_identity: "hard_fail", brand_risk_assessment: "n_a" }).verdict).toBe("do_not_rely");
});
it("no-op when brand risk IS assessed (the day Track 3 ships)", () => {
  const v = computeVerdict({ supplier_identity: "pass", supply_chain_relationship: "pass", brand_risk_assessment: "pass", documentation_review: "pass" }, synth);
  const c = applyVerdictCeiling(v, { supplier_identity: "pass", supply_chain_relationship: "pass", brand_risk_assessment: "pass", documentation_review: "pass" });
  expect(c.verdict).toBe("source_clear");
  expect(c.ceiling_applied).toBe(false);
});
```
- [ ] **Step 2:** FAIL. **Step 3: implement** `lib/research/verdictCeiling.ts` (pure; ~30 lines):
```ts
// H3 — verdict ceiling (approved OQ-1): while brand_risk_assessment is unassessed (n_a/absent),
// the score-verdict is capped at usable_with_conditions. Applied AFTER the frozen computeVerdict
// at ALL THREE verdict sites (pipeline stageVerdict, admin buildVerdictViewModel, rejudge script)
// so stored / displayed / re-derived verdicts can never diverge. Downgrades ONLY source_clear;
// never upgrades. Delete the call sites when Track 3 ships — computeVerdict stays untouched.
export interface CeilingResult {
  verdict: Verdict; ceiling_applied: boolean; original_verdict: Verdict;
  unassessed: TrackKey[]; ceiling_reason: string | null;
}
export function applyVerdictCeiling(result: VerdictResult, signals: Partial<Record<TrackKey, TrackSignal>>): CeilingResult {
  const unassessed = SCORING_TRACKS.filter((t) => !signals[t] || signals[t] === "n_a");
  const brandRiskUnassessed = unassessed.includes("brand_risk_assessment");
  if (brandRiskUnassessed && result.verdict === "source_clear") {
    return { verdict: "usable_with_conditions", ceiling_applied: true, original_verdict: "source_clear", unassessed,
      ceiling_reason: "Score qualified for Source Clear, capped at Usable With Conditions — Brand Risk Assessment was not part of this report." };
  }
  return { verdict: result.verdict, ceiling_applied: false, original_verdict: result.verdict, unassessed, ceiling_reason: null };
}
```
(`SCORING_TRACKS` duplicated locally as a const of the four scoring keys — do not export from the frozen `verdictEngine.ts`.) `stageVerdict` applies it and the orchestrators persist `ceiled.verdict` to `cases.verdict` (confidence_0_15 unchanged — it describes the evidence, not the cap). **Step 4:** PASS. **Step 5:** Commit `H3: verdict ceiling — source_clear requires brand risk assessed (shared pure fn)`.

### Task 4: the other two verdict sites + surfaces

**Files:** Modify: `lib/research/verdictViewModel.ts:113` area (apply ceiling; expose `ceiling_applied/ceiling_reason/unassessed` on the view model), `components/admin/case-review.tsx` (one line under the verdict panel showing ceiling reason + not-assessed list), `scripts/rejudge-case.ts` (apply ceiling before comparing), `components/portal/case-detail-view.tsx` (delivered-only limitation note derived from existing `track_N_status === "skipped"` — zero new data plumbing; client-facing dimension names, e.g. "This report did not assess: Brand Risk Assessment, Documentation Review, Sourcing Logic.") · Test: extend `lib/research/verdictViewModel.test.ts`

- [ ] **Step 1: failing test:** viewModel on signals with `brand_risk_assessment: "n_a"` and score-clear inputs → `verdict === "usable_with_conditions"`, `ceiling_applied === true`. **Step 2:** FAIL. **Step 3:** implement all four surfaces. **Step 4:** full suite PASS. **Step 5:** Commit `H3: ceiling at all three verdict sites + honest not-assessed surfaces (admin + client)`.

### Task 5: full verify + tracker + push

- [ ] `npx tsc --noEmit && npm run lint && npm test && npm run build` → all PASS.
- [ ] Update `D:\Projects\Hyprriq\Docs\HyprrIQ_OPEN_ITEMS.md`: H3 → 🟡 built, pending AT-1/2/3.
- [ ] Commit + push `staging`.

---

## EXECUTION ORDER & FOUNDER GATES

1. Founder approves this plan (no OQs — the ceiling rule was decided in the design round; the one design decision made here is the shared-function placement, forced by the divergence bug above).
2. No migration. I execute Tasks 1–5 (TDD, commit per task, full verify) → push → deploy.
3. **Founder validates AT-1 (stubs stop scoring, no escalation), AT-2 (legit supplier clears to UWC + ceiling explained; bad case still DNR), AT-3 (rejudge PASS — three sites agree).**
4. H3 freezes → H4 (Identity coherence — tracks research the resolved entity; the phase that actually validates Spec B).

## Notes & suggestions logged (per standing bug-check order)
- **Divergence bug (found in planning, fixed by design):** verdict recomputation at `verdictViewModel.ts:113` and in the rejudge script would silently disagree with a pipeline-only ceiling — hence the shared pure function. This is also the pattern rule for every future post-verdict adjustment: *one function, all sites, or it doesn't ship.*
- **Suggestion (H5 material, logged not built):** the client limitation note's dimension names must come from a client-language constant, not `track_key` strings — the note text in Task 4 uses display names and will be covered by the banned-language scan when H5 extends scanning to all client-visible strings.
- **Suggestion (Track 3 build, logged):** when Track 3 ships, its build checklist must include "delete the two ceiling call-sites + the `no-op when assessed` test flips to primary" — the ceiling is designed to die, not accumulate.
- **Observation:** with H3, expected production verdict distribution changes materially (VBP-floor disappears). The 8-case re-run set becomes the before/after exhibit for the eventual backtesting harness (Bucket C) — worth re-running all 8 after H3 freezes to see the corrected distribution.
