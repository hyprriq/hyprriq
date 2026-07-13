import { describe, it, expect } from "vitest";
import { TRACK_REGISTRY, tracksForPlan, executionGroupsForPlan, PIPELINE_VERSION } from "./pipeline.registry";
import { requiredFindingTracks } from "@/lib/constants/tracks";
import { PLAN_TYPES } from "@/lib/constants/plans";

describe("pipeline registry", () => {
  it("pins the orchestration version", () => {
    // 1.0.0 → 1.1.0 (H7, 2026-07-07): deliberate bump — diversity cap, consensus pass, replay mode.
    // 1.1.0 → 1.2.0 (SB-1, 2026-07-09, founder-approved): domain-mode anchor match + Track 0.5
    // llm_failed research-failure routing change resolution behavior for NEW attempts.
    // 1.2.0 → 1.3.0 (SB-2, 2026-07-10, founder-approved): domain-first ambiguity comparator +
    // OQ-B copy + carried audits change resolution decisions for NEW attempts.
    // 1.3.0 → 1.4.0 (Track 3, 2026-07-10, founder-approved): brand_risk_assessment goes LIVE —
    // a scoring dimension is added to every plan's pipeline for NEW attempts.
    // 1.4.0 → 1.5.0 (SB-3, 2026-07-11, founder-approved): the zero-research fast path widened to
    // suffix-normalized-identical — resolution behavior changes for NEW attempts.
    // 1.5.0 → 1.6.0 (Track 4 sub-gate A, 2026-07-11, founder-approved): documentation_review goes
    // LIVE (document-pack acquisition mode + the nothing_to_review absence branch).
    // 1.6.0 → 1.7.0 (Track 5 sub-gate B, 2026-07-14, founder-ruled SO-B1): sourcing_logic goes
    // LIVE as the NON-VOTING flag emitter (derived-only arbitration; verdicts byte-identical by
    // design — the version bump records the new pipeline SHAPE, not a judgment change).
    // VALIDATION stays 1.6.0: Track 5 ships ZERO firewall config (no registry entries) — flagged
    // to the founder at the gate, not silently skipped.
    expect(PIPELINE_VERSION).toBe("1.7.0");
  });

  it("plan gating matches requiredFindingTracks (single source of truth, no drift)", () => {
    for (const plan of PLAN_TYPES) {
      const fromRegistry = tracksForPlan(plan).map((t) => t.track_number).sort((a, b) => a - b);
      const fromConstants = [...requiredFindingTracks(plan)].sort((a, b) => a - b);
      expect(fromRegistry).toEqual(fromConstants);
    }
  });

  it("fans tracks 1–4 in one parallel group, track 5 in a later group (Growth)", () => {
    const groups = executionGroupsForPlan("growth_279");
    expect(groups).toHaveLength(2);
    expect(groups[0].map((t) => t.track_number).sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
    expect(groups[1].map((t) => t.track_number)).toEqual([5]);
  });

  it("single plan excludes the Growth+Scale-only tracks (2 and 4)", () => {
    const nums = tracksForPlan("single_99").map((t) => t.track_number);
    expect(nums).not.toContain(2);
    expect(nums).not.toContain(4);
    expect(nums).toContain(1);
    expect(nums).toContain(5);
  });

  it("every registry entry has a unique step_name and track_number", () => {
    const steps = TRACK_REGISTRY.map((t) => t.step_name);
    const nums = TRACK_REGISTRY.map((t) => t.track_number);
    expect(new Set(steps).size).toBe(steps.length);
    expect(new Set(nums).size).toBe(nums.length);
  });
});
