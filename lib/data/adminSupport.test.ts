// ── ADMIN SUPPORT QUEUE (2026-08-02) — the founder-ordered fail-closed proof, PAGE AND BADGE:
// a scoped staff user with no assignments sees zero requests and a zero badge, and neither
// read even touches the database. Scoped queries carry the .in(client_id, scope) filter. ──
import { describe, it, expect, vi, beforeEach } from "vitest";

const { queryResult, fromSpy, inSpy } = vi.hoisted(() => ({
  queryResult: vi.fn(),
  fromSpy: vi.fn(),
  inSpy: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => {
  const chain: Record<string, unknown> = {};
  Object.assign(chain, {
    select: vi.fn(() => chain),
    order: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn((...a: unknown[]) => { inSpy(...a); return chain; }),
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => queryResult().then(res, rej),
  });
  return { supabaseAdmin: { from: vi.fn((...a: unknown[]) => { fromSpy(...a); return chain; }) } };
});

import { getAdminSupportRequests, getOpenSupportCount } from "./adminSupport";

beforeEach(() => {
  vi.clearAllMocks();
  queryResult.mockResolvedValue({ data: [], count: 0, error: null });
});

describe("fail-closed under a scoped staff user with NO assignments (the founder's proof)", () => {
  it("PAGE: empty scope → empty list, database NEVER queried", async () => {
    expect(await getAdminSupportRequests([])).toEqual([]);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it("BADGE: empty scope → 0, database NEVER queried (no unscoped count leak)", async () => {
    expect(await getOpenSupportCount([])).toBe(0);
    expect(fromSpy).not.toHaveBeenCalled();
  });
});

describe("scoped operators get scope-filtered queries; unrestricted get none", () => {
  it("PAGE: scope ['c1'] → .in('client_id', ['c1']) applied", async () => {
    queryResult.mockResolvedValue({ data: [{ id: "r1" }], error: null });
    await getAdminSupportRequests(["c1"]);
    expect(inSpy).toHaveBeenCalledWith("client_id", ["c1"]);
  });

  it("BADGE: scope ['c1'] → the count query carries the same filter", async () => {
    queryResult.mockResolvedValue({ count: 3, error: null });
    expect(await getOpenSupportCount(["c1"])).toBe(3);
    expect(inSpy).toHaveBeenCalledWith("client_id", ["c1"]);
  });

  it("unrestricted (null scope) → no .in filter at all", async () => {
    await getAdminSupportRequests(null);
    await getOpenSupportCount(null);
    expect(inSpy).not.toHaveBeenCalled();
  });

  it("BADGE: a query error shows 0, never a fabricated count", async () => {
    queryResult.mockResolvedValue({ count: null, error: { message: "boom" } });
    expect(await getOpenSupportCount(["c1"])).toBe(0);
  });
});
