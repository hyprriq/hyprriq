import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the stages so no real work runs — we are testing ORCHESTRATION (ordering + fan-out) only.
const { stageTrack0, stageFindingTrack, stageSynthesis, stageVerdict, stageMemoryWrite, stageFinalize } = vi.hoisted(() => ({
  stageTrack0: vi.fn().mockResolvedValue(undefined),
  stageFindingTrack: vi.fn((_ctx: unknown, n: number) => Promise.resolve({ output: { track_key: `track_${n}` }, signal: "infer", acquisition_failed: false })),
  stageSynthesis: vi.fn().mockResolvedValue({ synthesis: {} }),
  stageVerdict: vi.fn().mockReturnValue({ verdict: "verify_before_purchase", confidence_0_15: 8 }),
  stageMemoryWrite: vi.fn().mockResolvedValue(undefined),
  stageFinalize: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock("@/lib/research/pipeline.steps", () => ({ stageTrack0, stageFindingTrack, stageSynthesis, stageVerdict, stageMemoryWrite, stageFinalize }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: { from: () => ({ update: () => ({ eq: () => Promise.resolve({ error: null }) }) }) } }));

import { pipelineHandler } from "./pipeline";
import type { TrackContext } from "@/lib/research/contracts";

const makeStep = () => {
  const ids: string[] = [];
  return { ids, run: async <T,>(id: string, fn: () => T | Promise<T>): Promise<T> => { ids.push(id); return fn(); } };
};
const ctx: TrackContext = { case_id: "c1", vendor_name: "Acme", vendor_website: null, brands_submitted: [], marketplace: "amazon_us", plan_type: "growth_279" };

beforeEach(() => { stageFindingTrack.mockClear(); });

describe("pipelineHandler orchestration", () => {
  it("runs set-running → track-0 → tracks 1–4 → track-5 → synthesis → verdict → memory-write → finalize", async () => {
    const step = makeStep();
    await pipelineHandler({ event: { data: ctx }, step });
    expect(step.ids).toContain("set-running");
    expect(step.ids).toContain("track-0");
    // tracks 1–4 all precede track-5 (arbitrator waits for the parallel group)
    for (const n of [1, 2, 3, 4]) expect(step.ids.indexOf(`track-${n}`)).toBeLessThan(step.ids.indexOf("track-5"));
    expect(step.ids[step.ids.length - 1]).toBe("finalize");
    expect(step.ids.indexOf("verdict")).toBeGreaterThan(step.ids.indexOf("track-5"));
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
