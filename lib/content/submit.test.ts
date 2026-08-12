import { describe, it, expect } from "vitest";
import { estimatedCompletionLabel } from "./submit";

describe("estimatedCompletionLabel", () => {
  it("uses the plan's delivery SLA in days", () => {
    expect(estimatedCompletionLabel("scale_499")).toBe("Within 24 hours");
    expect(estimatedCompletionLabel("growth_279")).toBe("Within 24 hours");
    expect(estimatedCompletionLabel("single_99")).toBe("Within 24 hours");
  });
  it("is 24 hours even with no plan (per-plan SLAs retired, copy ruling 2026-08-12)", () => {
    expect(estimatedCompletionLabel(null)).toBe("Within 24 hours");
  });
});
