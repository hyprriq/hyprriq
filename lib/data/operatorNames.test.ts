import { describe, it, expect, vi, beforeEach } from "vitest";

const { getUserList } = vi.hoisted(() => ({ getUserList: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({ users: { getUserList } }),
}));

import { resolveOperatorNames, resolveOperatorName, operatorLabel } from "@/lib/data/operatorNames";

// ⚠ Braces are load-bearing: a function RETURNED from beforeEach is invoked by vitest as teardown
// (which would call the mock after every test — cost a debugging cycle on 2026-08-20).
beforeEach(() => { getUserList.mockReset(); });

const user = (id: string, firstName: string | null, lastName: string | null, imageUrl = "https://img/x.png") =>
  ({ id, firstName, lastName, imageUrl });

describe("resolveOperatorNames — Clerk is the single source, and it may fail", () => {
  it("maps ids to first+last names", async () => {
    getUserList.mockResolvedValue({ data: [user("user_a", "Ada", "Lovelace")] });
    const m = await resolveOperatorNames(["user_a"]);
    expect(m.get("user_a")).toEqual({ name: "Ada Lovelace", imageUrl: "https://img/x.png" });
  });

  it("a first name alone is a name; NO name at all is null (never an empty string)", async () => {
    getUserList.mockResolvedValue({ data: [user("user_a", "Ada", null), user("user_b", null, null)] });
    const m = await resolveOperatorNames(["user_a", "user_b"]);
    expect(m.get("user_a")!.name).toBe("Ada");
    expect(m.get("user_b")!.name).toBeNull();
  });

  it("whitespace-only names collapse to null — a blank label is worse than an email", async () => {
    getUserList.mockResolvedValue({ data: [user("user_a", "  ", " ")] });
    expect((await resolveOperatorNames(["user_a"])).get("user_a")!.name).toBeNull();
  });

  it("⛔ FAIL-SOFT: Clerk throwing returns an EMPTY map, never propagates — a name resolver must not break a page", async () => {
    getUserList.mockImplementation(() => { throw new Error("clerk down"); });
    await expect(resolveOperatorNames(["user_a"])).resolves.toEqual(new Map());
  });

  it("dedupes ids and skips non-Clerk actors (the pipeline writes actor_id 'system')", async () => {
    getUserList.mockResolvedValue({ data: [] });
    await resolveOperatorNames(["user_a", "user_a", "system", "operator-house", ""]);
    expect(getUserList).toHaveBeenCalledWith({ userId: ["user_a"], limit: 100 });
  });

  it("an all-non-Clerk list makes NO network call at all", async () => {
    const m = await resolveOperatorNames(["system", "operator-house"]);
    expect(m.size).toBe(0);
    expect(getUserList).not.toHaveBeenCalled();
  });

  it("an id Clerk does not return is simply absent — the caller falls back", async () => {
    getUserList.mockResolvedValue({ data: [user("user_a", "Ada", "Lovelace")] });
    const m = await resolveOperatorNames(["user_a", "user_gone"]);
    expect(m.has("user_gone")).toBe(false);
  });

  it("resolveOperatorName (singular) returns null when unknown", async () => {
    getUserList.mockResolvedValue({ data: [] });
    expect(await resolveOperatorName("user_x")).toBeNull();
  });
});

describe("operatorLabel — the fallback chain, in order", () => {
  it("prefers the Clerk name", () => {
    expect(operatorLabel({ name: "Ada Lovelace", imageUrl: null }, "ada@x.com", "user_a")).toBe("Ada Lovelace");
  });
  it("falls back to email when there is no name", () => {
    expect(operatorLabel({ name: null, imageUrl: null }, "ada@x.com", "user_a")).toBe("ada@x.com");
  });
  it("falls back to the raw id when there is neither — never renders empty", () => {
    expect(operatorLabel(null, null, "user_a")).toBe("user_a");
    expect(operatorLabel({ name: "  ", imageUrl: null }, "   ", "user_a")).toBe("user_a");
  });
});
