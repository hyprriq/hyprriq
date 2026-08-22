import { describe, it, expect, vi, beforeEach } from "vitest";

// ── GRANTS DATA LAYER — fixture-locked. The shapes deliberately covered: code generation for
// both modes (link slugs unguessable, coupon codes unambiguous + prefixed), the redeem status
// mapping including 'unavailable' when the founder-run RPC is absent (fail-soft, never a
// throw), the lowercase-coupon retry, and the RULED grant value on creation (growth_279 ·
// 1 credit — constants, never defaults; item 3, founder-locked 2026-08-22).

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

import { generateGrantCode, createGrant, redeemGrant, isTerminalRedeemStatus, GRANT_PLAN_TYPE, GRANT_CREDITS, type RedeemStatus } from "./grants";

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

describe("createGrant — the ruled value, never a default (item 3, founder-locked 2026-08-22)", () => {
  it("writes GRANT_PLAN_TYPE + GRANT_CREDITS and the caller's explicit cap/expiry", async () => {
    const { grant, error } = await createGrant({ mode: "link", note: "tester", createdBy: "user_admin", expiresDays: 30, maxRedemptions: 1 });
    expect(error).toBeNull();
    const row = insertReturning.mock.calls[0][0] as Record<string, unknown>;
    expect(row.grant_plan_type).toBe(GRANT_PLAN_TYPE);
    expect(row.grant_credits).toBe(GRANT_CREDITS);
    expect(row.max_redemptions).toBe(1);
    const days = (new Date(row.expires_at as string).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.5);
    expect(days).toBeLessThan(30.5);
    expect(grant?.id).toBe("g1");
  });

  // ── THE RULING LOCK (3b/3c): a tester must never receive category compliance (Track 6 needs
  // Keepa, unbuilt), and tiers not sold must not be grantable. The constant IS the app layer's
  // whole surface — no API accepts a plan input — so pinning it pins everything.
  it("the ruled tier is growth_279 — never the coming-soon tiers, never category-compliance-bearing", () => {
    expect(GRANT_PLAN_TYPE).toBe("growth_279");
    expect(["scale_499", "single_149"]).not.toContain(GRANT_PLAN_TYPE);
    expect(GRANT_CREDITS).toBe(1);
  });

  it("createGrant writes the constant regardless of caller — no parameter can steer the tier", async () => {
    await createGrant({ mode: "coupon", note: "x", createdBy: "u", expiresDays: 7, maxRedemptions: 5 });
    const row = insertReturning.mock.calls[0][0] as Record<string, unknown>;
    expect(row.grant_plan_type).toBe("growth_279");
    expect(row.max_redemptions).toBe(5);
    const days = (new Date(row.expires_at as string).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.5);
    expect(days).toBeLessThan(7.5);
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
