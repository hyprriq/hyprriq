import { describe, it, expect } from "vitest";
import { estimatedCompletionLabel } from "./submit";

describe("estimatedCompletionLabel", () => {
  it("uses the plan's delivery SLA in days", () => {
    expect(estimatedCompletionLabel("scale_499")).toBe("Within 3 business days");
    expect(estimatedCompletionLabel("growth_279")).toBe("Within 5 business days");
    expect(estimatedCompletionLabel("single_99")).toBe("Within 5 business days");
  });
  it("falls back to 5 business days when the client has no plan", () => {
    expect(estimatedCompletionLabel(null)).toBe("Within 5 business days");
  });
});
