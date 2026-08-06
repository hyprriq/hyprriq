import { describe, it, expect, vi, beforeEach } from "vitest";

const { permRow, clientRow } = vi.hoisted(() => ({
  permRow: vi.fn().mockResolvedValue({ data: null, error: null }),
  clientRow: vi.fn().mockResolvedValue({ data: null, error: null }),
}));
vi.mock("@/lib/supabase/admin", () => {
  const chain = (result: () => Promise<unknown>) => {
    const c: Record<string, unknown> = {};
    Object.assign(c, { select: vi.fn(() => c), eq: vi.fn(() => c), maybeSingle: () => result() });
    return c;
  };
  return { supabaseAdmin: { from: vi.fn((t: string) => (t === "admin_permissions" ? chain(permRow) : chain(clientRow))) } };
});

import { getOperator, can, canManageUsers, canManageStaff, FULL_ACCESS, CAPABILITIES, GRANTABLE_CAPABILITIES, SUPER_ADMIN_ONLY_CAPS } from "./permissions";

beforeEach(() => {
  permRow.mockReset().mockResolvedValue({ data: null, error: null });
  clientRow.mockReset().mockResolvedValue({ data: null, error: null });
});

describe("the role hierarchy (checked capabilities, never ids)", () => {
  it("FAIL CLOSED: no permission row + no legacy role = no operator, no capability", async () => {
    const op = await getOperator("u1");
    expect(op).toBeNull();
    expect(can(op, "run_case")).toBe(false);
    expect(canManageUsers(op)).toBe(false);
  });

  it("a sub_user carries EXACTLY the granted capabilities — unknown strings are dropped, manage-users is never grantable", async () => {
    permRow.mockResolvedValue({ data: { user_id: "u1", role: "sub_user", capabilities: ["run_case", "rerun", "manage_users", "bogus"], disabled: false }, error: null });
    const op = await getOperator("u1");
    expect(can(op, "run_case")).toBe(true);
    expect(can(op, "adjust_credits")).toBe(false);
    expect(canManageUsers(op)).toBe(false); // NO SELF-ESCALATION: the string grants nothing
  });

  it("FULL ACCESS preset = every GRANTABLE capability; the super-only pair stays out (hierarchy 2026-08-02)", async () => {
    permRow.mockResolvedValue({ data: { user_id: "u1", role: "sub_user", capabilities: [...FULL_ACCESS], disabled: false }, error: null });
    const op = await getOperator("u1");
    for (const cap of GRANTABLE_CAPABILITIES) expect(can(op, cap), cap).toBe(true);
    for (const cap of SUPER_ADMIN_ONLY_CAPS) expect(can(op, cap), cap).toBe(false);
    expect(canManageUsers(op)).toBe(false);
  });

  it("READ-TIME STRIP: a hand-edited sub_user row carrying the super-only pair still cannot exercise it", async () => {
    permRow.mockResolvedValue({ data: { user_id: "u1", role: "sub_user", capabilities: ["view_cases", "adjust_credits", "view_all_clients"], disabled: false }, error: null });
    const op = await getOperator("u1");
    expect(can(op, "view_cases")).toBe(true);
    expect(can(op, "adjust_credits")).toBe(false);   // money stays at the top
    expect(can(op, "view_all_clients")).toBe(false); // scope-breaker stays at the top
  });

  it("the ADMIN role manages staff but not admins; capabilities stay checked like staff", async () => {
    permRow.mockResolvedValue({ data: { user_id: "u1", role: "admin", capabilities: ["view_cases", "run_case"], disabled: false }, error: null });
    const op = await getOperator("u1");
    expect(op?.role).toBe("admin");
    expect(canManageStaff(op)).toBe(true);
    expect(canManageUsers(op)).toBe(false);
    expect(can(op, "run_case")).toBe(true);
    expect(can(op, "review_publish")).toBe(false);
  });

  it("the super admin can do everything including managing users", async () => {
    permRow.mockResolvedValue({ data: { user_id: "u0", role: "super_admin", capabilities: [], disabled: false }, error: null });
    const op = await getOperator("u0");
    for (const cap of CAPABILITIES) expect(can(op, cap)).toBe(true);
    expect(canManageUsers(op)).toBe(true);
  });

  it("DISABLED beats everything — including the legacy fallback", async () => {
    permRow.mockResolvedValue({ data: { user_id: "u1", role: "super_admin", capabilities: [], disabled: true }, error: null });
    clientRow.mockResolvedValue({ data: { role: "founder" }, error: null });
    expect(await getOperator("u1")).toBeNull();
  });

  it("TRANSITIONAL: legacy clients.role='founder' operates as super-admin-equivalent until the seed lands", async () => {
    clientRow.mockResolvedValue({ data: { role: "founder" }, error: null });
    const op = await getOperator("u-legacy");
    expect(op?.role).toBe("super_admin");
    expect(op?.transitional).toBe(true);
  });

  it("a pre-migration table error fails toward the fallback, never toward open", async () => {
    permRow.mockRejectedValue(new Error("relation admin_permissions does not exist"));
    const op = await getOperator("u1");
    expect(op).toBeNull(); // no legacy role either → closed
  });
});
