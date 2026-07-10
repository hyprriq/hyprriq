# Inngest Pipeline Durability — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **DO NOT START — awaiting founder review (plan-only).**

**Goal:** Move the research pipeline off the in-request `after()` execution model (bounded by Vercel's 60s function cap) onto a durable Inngest workflow, so the submit endpoint returns instantly and the pipeline runs as independently-retryable steps that span as many invocations as needed.

**Architecture:** Submit creates the case + charges credits synchronously, then `inngest.send("pipeline/start")` and returns. One durable Inngest function (`pipeline/start`) runs each pipeline stage as a `step.run`: Track 0 → fan-out Tracks 1–4 in parallel (`Promise.all` of `step.run`, plan-gated) → Track 5 → synthesis → verdict → memory write → finalize/notify. **The decision logic is untouched** — `runTrack1`, `deriveTrackSignal`, `computeVerdict`, `runSynthesis`, the firewall, and the frozen Evidence Pack contract are all called exactly as today. Only the *orchestration wrapper* changes. The existing `runPipeline` is refactored to call the same extracted stage functions sequentially (kept for the dev validation route), so there is **one** source of stage logic (DRY).

**Why Inngest escapes the 60s cap (the crux):** Inngest checkpoints every `step.run` and re-invokes the function, replaying completed steps from cache. Each *step* must finish within the 60s function limit (Track 1 ≈ 25–40s ✓; the other tracks are fast), but the *workflow as a whole* is unbounded. `after()` could never do this — its work ran inside the one capped invocation.

**Tech Stack:** Inngest v4.5.1 (`inngest/next` serve — already wired at `app/api/inngest/route.ts`; client at `lib/inngest/client.ts`; `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` already set in `.env.local`/Vercel), TypeScript, Next.js 16, vitest, Supabase (`supabaseAdmin`).

**Out of scope (do not build here):** real Synthesis Engine (Phase 6 — stays a stub, called as a step), PDF rendering (Phase H), Tracks 2–5 *intelligence* (5.1c+ — they remain stubs; this plan only changes how they're orchestrated). Email content (notify step logs + sets status; wiring a real email provider is a follow-up).

---

## Status model (no migration needed)

Existing case statuses in use: `pending_intake`, `research_running`, `awaiting_review`, `manual_override_required`, `awaiting_client`. Existing per-track `cases.track_N_status`: `complete` | `skipped` | `manual_required` | `failed` | (default → UI "Queued"). The UI `dimStatus()` maps `complete`→Complete, `manual_required`→In Review, `failed`→Unavailable, `skipped`→Skipped, default→Queued.

Transitions this workflow drives (all via `supabaseAdmin` inside steps):
- `pipeline/start` begins → `cases.status = "research_running"`.
- Each finding-track step, on completion → set that `track_N_status = "complete"` (or `manual_required` on acquisition failure / `skipped` if not in plan) — gives live per-dimension progress.
- Finalize step → `status = awaiting_review` (or `manual_override_required` if identity acquisition failed), `synthesis_status = complete`, `verdict`, `confidence_score`, `track_0_status = complete`.

No new columns. (A nice-to-have "running" per-track value would need a UI tweak only, not a migration — deferred to the UI task as optional.)

---

## File structure

- `lib/research/pipeline.steps.ts` — **Create.** Extract the stage bodies from `runPipeline` into reusable, independently-callable functions (the unit both `runPipeline` and the Inngest function call). One responsibility: stage logic, no orchestration policy.
- `lib/research/pipeline.ts` — **Modify.** `runPipeline` becomes a thin sequential caller of the stage functions (dev-route behavior preserved).
- `lib/inngest/functions/pipeline.ts` — **Create.** The durable `pipeline/start` Inngest function (orchestration only: step ordering + fan-out + status).
- `app/api/inngest/route.ts` — **Modify.** Register the function (`functions: [pipelineStart]`).
- `app/api/cases/submit/route.ts` — **Modify.** Drop `after()` + `maxDuration`; `inngest.send("pipeline/start")`; return immediately.
- `components/portal/case-detail-view.tsx` — **Modify.** Poll for progress while the case is non-terminal (live progress).
- Tests alongside (`pipeline.steps.test.ts`, an Inngest-function orchestration test, submit handled by existing flow).

---

## Task 1: Extract stage functions (behavior-preserving refactor)

**Files:**
- Create: `lib/research/pipeline.steps.ts`
- Modify: `lib/research/pipeline.ts`
- Test: `lib/research/pipeline.steps.test.ts`

**Intent:** lift the existing bodies of `runPipeline` ([lib/research/pipeline.ts](../../lib/research/pipeline.ts)) into exported functions WITHOUT changing any logic. The signatures:

```ts
// lib/research/pipeline.steps.ts
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { TrackContext, TrackOutput, TrackSignal } from "@/lib/research/contracts";
import { type TrackKey, requiredFindingTracks, trackByNumber } from "@/lib/constants/tracks";
import { runTrack0 } from "@/lib/research/track0";
import { runTrack1 } from "@/lib/research/track1";
import { runTrack2 } from "@/lib/research/track2";
import { runTrack3 } from "@/lib/research/track3";
import { runTrack4 } from "@/lib/research/track4";
import { runTrack5 } from "@/lib/research/track5";
import { deriveTrackSignal } from "@/lib/research/signals";
import { normalizeEvidence } from "@/lib/research/normalize";
import { enrichWithGraph } from "@/lib/research/graph";
import { runSynthesis } from "@/lib/research/synthesisEngine";
import { computeVerdict } from "@/lib/research/verdictEngine";
import { buildReport } from "@/lib/research/reportBuilder";
import { assembleIosVersion } from "@/lib/research/ios";
import { upsertTrackResult } from "@/lib/data/track-results";
import { upsertCaseSynthesis, getSynthesisByEvidenceHash } from "@/lib/data/synthesis";
import { writeIntelligence } from "@/lib/data/intelligence";

const TRACK_FNS: Record<number, (ctx: TrackContext) => Promise<TrackOutput>> = {
  1: runTrack1, 2: runTrack2, 3: runTrack3, 4: runTrack4, 5: runTrack5,
};

// Track 0 — intake (deterministic), persists track_0 row. Returns nothing scoreable.
export async function stageTrack0(ctx: TrackContext): Promise<void> { /* move lines 37–43 */ }

// One finding track (n ∈ 1..5): run it, apply the acquisition-failure guard, derive the signal,
// persist the track row + classification metrics. Returns the output + derived signal for fan-in.
export interface FindingTrackResult { output: TrackOutput; signal: TrackSignal; acquisition_failed: boolean; }
export async function stageFindingTrack(ctx: TrackContext, n: number): Promise<FindingTrackResult> {
  /* move the per-n body: lines 50–105 (the runTrack[n] call, acquisition-failure guard upsert,
     deriveTrackSignal dedupe, classification metrics, upsertTrackResult). Return { output, signal,
     acquisition_failed }. NO change to deriveTrackSignal / weights / firewall. */
}

// Layers 2/2.5/3 + memoized synthesis persist. Returns the synthesis + the evidence_hash + ios.
export async function stageSynthesis(ctx: TrackContext, trackOutputs: TrackOutput[]) { /* lines 109–119 */ }

// Layer 4 verdict + Layer 5 report payload. Pure compute; returns the verdict.
export function stageVerdict(signals: Partial<Record<TrackKey, TrackSignal>>, synthesis: /* type */ unknown) { /* lines 122–124 */ }

// Memory write (skips if identity acquisition failed).
export async function stageMemoryWrite(ctx: TrackContext, identitySignal: TrackSignal | null, identityAcquisitionFailed: boolean) { /* lines 128–130 */ }

// Finalize: write case status + per-track statuses.
export async function stageFinalize(ctx: TrackContext, args: { included: Set<number>; identityAcquisitionFailed: boolean; verdict: string; confidence_0_15: number; }): Promise<{ error: string | null }> { /* lines 134–144 */ }

export { requiredFindingTracks, trackByNumber, TRACK_FNS };
```

- [ ] **Step 1: Write the failing test** at `lib/research/pipeline.steps.test.ts` — mock the track fns + data layer, assert `stageFindingTrack` returns the derived signal and calls `upsertTrackResult` with the dedupe-applied evidence types (proves the move preserved the anti-double-count fix). Mirror the existing `track1.test.ts` mocking style (`vi.mock` orchestrator/runModel/persistence). Example assertion:

```ts
import { describe, it, expect, vi } from "vitest";
// mock data layer + a fake track fn that returns two evidence_items with the SAME weight_key
vi.mock("@/lib/data/track-results", () => ({ upsertTrackResult: vi.fn().mockResolvedValue({ error: null }) }));
// ...mock runTrack1 to return { evidence_items: [{weight_key:'government_registration'...}, {same}], ... }
import { stageFindingTrack } from "./pipeline.steps";
import { upsertTrackResult } from "@/lib/data/track-results";

it("dedupes evidence_types before deriving the signal (anti-double-count preserved)", async () => {
  const r = await stageFindingTrack(/* ctx */, 1);
  expect(r.signal).toBeDefined();
  // the upserted classifications/evidence reflect a single counted instance of the duplicated key
  expect(upsertTrackResult).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run** `npx vitest run lib/research/pipeline.steps.test.ts` → FAIL (no module).
- [ ] **Step 3: Implement `pipeline.steps.ts`** by moving the exact bodies cited above out of `runPipeline` (no logic edits).
- [ ] **Step 4: Refactor `runPipeline`** in `lib/research/pipeline.ts` to call the stages sequentially:

```ts
export async function runPipeline(ctx: TrackContext): Promise<{ error: string | null }> {
  const included = new Set(requiredFindingTracks(ctx.plan_type));
  await stageTrack0(ctx);
  const trackOutputs: TrackOutput[] = [];
  const signals: Partial<Record<TrackKey, TrackSignal>> = {};
  let identityAcquisitionFailed = false;
  for (const n of [1, 2, 3, 4, 5]) {
    if (!included.has(n)) continue;
    const { output, signal, acquisition_failed } = await stageFindingTrack(ctx, n);
    trackOutputs.push(output); signals[trackByNumber(n).track_key] = signal;
    if (acquisition_failed && trackByNumber(n).track_key === "supplier_identity") identityAcquisitionFailed = true;
  }
  const { synthesis } = await stageSynthesis(ctx, trackOutputs);
  const verdict = stageVerdict(signals, synthesis);
  await stageMemoryWrite(ctx, signals.supplier_identity ?? null, identityAcquisitionFailed);
  return stageFinalize(ctx, { included, identityAcquisitionFailed, verdict: verdict.verdict, confidence_0_15: verdict.confidence_0_15 });
}
```

- [ ] **Step 5: Run** `npx vitest run` + `npx tsc --noEmit` → all green (the existing pipeline behavior is unchanged; dev route still works).
- [ ] **Step 6: Commit** `git commit -m "refactor(pipeline): extract stage functions (behavior-preserving) for durable orchestration"`

---

## Task 2: The durable Inngest function

**Files:**
- Create: `lib/inngest/functions/pipeline.ts`
- Test: `lib/inngest/functions/pipeline.test.ts`

- [ ] **Step 1: Write the failing test** — assert the function fans out Tracks 1–4 in parallel and runs Track 5 after, by recording `step.run` call order with a fake `step`:

```ts
import { describe, it, expect, vi } from "vitest";
// fake step that records ids and runs the fn
const makeStep = () => { const ids: string[] = []; return { ids, run: vi.fn(async (id: string, fn: () => unknown) => { ids.push(id); return fn(); }), sendEvent: vi.fn() }; };
// mock the stage functions so no real work runs
vi.mock("@/lib/research/pipeline.steps", () => ({ /* stage* mocks returning canned values */ }));
import { pipelineHandler } from "./pipeline"; // export the bare handler for testing

it("runs track-0, fans out 1–4, then track-5, synthesis, verdict, finalize", async () => {
  const step = makeStep();
  await pipelineHandler({ event: { data: { case_id: "c1", vendor_name: "v", vendor_website: null, brands_submitted: [], marketplace: "amazon_us", plan_type: "growth_279" } }, step } as never);
  expect(step.ids).toContain("track-0");
  expect(step.ids.indexOf("track-5")).toBeGreaterThan(step.ids.indexOf("track-1"));
  expect(step.ids[step.ids.length - 1]).toBe("finalize");
});
```

- [ ] **Step 2: Run** → FAIL (no module).
- [ ] **Step 3: Implement `lib/inngest/functions/pipeline.ts`:**

```ts
import { inngest } from "@/lib/inngest/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { TrackContext, TrackOutput, TrackSignal } from "@/lib/research/contracts";
import { type TrackKey } from "@/lib/constants/tracks";
import {
  requiredFindingTracks, trackByNumber, stageTrack0, stageFindingTrack,
  stageSynthesis, stageVerdict, stageMemoryWrite, stageFinalize,
} from "@/lib/research/pipeline.steps";

// Exported bare handler so it is unit-testable with a fake `step`.
export async function pipelineHandler({ event, step }: { event: { data: TrackContext }; step: any }) {
  const ctx = event.data;
  const included = new Set(requiredFindingTracks(ctx.plan_type));

  await step.run("set-running", () => supabaseAdmin.from("cases").update({ status: "research_running" }).eq("id", ctx.case_id));
  await step.run("track-0", () => stageTrack0(ctx));

  // Fan out finding tracks 1–4 in parallel (plan-gated); each step is independently retryable.
  const findingNs = [1, 2, 3, 4].filter((n) => included.has(n));
  const results = await Promise.all(
    findingNs.map((n) => step.run(`track-${n}`, () => stageFindingTrack(ctx, n))),
  );
  // Track 5 (arbitrator) runs AFTER 1–4.
  if (included.has(5)) results.push(await step.run("track-5", () => stageFindingTrack(ctx, 5)));

  const trackOutputs: TrackOutput[] = results.map((r) => r.output);
  const signals: Partial<Record<TrackKey, TrackSignal>> = {};
  let identityAcquisitionFailed = false;
  for (const r of results) {
    const tk = r.output.track_key as TrackKey;
    signals[tk] = r.signal;
    if (r.acquisition_failed && tk === "supplier_identity") identityAcquisitionFailed = true;
  }

  const { synthesis } = await step.run("synthesis", () => stageSynthesis(ctx, trackOutputs));
  const verdict = await step.run("verdict", () => Promise.resolve(stageVerdict(signals, synthesis)));
  await step.run("memory-write", () => stageMemoryWrite(ctx, signals.supplier_identity ?? null, identityAcquisitionFailed));
  await step.run("finalize", () => stageFinalize(ctx, { included, identityAcquisitionFailed, verdict: verdict.verdict, confidence_0_15: verdict.confidence_0_15 }));
}

export const pipelineStart = inngest.createFunction(
  { id: "pipeline-start", name: "Research pipeline", retries: 2 },
  { event: "pipeline/start" },
  pipelineHandler,
);
```

> Note: `stageSynthesis` must return `{ synthesis, ... }` serialisably (Inngest serialises step output between invocations). If the synthesis object isn't JSON-safe, persist it in the step and re-read by `evidence_hash` in the verdict step instead of passing it through. Confirm during implementation; adjust `stageSynthesis`/`stageVerdict` to read-from-DB if needed.

- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `git commit -m "feat(inngest): durable pipeline/start function (Track0 → fan-out 1–4 → T5 → synthesis → verdict → finalize)"`

---

## Task 3: Register the function + refactor submit to enqueue

**Files:**
- Modify: `app/api/inngest/route.ts`
- Modify: `app/api/cases/submit/route.ts`

- [ ] **Step 1: Register** in `app/api/inngest/route.ts`:

```ts
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { pipelineStart } from "@/lib/inngest/functions/pipeline";

export const { GET, POST, PUT } = serve({ client: inngest, functions: [pipelineStart] });
```

- [ ] **Step 2: Refactor submit** `app/api/cases/submit/route.ts` — remove `import { after } ...` usage, remove `export const maxDuration = 60`, and replace the `after(async () => { ... runPipeline ... })` block with:

```ts
import { inngest } from "@/lib/inngest/client";
// ...after the case is created + file uploaded:
  // Enqueue the durable research pipeline (runs outside this request; not bound by the 60s cap).
  // Credits are already deducted + the case exists, so a send failure is logged and the case can be
  // re-driven; we do NOT block the response on research.
  try {
    await inngest.send({ name: "pipeline/start", data: {
      case_id: created.id, vendor_name: vendorName, vendor_website: vendorWebsite,
      brands_submitted: brands, marketplace, plan_type: plan,
    } });
  } catch (e) {
    console.error("[submit] inngest enqueue failed:", e, { case_id: created.id });
  }
  return NextResponse.json({ ok: true, case_id: created.id, case_number: created.case_number, credits_charged: cost, remaining_balance: newBalance });
```

(The submit route still returns the same shape the confirmation screen consumes — no client change.)

- [ ] **Step 3: Run** `npx tsc --noEmit && npx eslint app/api/cases/submit/route.ts app/api/inngest/route.ts && npx vitest run` → green.
- [ ] **Step 4: Commit** `git commit -m "feat(submit): enqueue pipeline via Inngest instead of after(); drop 60s coupling"`

---

## Task 4: Local dev wiring + verification

- [ ] **Step 1:** Document local dev in the plan/README: run `npx inngest-cli@latest dev` alongside `npm run dev`; the Inngest dev server auto-discovers `app/api/inngest`. Submitting a case locally should show the run in the Inngest dev dashboard with each step.
- [ ] **Step 2: Full gate:** `npx tsc --noEmit && npx eslint app components lib && npx vitest run && npx next build` → all green.
- [ ] **Step 3: Push** `git push origin staging`.
- [ ] **Step 4: Founder live validation (staging):** submit a case → confirmation receipt appears instantly → Inngest dashboard shows `pipeline-start` with steps `set-running → track-0 → track-1..4 (parallel) → track-5 → synthesis → verdict → memory-write → finalize`, each retryable. Case page: status `Research running`, dimensions flip to Complete as steps finish; final `awaiting_review` with verdict. Confirm Track 1 classifications persisted in `case_track_results` (no 60s timeout in the Vercel log).

---

## Task 5: Live-progress UI (can ship separately)

**Files:**
- Modify: `components/portal/case-detail-view.tsx`

- [ ] **Step 1:** Add a client poller that calls `router.refresh()` on an interval (e.g. every 4s) while `c.status` is non-terminal (`research_running` | `pending_intake`) and stops once terminal (`awaiting_review` | `delivered` | `complete` | `manual_override_required` | `awaiting_client`). Use `useEffect` + `setInterval`, cleared on unmount/terminal. No new endpoint — the server component re-fetches case + findings on refresh.

```tsx
useEffect(() => {
  const live = c.status === "research_running" || c.status === "pending_intake";
  if (!live) return;
  const t = setInterval(() => router.refresh(), 4000);
  return () => clearInterval(t);
}, [c.status, router]);
```

- [ ] **Step 2 (optional):** add a "Researching…" per-dimension state — purely a `dimStatus()` label tweak for a `running` value; no migration. Defer if not wanted.
- [ ] **Step 3:** `npx tsc --noEmit && npx eslint components/portal/case-detail-view.tsx && npx next build` → green. **Commit + push.**
- [ ] **Step 4: Founder visual validation:** open a case mid-research → dimensions update live without manual refresh; polling stops when terminal.

---

## Self-review notes
- **Decision logic untouched:** every stage function is a move of existing `runPipeline` lines; `runTrack*`, `deriveTrackSignal`, `computeVerdict`, `runSynthesis`, the firewall, and the frozen Evidence Pack contract are called identically. The only new code is orchestration + status + enqueue + polling.
- **60s cap removed at the root:** submit returns in <2s (case create + enqueue); each Inngest step is short (<60s) and the workflow spans invocations — the cap no longer bounds the pipeline. No Vercel Pro required.
- **Plan-gating respected:** fan-out uses `requiredFindingTracks(plan)` (Tracks 2 & 4 are Growth+Scale only).
- **Idempotency / safety:** credits deducted + case created BEFORE enqueue; enqueue failure logged (case re-drivable). Inngest step memoization makes re-runs safe (each step's writes are upserts keyed by case_id/track).
- **Migration:** none — all statuses already exist.
- **Open implementation check:** confirm `stageSynthesis` output is serialisable across Inngest steps; if not, persist-in-step + re-read by `evidence_hash` in the verdict step (noted in Task 2).
- **Ready for 5.1c:** once this lands, adding real Track 2 is "make `runTrack2` real" — the orchestration/retry/status/fan-out already exist. No per-track rework.
