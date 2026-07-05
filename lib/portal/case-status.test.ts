import { describe, it, expect } from "vitest";
import { isResearchInProgress, findingsVisibleToClient } from "./case-status";

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

describe("findingsVisibleToClient (interim client guard until Phase H)", () => {
  it("is true ONLY once the case is delivered to the client", () => {
    expect(findingsVisibleToClient("delivered")).toBe(true);
    expect(findingsVisibleToClient("complete")).toBe(true);
  });
  it("is false for every pre-delivery / internal-review state (client sees a placeholder)", () => {
    for (const s of ["pending_intake", "research_running", "awaiting_review", "manual_override_required", "qa_in_progress", "approved", "awaiting_client"]) {
      expect(findingsVisibleToClient(s)).toBe(false);
    }
  });
});

describe("H2 — failure states (research_failed / submission_failed)", () => {
  it("failure states are terminal: polling stops", () => {
    expect(isResearchInProgress("research_failed")).toBe(false);
    expect(isResearchInProgress("submission_failed")).toBe(false);
  });
  it("failure states never expose findings to the client", () => {
    expect(findingsVisibleToClient("research_failed")).toBe(false);
    expect(findingsVisibleToClient("submission_failed")).toBe(false);
  });
});
