import { inngest } from "@/lib/inngest/client";
import type { TrackContext, TrackOutput, TrackSignal } from "@/lib/research/contracts";
import { type TrackKey } from "@/lib/constants/tracks";
import { tracksForPlan, executionGroupsForPlan } from "@/lib/research/pipeline.registry";
import {
  stageResolveAttempt, stageSetRunning, stageTrack0, stageResolveIdentity, stagePersistIdentity,
  stageFindingTrack, stageSynthesis, stageVerdict, stageMemoryWrite, stageFinalize, type FindingTrackResult,
} from "@/lib/research/pipeline.steps";

// Minimal structural type for an Inngest step — keeps the handler unit-testable with a fake step.
// (The real step.run returns Promise<Jsonify<T>>; we cast at the createFunction boundary below.
// Benign here — every value we read back off a step is a primitive/plain-data field that survives
// JSON serialization.)
interface InngestStep {
  run<T>(id: string, fn: () => T | Promise<T>): Promise<T>;
}

// Durable pipeline orchestration. Each step.run is independently retried + memoized by Inngest, and
// the workflow spans as many invocations as needed — so the 60s function cap no longer bounds the
// pipeline (each STEP is short; the WHOLE workflow is unbounded). The stages + decision logic are
// identical to the synchronous runPipeline (one source: pipeline.steps). Steps are idempotent
// (upserts keyed by case_id/track), so a retry/replay never duplicates evidence or memory.
export async function pipelineHandler({ event, step }: { event: { data: TrackContext }; step: InngestStep }) {
  const base = event.data;
  const included = new Set(tracksForPlan(base.plan_type).map((t) => t.track_number));

  // H1 — resolve this execution's investigation attempt ONCE (durable step; memoized across
  // retries), then thread it through every stage so all writes land under this attempt.
  const attempt = await step.run("resolve-attempt", () => stageResolveAttempt(base.case_id));
  const ctx: TrackContext = { ...base, attempt_number: attempt };

  await step.run("set-running", () => stageSetRunning(ctx.case_id));
  await step.run("track-0", () => stageTrack0(ctx));

  // Track 0.5 — resolve the supplier identity once (durable step), persist it early for the
  // manual-review human, then thread it onto the ctx the finding tracks receive (Track 2+ classify
  // against resolved_domain).
  const identity = await step.run("resolve-identity", () => stageResolveIdentity(ctx));
  await step.run("persist-identity", () => stagePersistIdentity(ctx.case_id, identity));
  const ictx: TrackContext = { ...ctx, supplier_identity: identity };

  // Fan out by execution group: group 1 (Tracks 1–4) runs in parallel; group 2 (Track 5) runs after.
  const results: FindingTrackResult[] = [];
  for (const group of executionGroupsForPlan(ctx.plan_type)) {
    const groupResults = await Promise.all(
      group.map((t) => step.run(t.step_name, () => stageFindingTrack(ictx, t.track_number))),
    );
    results.push(...groupResults);
  }

  const trackOutputs: TrackOutput[] = results.map((r) => r.output);
  const signals: Partial<Record<TrackKey, TrackSignal>> = {};
  let identityAcquisitionFailed = false;
  let identityFailed = false; // H2 — acquisition OR llm failure on Track 1: identity unscored → no memory write
  const failedTracks = new Set<number>(); // H2 — every unscored included track escalates (OQ-1)
  for (const r of results) {
    const tk = r.output.track_key as TrackKey;
    signals[tk] = r.signal;
    if (r.failed) failedTracks.add(r.track_number);
    if (r.acquisition_failed && tk === "supplier_identity") identityAcquisitionFailed = true;
    if (r.failed && tk === "supplier_identity") identityFailed = true;
  }

  const { synthesis } = await step.run("synthesis", () => stageSynthesis(ctx, trackOutputs));
  const verdict = await step.run("verdict", () => stageVerdict(signals, synthesis));
  await step.run("memory-write", () => stageMemoryWrite(ictx, signals.supplier_identity ?? null, identityFailed));
  await step.run("finalize", () =>
    stageFinalize(ictx, {
      included, identityAcquisitionFailed, failedTracks, identityUnconfirmed: identity.identity_unconfirmed,
      supplierIdentity: identity, verdict: verdict.verdict, confidence_0_15: verdict.confidence_0_15,
    }),
  );
}

export const pipelineStart = inngest.createFunction(
  { id: "pipeline-run-case", name: "Research pipeline", retries: 2, triggers: [{ event: "pipeline/run-case" }] },
  async ({ event, step }) => pipelineHandler({ event: { data: event.data as TrackContext }, step: step as unknown as InngestStep }),
);
