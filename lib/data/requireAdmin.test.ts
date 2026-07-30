import { describe, it, expect, vi, beforeEach } from "vitest";

// ── ADMIN ACCESS FIX — the two-sided proof the batch order demanded:
// (1) an operator identity with NO clients row (the seeded super admin) now REACHES admin;
// (2) a plain client still BOUNCES to the portal. redirect() throws a sentinel so the
// bounce is assertable. ──

const { authMock, getOperatorMock, redirectMock } = vi.hoisted(() => ({
  authMock: vi.fn().mockResolvedValue({ userId: "u1" }),
  getOperatorMock: vi.fn().mockResolvedValue(null),
  redirectMock: vi.fn((to: string) => { throw new Error(`REDIRECT:${to}`); }),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/auth/permissions", () => ({ getOperator: getOperatorMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/lib/supabase/admin", () => {
  const chain: Record<string, unknown> = {};
  Object.assign(chain, {
    select: vi.fn(() => chain), eq: vi.fn(() => chain),
    maybeSingle: vi.fn().mockResolvedValue({ data: null }), // display-field enrichment: no rows is fine
  });
  return { supabaseAdmin: { from: vi.fn(() => chain) } };
});

import { requireAdmin } from "./admin";

beforeEach(() => {
  authMock.mockResolvedValue({ userId: "u1" });
  getOperatorMock.mockReset().mockResolvedValue(null);
  redirectMock.mockClear();
});

describe("requireAdmin — operator-gated admin page access", () => {
  it("SIDE 1: a seeded operator with NO clients row reaches admin (the super-admin door opens)", async () => {
    getOperatorMock.mockResolvedValue({ user_id: "u1", role: "super_admin", capabilities: [] });
    const op = await requireAdmin();
    expect(op.role).toBe("super_admin");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("SIDE 2: a plain client (getOperator fail-closed) still bounces to the portal", async () => {
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/portal/dashboard");
  });

  it("unauthenticated bounces to sign-in", async () => {
    authMock.mockResolvedValue({ userId: null });
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/sign-in");
  });

  it("the transitional founder identity (legacy clients.role via getOperator's fallback) still reaches admin", async () => {
    getOperatorMock.mockResolvedValue({ user_id: "u1", role: "super_admin", capabilities: [], transitional: true });
    const op = await requireAdmin();
    expect(op.transitional).toBe(true);
  });
});
