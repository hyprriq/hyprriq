import { describe, it, expect } from "vitest";
import { addQuestion, editQuestion, deleteQuestion } from "./additional-questions";
import type { AdditionalQuestion } from "@/lib/research/contracts";

const meta = { id: "q1", created_by: "user_admin", created_at: "2026-07-02T10:00:00Z" };

describe("additional-questions pure mutations", () => {
  it("addQuestion appends with trimmed text + defaults (priority medium, required false) + audit meta", () => {
    const out = addQuestion([], { question: "  Confirm SupplyOn listing?  " }, meta);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: "q1", question: "Confirm SupplyOn listing?", priority: "medium", required: false, created_by: "user_admin", created_at: "2026-07-02T10:00:00Z" });
  });
  it("addQuestion carries brand/priority/required/reason when provided", () => {
    const out = addQuestion([], { question: "q", reason: "why", brand: "Bosch", priority: "high", required: true }, meta);
    expect(out[0]).toMatchObject({ reason: "why", brand: "Bosch", priority: "high", required: true });
  });

  it("editQuestion snapshots ALL prior fields into history before overwriting (never silent)", () => {
    const list: AdditionalQuestion[] = [{ id: "q1", question: "old Q", reason: "old R", brand: "Bosch", priority: "low", required: false, created_by: "u", created_at: "t" }];
    const out = editQuestion(list, "q1", { question: "new Q", priority: "high" }, { edited_by: "user_admin", edited_at: "2026-07-02T11:00:00Z" });
    expect(out[0].question).toBe("new Q");
    expect(out[0].priority).toBe("high");
    expect(out[0].reason).toBe("old R"); // untouched field preserved
    expect(out[0].history).toHaveLength(1);
    expect(out[0].history![0]).toMatchObject({ edited_by: "user_admin", edited_at: "2026-07-02T11:00:00Z", previous_question: "old Q", previous_reason: "old R", previous_brand: "Bosch", previous_priority: "low", previous_required: false });
  });
  it("editQuestion accumulates history across multiple edits; leaves other rows untouched", () => {
    let list: AdditionalQuestion[] = [
      { id: "q1", question: "v1", created_by: "u", created_at: "t" },
      { id: "q2", question: "other", created_by: "u", created_at: "t" },
    ];
    list = editQuestion(list, "q1", { question: "v2" }, { edited_by: "u", edited_at: "t1" });
    list = editQuestion(list, "q1", { question: "v3" }, { edited_by: "u", edited_at: "t2" });
    const q1 = list.find((q) => q.id === "q1")!;
    expect(q1.question).toBe("v3");
    expect(q1.history!.map((h) => h.previous_question)).toEqual(["v1", "v2"]);
    expect(list.find((q) => q.id === "q2")!.history).toBeUndefined();
  });

  it("deleteQuestion removes by id, leaves others", () => {
    const list: AdditionalQuestion[] = [
      { id: "q1", question: "a", created_by: "u", created_at: "t" },
      { id: "q2", question: "b", created_by: "u", created_at: "t" },
    ];
    expect(deleteQuestion(list, "q1").map((q) => q.id)).toEqual(["q2"]);
  });
});
