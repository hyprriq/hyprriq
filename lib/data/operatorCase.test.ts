import { describe, it, expect, vi, beforeEach } from "vitest";

const { houseRow, caseInsert, auditInsert, casesUpdate, send, rpcSpy } = vi.hoisted(() => ({
  houseRow: vi.fn().mockResolvedValue({ data: { id: "operator-house" } }),
  caseInsert: vi.fn().mockResolvedValue({ data: { id: "case-1", case_number: "AWI-9" }, error: null }),
  auditInsert: vi.fn().mockResolvedValue({ error: null }),
  casesUpdate: vi.fn().mockResolvedValue({ error: null }),
  send: vi.fn().mockResolvedValue({}),
  rpcSpy: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => {
  const selChain: Record<string, unknown> = {};
  Object.assign(selChain, { select: vi.fn(() => selChain), eq: vi.fn(() => selChain), maybeSingle: () => houseRow() });
  const insChain = { insert: vi.fn(() => ({ select: vi.fn(() => ({ single: () => caseInsert() })) })), update: vi.fn(() => ({ eq: () => casesUpdate() })), ...selChain };
  return { supabaseAdmin: {
    from: vi.fn((t: string) => (t === "audit_log" ? { insert: auditInsert } : t === "cases" ? insChain : selChain)),
    rpc: rpcSpy,
  } };
});
vi.mock("@/lib/inngest/client", () => ({ inngest: { send } }));

import { runOperatorCase } from "./operatorCase";

const input = (over = {}) => ({
  operator_id: "op-1", plan_type: "scale_499" as const, vendor_name: "Acme", vendor_website: null,
  brands: ["Bosch"], marketplace: "amazon_us", notes: null, client_name: "Jane D", company_name: "JD LLC", ...over,
});

beforeEach(() => { houseRow.mockResolvedValue({ data: { id: "operator-house" } }); caseInsert.mockClear(); auditInsert.mockClear(); send.mockClear(); rpcSpy.mockClear(); });

describe("run-a-case — the credit-bypass path (distinct, audited, provenance-queryable)", () => {
  it("creates the case with origin=operator + operator_meta, enqueues the SAME pipeline event, and NEVER touches a credit RPC", async () => {
    const r = await runOperatorCase(input());
    expect(r.error).toBeNull();
    expect(rpcSpy).not.toHaveBeenCalled(); // THE deliberate hole: absence of the call, provable
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ name: "pipeline/run-case" }));
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      actor_id: "op-1", actor_type: "admin",
      new_value: expect.objectContaining({ operator_run: true, credit_bypassed: true, client_name: "Jane D" }),
    }));
  });

  it("fails LOUD when the house row is not seeded (migration first — never mis-attribute)", async () => {
    houseRow.mockResolvedValue({ data: null });
    const r = await runOperatorCase(input());
    expect(r.error).toMatch(/not seeded/);
    expect(send).not.toHaveBeenCalled();
  });

  it("enforces the plan brand cap (the code guard, not just UI)", async () => {
    const r = await runOperatorCase(input({ brands: ["a", "b", "c", "d", "e", "f"] }));
    expect(r.error).toMatch(/brand cap/);
  });

  it("enqueue failure: no refund needed (none taken), case cancelled, error reported truthfully", async () => {
    send.mockRejectedValue(new Error("inngest down"));
    const r = await runOperatorCase(input());
    expect(r.error).toMatch(/enqueue failed/);
    expect(rpcSpy).not.toHaveBeenCalled();
  });
});
