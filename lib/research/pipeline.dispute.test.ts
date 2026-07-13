import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Dispute/escalation re-run — runPipeline orchestration locks (steps mocked wholesale; the
// stage bodies have their own tests). What is locked HERE: dispute mode never mutates the live
// case row via identity persist, and the new attempt runs from the case's EXISTING inputs with
// the dispute flag threaded to every stage. ──
const steps = vi.hoisted(() => ({
  stageResolveAttempt: vi.fn(),
  stageSetRunning: vi.fn(),
  stageTrack0: vi.fn(),
  stageResolveIdentity: vi.fn(),
  stagePersistIdentity: vi.fn(),
  stageFindingTrack: vi.fn(),
  stageSynthesis: vi.fn(),
  stageVerdict: vi.fn(),
  stageMemoryWrite: vi.fn(),
  stageFinalize: vi.fn(),
}));
vi.mock("@/lib/research/pipeline.steps", () => steps);

import { runPipeline } from "./pipeline";
import type { TrackContext } from "./contracts";

const base: TrackContext = {
  case_id: "c1", vendor_name: "Acme", vendor_website: null,
  brands_submitted: ["Petzl"], marketplace: "amazon_us", plan_type: "growth_279",
};

beforeEach(() => {
  Object.values(steps).forEach((f) => f.mockReset());
  steps.stageResolveAttempt.mockResolvedValue(4);
  steps.stageResolveIdentity.mockResolvedValue({ identity_unconfirmed: false });
  steps.stageFindingTrack.mockImplementation(async (_ctx: TrackContext, n: number) => ({
    output: { track_key: `t${n}`, evidence_items: [], reasoning_notes: "", unknowns: [] },
    signal: "pass", acquisition_failed: false, failed: false, not_implemented: false, track_number: n,
  }));
  steps.stageSynthesis.mockResolvedValue({ synthesis: {} });
  steps.stageVerdict.mockReturnValue({ verdict: "usable_with_conditions", confidence_0_15: 9 });
  steps.stageMemoryWrite.mockResolvedValue(undefined);
  steps.stageFinalize.mockResolvedValue({ error: null });
  steps.stageTrack0.mockResolvedValue(undefined);
});

describe("runPipeline dispute mode (system regenerating its OWN answer from the same facts)", () => {
  it("a dispute re-run NEVER writes identity onto the live case row (no live-pointer mutation outside finalize's no-advance path)", async () => {
    await runPipeline({ ...base, dispute_rerun: true });
    expect(steps.stagePersistIdentity).not.toHaveBeenCalled();
  });

  it("a normal run persists identity exactly as before (two-sided)", async () => {
    await runPipeline(base);
    expect(steps.stagePersistIdentity).toHaveBeenCalledWith("c1", { identity_unconfirmed: false });
  });

  it("the dispute re-run is a genuine NEW attempt from the case's EXISTING inputs — attempt threaded, inputs unaltered, flag rides to every stage", async () => {
    await runPipeline({ ...base, dispute_rerun: true });
    const trackCtx = steps.stageFindingTrack.mock.calls[0][0] as TrackContext;
    expect(trackCtx.attempt_number).toBe(4);           // new attempt (H1 — appended, never overwritten)
    expect(trackCtx.vendor_name).toBe("Acme");          // same vendor
    expect(trackCtx.brands_submitted).toEqual(["Petzl"]); // same brands — no input alteration
    expect(trackCtx.dispute_rerun).toBe(true);
    const finalizeCtx = steps.stageFinalize.mock.calls[0][0] as TrackContext;
    expect(finalizeCtx.dispute_rerun).toBe(true);       // finalize sees the flag → no-advance path
  });
});
