// ── OPTION A + RIDER 1 — the farm guard, proven both ways. ──
import { describe, it, expect, vi, beforeEach } from "vitest";

const { auditRows, rpcResult } = vi.hoisted(() => ({
  auditRows: vi.fn().mockResolvedValue({ data: [], error: null }),
  rpcResult: vi.fn().mockResolvedValue({ data: 12, error: null }),
}));
vi.mock("@/lib/supabase/admin", () => {
  const chain: Record<string, unknown> = {};
  Object.assign(chain, {
    select: vi.fn(() => chain), eq: vi.fn(() => chain), ilike: vi.fn(() => chain),
    gte: vi.fn(() => chain), limit: () => auditRows(),
  });
  return { supabaseAdmin: { from: vi.fn(() => chain), rpc: vi.fn((...a: unknown[]) => rpcResult(...a)) } };
});

import { grantUpgradeCredits, isUpgrade, GRANT_NOTE_PREFIX } from "./upgradeGrant";
import { supabaseAdmin } from "@/lib/supabase/admin";

const PERIOD_START = "2026-07-15T00:00:00.000Z";

beforeEach(() => {
  vi.clearAllMocks();
  auditRows.mockResolvedValue({ data: [], error: null });
  rpcResult.mockResolvedValue({ data: 12, error: null });
});

describe("isUpgrade — direction by rank, never by string compare", () => {
  it("growth→scale is an upgrade; scale→growth is not; single→growth is", () => {
    expect(isUpgrade("growth_279", "scale_499")).toBe(true);
    expect(isUpgrade("scale_499", "growth_279")).toBe(false);
    expect(isUpgrade("single_99", "growth_279")).toBe(true);
    expect(isUpgrade(null, "growth_279")).toBe(true); // no prior plan = anything is up
  });
});

describe("grantUpgradeCredits — Option A with rider 1", () => {
  it("FIRST upgrade in a cycle: grants — RPC called with the new allotment, note carries the guard prefix", async () => {
    const r = await grantUpgradeCredits({ clientId: "c1", newPlan: "scale_499", periodStartIso: PERIOD_START });
    expect(r.granted).toBe(true);
    expect(r.balance).toBe(12);
    expect(r.note.startsWith(GRANT_NOTE_PREFIX)).toBe(true);
    expect(supabaseAdmin.rpc).toHaveBeenCalledWith("raise_credits_to_allotment", { p_client_id: "c1", p_floor: 12 });
  });

  it("SECOND same-cycle upgrade: grants NOTHING — the RPC is never called (THE farm proof)", async () => {
    auditRows.mockResolvedValue({ data: [{ id: "prior-grant" }], error: null });
    const r = await grantUpgradeCredits({ clientId: "c1", newPlan: "scale_499", periodStartIso: PERIOD_START });
    expect(r.granted).toBe(false);
    expect(r.note).toContain("rider 1");
    expect(r.note.startsWith(GRANT_NOTE_PREFIX)).toBe(false); // a skip row can never key the guard
    expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
  });

  it("missing current_period_start: FAIL-CLOSED — no grant, no RPC", async () => {
    const r = await grantUpgradeCredits({ clientId: "c1", newPlan: "scale_499", periodStartIso: null });
    expect(r.granted).toBe(false);
    expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
  });

  it("guard query error: FAIL-CLOSED — no grant, no RPC", async () => {
    auditRows.mockResolvedValue({ data: null, error: { message: "boom" } });
    const r = await grantUpgradeCredits({ clientId: "c1", newPlan: "scale_499", periodStartIso: PERIOD_START });
    expect(r.granted).toBe(false);
    expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
  });

  it("RPC absent (pre-migration): loud-but-non-fatal — no grant, plan change unaffected by contract", async () => {
    rpcResult.mockResolvedValue({ data: null, error: { message: "function raise_credits_to_allotment does not exist" } });
    const r = await grantUpgradeCredits({ clientId: "c1", newPlan: "scale_499", periodStartIso: PERIOD_START });
    expect(r.granted).toBe(false);
    expect(r.note.startsWith(GRANT_NOTE_PREFIX)).toBe(false);
  });
});
