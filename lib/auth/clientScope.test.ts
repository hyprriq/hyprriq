// ── CLIENT PARTITIONING (2026-08-02) — the scoping matrix, fail-closed proven. ──
import { describe, it, expect, vi, beforeEach } from "vitest";

const { assignmentRows, caseRow } = vi.hoisted(() => ({
  assignmentRows: vi.fn().mockResolvedValue({ data: [], error: null }),
  caseRow: vi.fn().mockResolvedValue({ data: null, error: null }),
}));
vi.mock("@/lib/supabase/admin", () => {
  const chain = (terminal: Record<string, () => Promise<unknown>>) => {
    const c: Record<string, unknown> = {};
    Object.assign(c, {
      select: vi.fn(() => c),
      eq: vi.fn(() => c),
      then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => terminal.list().then(res, rej),
      maybeSingle: () => terminal.single(),
    });
    return c;
  };
  return {
    supabaseAdmin: {
      from: vi.fn((t: string) =>
        t === "staff_client_assignments"
          ? chain({ list: () => assignmentRows(), single: () => assignmentRows() })
          : chain({ list: () => caseRow(), single: () => caseRow() }),
      ),
    },
  };
});

import { seesAllClients, getClientScope, clientInScope, caseInScope } from "./clientScope";
import type { Operator } from "@/lib/auth/permissions";

const superAdmin: Operator = { user_id: "sa", role: "super_admin", capabilities: ["view_cases", "review_publish", "run_case", "rerun", "adjust_credits", "view_billing", "view_all_clients"] };
const elevated: Operator = { user_id: "e1", role: "sub_user", capabilities: ["view_cases", "view_all_clients"] };
const scoped: Operator = { user_id: "s1", role: "sub_user", capabilities: ["view_cases", "adjust_credits"] };
const legacy: Operator = { user_id: "f1", role: "super_admin", capabilities: [], transitional: true };

beforeEach(() => {
  vi.clearAllMocks();
  assignmentRows.mockResolvedValue({ data: [], error: null });
  caseRow.mockResolvedValue({ data: null, error: null });
});

describe("seesAllClients — the elevation matrix", () => {
  it("super_admin always; view_all_clients grant; transitional legacy; plain sub_user NO; null NO", () => {
    expect(seesAllClients(superAdmin)).toBe(true);
    expect(seesAllClients(elevated)).toBe(true);
    expect(seesAllClients(legacy)).toBe(true);
    expect(seesAllClients(scoped)).toBe(false);
    expect(seesAllClients(null)).toBe(false);
  });
});

describe("getClientScope", () => {
  it("unrestricted operators get null (no assignments query at all)", async () => {
    expect(await getClientScope(superAdmin)).toBeNull();
    expect(await getClientScope(elevated)).toBeNull();
  });

  it("scoped sub_user gets exactly the assigned ids", async () => {
    assignmentRows.mockResolvedValue({ data: [{ client_id: "c1" }, { client_id: "c2" }], error: null });
    expect(await getClientScope(scoped)).toEqual(["c1", "c2"]);
  });

  it("FAIL CLOSED: assignments table absent/query error → EMPTY scope, never everything", async () => {
    assignmentRows.mockResolvedValue({ data: null, error: { message: "relation does not exist" } });
    expect(await getClientScope(scoped)).toEqual([]);
  });

  it("no assignments yet → empty scope (sees nothing, not all)", async () => {
    expect(await getClientScope(scoped)).toEqual([]);
  });
});

describe("clientInScope / caseInScope — route guards", () => {
  it("scoped operator: assigned client passes, unassigned refused", async () => {
    assignmentRows.mockResolvedValue({ data: [{ client_id: "c1" }], error: null });
    expect(await clientInScope(scoped, "c1")).toBe(true);
    expect(await clientInScope(scoped, "c9")).toBe(false);
  });

  it("caseInScope resolves the owning client; missing case is refused", async () => {
    caseRow.mockResolvedValue({ data: { client_id: "c1" }, error: null });
    assignmentRows.mockResolvedValue({ data: [{ client_id: "c1" }], error: null });
    expect(await caseInScope(scoped, "case-1")).toBe(true);
    caseRow.mockResolvedValue({ data: null, error: null });
    expect(await caseInScope(scoped, "case-ghost")).toBe(false);
  });

  it("super_admin bypasses everything — no lookups, always true", async () => {
    expect(await clientInScope(superAdmin, "anything")).toBe(true);
    expect(await caseInScope(superAdmin, "anything")).toBe(true);
  });
});
