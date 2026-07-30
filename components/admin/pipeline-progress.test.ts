import { describe, it, expect } from "vitest";
import { deriveStages } from "./pipeline-progress";

const base = {
  status: "research_running",
  track_0_status: "complete", track_1_status: "complete", track_2_status: "pending",
  track_3_status: "pending", track_4_status: "skipped", track_5_status: "pending", track_6_status: "pending",
};

describe("UX-1 — pipeline progress derivation (pure, includes Track 6)", () => {
  it("mid-run: done tracks show done, pending show working, skipped shows skipped", () => {
    const by = Object.fromEntries(deriveStages(base).map((s) => [s.key, s.state]));
    expect(by.t1).toBe("done");
    expect(by.t2).toBe("working");
    expect(by.t4).toBe("skipped");
    expect(by.t6).toBe("working");
    expect(by.synthesis).toBe("working");
  });

  it("THE DIAGNOSTIC CASE: a failed track shows failed BY NAME while others show their own states", () => {
    const by = Object.fromEntries(deriveStages({ ...base, track_3_status: "failed", status: "awaiting_review" }).map((s) => [s.key, s.state]));
    expect(by.t3).toBe("failed");
    expect(by.t1).toBe("done");
    expect(by.synthesis).toBe("done");
  });

  it("manual_required + escalated intake surface as manual (⚠), never hidden", () => {
    const by = Object.fromEntries(deriveStages({ ...base, track_0_status: "escalated", track_2_status: "manual_required" }).map((s) => [s.key, s.state]));
    expect(by.intake).toBe("manual");
    expect(by.t2).toBe("manual");
  });

  it("a missing track_6_status column (pre-migration env) degrades to pending, never throws", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { track_6_status: _drop, ...noT6 } = base;
    const by = Object.fromEntries(deriveStages(noT6).map((s) => [s.key, s.state]));
    expect(by.t6).toBe("working"); // researching → working; null raw tolerated
  });
});
