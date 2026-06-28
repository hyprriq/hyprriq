import { describe, it, expect } from "vitest";
import { isResearchInProgress } from "./case-status";

describe("isResearchInProgress", () => {
  it("is true while research is actively running (poll)", () => {
    expect(isResearchInProgress("pending_intake")).toBe(true);
    expect(isResearchInProgress("research_running")).toBe(true);
  });
  it("is false at terminal/waiting states (stop polling)", () => {
    for (const s of ["awaiting_review", "manual_override_required", "awaiting_client", "delivered", "escalated"]) {
      expect(isResearchInProgress(s)).toBe(false);
    }
  });
});
