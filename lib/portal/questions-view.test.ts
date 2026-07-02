import { describe, it, expect } from "vitest";
import { systemQuestions, additionalToDisplay, mergeCaseQuestions } from "./questions-view";
import type { QuestionToAsk, AdditionalQuestion } from "@/lib/research/contracts";

const sysQ = (over: Partial<QuestionToAsk> = {}): QuestionToAsk => ({
  question: "Confirm Bosch distribution?", reason: "no direct confirmation", blocking_weight_key: "dealer_page_listed",
  priority: "high", brand: "Bosch", ...over,
});
const addQ = (over: Partial<AdditionalQuestion> = {}): AdditionalQuestion => ({
  id: "a1", question: "Ask for their DUNS number?", reason: "helps verify", brand: "Bosch",
  priority: "medium", required: false, created_by: "user_x", created_at: "2026-07-02T00:00:00Z", ...over,
});

describe("questions-view — two-source merge (Gap A + Gap B data structure)", () => {
  it("systemQuestions flattens per-track questions and tags source 'system'", () => {
    const out = systemQuestions([{ questions_to_ask: [sysQ()] }, { questions_to_ask: [] }]);
    expect(out).toHaveLength(1);
    expect(out[0].source).toBe("system");
    expect(out[0].brand).toBe("Bosch");
    expect(out[0].blocking_weight_key).toBe("dealer_page_listed");
  });
  it("additionalToDisplay tags source 'additional', carries id + required, defaults optionals", () => {
    const out = additionalToDisplay([addQ({ reason: undefined, priority: undefined, brand: undefined, required: true })]);
    expect(out[0].source).toBe("additional");
    expect(out[0].id).toBe("a1");
    expect(out[0].required).toBe(true);
    expect(out[0].reason).toBe("");
    expect(out[0].brand).toBe("");
    expect(out[0].priority).toBe("medium"); // default
  });
  it("mergeCaseQuestions concatenates system then additional (system immutable, never mixed at source)", () => {
    const merged = mergeCaseQuestions([{ questions_to_ask: [sysQ()] }], [addQ()]);
    expect(merged.map((q) => q.source)).toEqual(["system", "additional"]);
  });
  it("mergeCaseQuestions with no additional yields system only (Gap A, pre-Gap-B)", () => {
    expect(mergeCaseQuestions([{ questions_to_ask: [sysQ()] }], []).every((q) => q.source === "system")).toBe(true);
  });
});
