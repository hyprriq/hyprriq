import { describe, it, expect, vi, beforeEach } from "vitest";

// ── GRANTS DATA LAYER — fixture-locked. The shapes deliberately covered: code generation for
// both modes (link slugs unguessable, coupon codes unambiguous + prefixed), the redeem status
// mapping including 'unavailable' when the founder-run RPC is absent (fail-soft, never a
// throw), the lowercase-coupon retry, and the ruled defaults (1 redemption, 30 days, the
// full-report tier) on creation.

const { rpcMock, insertReturning, billingInsert } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  insertReturning: vi.fn(),
  billingInsert: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    rpc: rpcMock,
    from: vi.fn((table: string) => table === "billing_audit"
      ? { insert: billingInsert }
      : {
          insert: (row: unknown) => ({ select: () => ({ single: () => insertReturning(row) }) }),
          select: () => ({ order: () => Promise.resolve({ data: [] }) }),
          update: () => ({ eq: () => ({ is: () => Promise.resolve({ error: null }) }) }),
        }),
  },
}));

import { generateGrantCode, createGrant, redeemGrant, isTerminalRedeemStatus, type RedeemStatus } from "./grants";

beforeEach(() => {
  rpcMock.mockReset();
  billingInsert.mockClear();
  insertReturning.mockReset().mockImplementation((row) => Promise.resolve({ data: { id: "g1", ...(row as object) }, error: null }));
});

describe("code generation", () => {
  it("link slugs are 28 chars of the unambiguous alphabet — the URL is the secret", () => {
    const code = generateGrantCode("link");
    expect(code).toMatch(/^[A-HJ-NP-Za-km-z2-9]{28}$/);
    expect(generateGrantCode("link")).not.toBe(code);
  });
  it("coupon codes are HYPRR-prefixed, 8 unambiguous uppercase chars (no 0/O/1/I/L)", () => {
    const code = generateGrantCode("coupon");
    expect(code).toMatch(/^HYPRR-[A-HJ-KM-NP-Z2-9]{8}$/);
    expect(code).not.toMatch(/[0OIL1]/);
  });
});

describe("createGrant — the ruled defaults", () => {
  it("defaults: full-report tier, 1 credit, 1 redemption, 30-day expiry", async () => {
    const { grant, error } = await createGrant({ mode: "link", note: "tester", createdBy: "user_admin" });
    expect(error).toBeNull();
    const row = insertReturning.mock.calls[0][0] as Record<string, unknown>;
    expect(row.grant_plan_type).toBe("scale_499");
    expect(row.grant_credits).toBe(1);
    expect(row.max_redemptions).toBe(1);
    const days = (new Date(row.expires_at as string).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.5);
    expect(days).toBeLessThan(30.5);
    expect(grant?.id).toBe("g1");
  });
});

describe("redeemGrant — one write path, fail-soft", () => {
  it("passes the status word through on success and records billing history", async () => {
    rpcMock.mockResolvedValue({ data: "ok", error: null });
    expect(await redeemGrant("HYPRR-ABCD2345", "user_1")).toBe("ok");
    expect(rpcMock).toHaveBeenCalledWith("redeem_acquisition_grant", { p_code: "HYPRR-ABCD2345", p_client_id: "user_1" });
    expect(billingInsert).toHaveBeenCalledWith(expect.objectContaining({ event: "grant_redeemed", source: "grant" }));
  });

  it("a typed lowercase coupon gets ONE normalized retry", async () => {
    rpcMock
      .mockResolvedValueOnce({ data: "invalid_code", error: null })
      .mockResolvedValueOnce({ data: "ok", error: null });
    expect(await redeemGrant("hyprr-abcd2345", "user_1")).toBe("ok");
    expect(rpcMock).toHaveBeenNthCalledWith(2, "redeem_acquisition_grant", { p_code: "HYPRR-ABCD2345", p_client_id: "user_1" });
  });

  it("RPC absent (founder hasn't run 20260821000400) → 'unavailable', never a throw", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "function redeem_acquisition_grant does not exist" } });
    expect(await redeemGrant("HYPRR-ABCD2345", "user_1")).toBe("unavailable");
    expect(billingInsert).not.toHaveBeenCalled();
  });

  it("refusal words pass through untouched and write no billing row", async () => {
    for (const word of ["already_has_plan", "email_already_used", "exhausted", "expired", "revoked"]) {
      rpcMock.mockResolvedValue({ data: word, error: null });
      expect(await redeemGrant("HYPRR-ABCD2345", "user_1")).toBe(word);
    }
    expect(billingInsert).not.toHaveBeenCalled();
  });

  it("an empty code never reaches the database", async () => {
    expect(await redeemGrant("   ", "user_1")).toBe("invalid_code");
    expect(rpcMock).not.toHaveBeenCalled();
  });
});

describe("isTerminalRedeemStatus — the attach route's cookie-clearing law", () => {
  it("terminal statuses clear the cookie: retrying the same code+account can never succeed", () => {
    for (const s of ["invalid_code", "revoked", "expired", "exhausted", "already_has_plan", "email_already_used"] as RedeemStatus[]) {
      expect(isTerminalRedeemStatus(s), s).toBe(true);
    }
  });
  it("ok clears too (consumed) but is not 'terminal'; retryable outages keep the cookie alive", () => {
    expect(isTerminalRedeemStatus("ok")).toBe(false);
    expect(isTerminalRedeemStatus("unavailable")).toBe(false); // RPC/transport down → next session retries
    expect(isTerminalRedeemStatus("no_client")).toBe(false);   // provisioning race → next load succeeds
  });
});
