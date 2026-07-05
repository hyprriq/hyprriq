import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the stages so no real work runs — we are testing ORCHESTRATION (ordering + fan-out) only.
const { stageResolveAttempt, stageSetRunning, stageTrack0, stageResolveIdentity, stagePersistIdentity, stageFindingTrack, stageSynthesis, stageVerdict, stageMemoryWrite, stageFinalize } = vi.hoisted(() => ({
  stageResolveAttempt: vi.fn().mockResolvedValue(1), // H1 — investigation attempt resolved first
  stageSetRunning: vi.fn().mockResolvedValue(undefined),
  stageTrack0: vi.fn().mockResolvedValue(undefined),
  stageResolveIdentity: vi.fn().mockResolvedValue({ resolved_domain: "acme.com", identity_confidence: "high", identity_unconfirmed: false, resolution_method: "resolved_dominant" }),
  stagePersistIdentity: vi.fn().mockResolvedValue(undefined),
  stageFindingTrack: vi.fn((_ctx: unknown, n: number) => Promise.resolve({ output: { track_key: `track_${n}` }, signal: "infer", acquisition_failed: false, failed: false, track_number: n })),
  stageSynthesis: vi.fn().mockResolvedValue({ synthesis: {} }),
  stageVerdict: vi.fn().mockReturnValue({ verdict: "verify_before_purchase", confidence_0_15: 8 }),
  stageMemoryWrite: vi.fn().mockResolvedValue(undefined),
  stageFinalize: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock("@/lib/research/pipeline.steps", () => ({ stageResolveAttempt, stageSetRunning, stageTrack0, stageResolveIdentity, stagePersistIdentity, stageFindingTrack, stageSynthesis, stageVerdict, stageMemoryWrite, stageFinalize }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: { from: () => ({ update: () => ({ eq: () => Promise.resolve({ error: null }) }) }) } }));

import { pipelineHandler } from "./pipeline";
import type { TrackContext } from "@/lib/research/contracts";

const makeStep = () => {
  const ids: string[] = [];
  return { ids, run: async <T,>(id: string, fn: () => T | Promise<T>): Promise<T> => { ids.push(id); return fn(); } };
};
const ctx: TrackContext = { case_id: "c1", vendor_name: "Acme", vendor_website: null, brands_submitted: [], marketplace: "amazon_us", plan_type: "growth_279" };

beforeEach(() => { stageFindingTrack.mockClear(); stageResolveIdentity.mockClear(); stagePersistIdentity.mockClear(); stageFinalize.mockClear(); stageMemoryWrite.mockClear(); stageResolveAttempt.mockClear().mockResolvedValue(1); stageSetRunning.mockClear(); });

describe("pipelineHandler orchestration", () => {
  it("runs set-running → track-0 → resolve-identity → persist-identity → tracks 1–4 → track-5 → synthesis → verdict → memory-write → finalize", async () => {
    const step = makeStep();
    await pipelineHandler({ event: { data: ctx }, step });
    // H1 — the investigation attempt is resolved before anything writes
    expect(step.ids[0]).toBe("resolve-attempt");
    expect(step.ids).toContain("set-running");
    expect(step.ids).toContain("track-0");
    // Track 0.5 resolves between track-0 and the fan-out
    expect(step.ids.indexOf("resolve-identity")).toBeGreaterThan(step.ids.indexOf("track-0"));
    expect(step.ids.indexOf("persist-identity")).toBeGreaterThan(step.ids.indexOf("resolve-identity"));
    expect(step.ids.indexOf("resolve-identity")).toBeLessThan(step.ids.indexOf("track-1"));
    // tracks 1–4 all precede track-5 (arbitrator waits for the parallel group)
    for (const n of [1, 2, 3, 4]) expect(step.ids.indexOf(`track-${n}`)).toBeLessThan(step.ids.indexOf("track-5"));
    expect(step.ids[step.ids.length - 1]).toBe("finalize");
    expect(step.ids.indexOf("verdict")).toBeGreaterThan(step.ids.indexOf("track-5"));
  });

  it("threads the resolved identity onto the ctx the finding tracks receive", async () => {
    const step = makeStep();
    await pipelineHandler({ event: { data: ctx }, step });
    const trackCtx = stageFindingTrack.mock.calls[0][0] as TrackContext;
    expect(trackCtx.supplier_identity?.resolved_domain).toBe("acme.com");
    // finalize gets the identity + its unconfirmed flag
    const finalizeArgs = stageFinalize.mock.calls[0][1] as { identityUnconfirmed?: boolean; supplierIdentity?: { resolved_domain: string } };
    expect(finalizeArgs.identityUnconfirmed).toBe(false);
    expect(finalizeArgs.supplierIdentity?.resolved_domain).toBe("acme.com");
  });

  it("H1: threads the resolved attempt_number onto the ctx every stage receives", async () => {
    stageResolveAttempt.mockResolvedValueOnce(2);
    const step = makeStep();
    await pipelineHandler({ event: { data: ctx }, step });
    const trackCtx = stageFindingTrack.mock.calls[0][0] as TrackContext;
    expect(trackCtx.attempt_number).toBe(2);
    const memoryCtx = stageMemoryWrite.mock.calls[0][0] as TrackContext;
    expect(memoryCtx.attempt_number).toBe(2);
  });

  it("a single-plan case skips tracks 2 and 4 (registry plan-gating)", async () => {
    const step = makeStep();
    await pipelineHandler({ event: { data: { ...ctx, plan_type: "single_99" } }, step });
    expect(step.ids).not.toContain("track-2");
    expect(step.ids).not.toContain("track-4");
    expect(step.ids).toContain("track-1");
    expect(step.ids).toContain("track-5");
  });
});
