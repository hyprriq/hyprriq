import { describe, it, expect, vi, beforeEach } from "vitest";

// ── THE ONE SERVER LOOKUP (items 1b/2b, 2026-08-22): checkGrantCode drives the landing route,
// the /partners banner, and the sign-up code check — these fixtures cover the shapes a caller
// can meet, including the lowercase-coupon retry and the never-silent unavailable path.

const { maybeSingleMock, auditInsert } = vi.hoisted(() => ({
  maybeSingleMock: vi.fn(),
  auditInsert: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) =>
      table === "audit_log"
        ? { insert: auditInsert }
        : { select: () => ({ eq: (_c: string, code: string) => ({ maybeSingle: () => maybeSingleMock(code) }) }) },
    ),
  },
}));

import { checkGrantCode, closedStateCopy, logGrantCheckFailOpen } from "./grantCheck";
import { REDEEM_COPY } from "./grants";

const openRow = { revoked_at: null, expires_at: "2999-01-01T00:00:00Z", redemption_count: 0, max_redemptions: 1 };

beforeEach(() => {
  maybeSingleMock.mockReset();
  auditInsert.mockClear();
});

describe("checkGrantCode", () => {
  it("a live grant answers open", async () => {
    maybeSingleMock.mockResolvedValue({ data: openRow, error: null });
    expect(await checkGrantCode("SomeLinkSlug")).toEqual({ outcome: "open" });
  });

  it("a typed lowercase coupon gets ONE normalized retry — the same courtesy the gate extends", async () => {
    maybeSingleMock
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: openRow, error: null });
    expect(await checkGrantCode("hyprr-abcd2345")).toEqual({ outcome: "open" });
    expect(maybeSingleMock).toHaveBeenNthCalledWith(2, "HYPRR-ABCD2345");
  });

  it("closed states come from the shared derivation — revoked / expired / fully redeemed", async () => {
    for (const [row, state] of [
      [{ ...openRow, revoked_at: "2026-08-22T00:00:00Z" }, "revoked"],
      [{ ...openRow, expires_at: "2020-01-01T00:00:00Z" }, "expired"],
      [{ ...openRow, redemption_count: 1 }, "fully_redeemed"],
    ] as const) {
      maybeSingleMock.mockResolvedValue({ data: row, error: null });
      expect(await checkGrantCode("HYPRR-ABCD2345")).toEqual({ outcome: "closed", state });
    }
  });

  it("definitively no such code (both casings) → closed, never unavailable", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    expect(await checkGrantCode("hyprr-nope9999")).toEqual({ outcome: "closed", state: "no_such_code" });
  });

  it("a lookup error is 'unavailable' — the caller decides its surface's fail direction", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: { message: "connection refused" } });
    expect(await checkGrantCode("HYPRR-ABCD2345")).toEqual({ outcome: "unavailable", error: "connection refused" });
  });
});

describe("closedStateCopy — dead codes speak the gate's pinned words (2c: one vocabulary)", () => {
  it("maps every closed state onto REDEEM_COPY, never new prose", () => {
    expect(closedStateCopy("revoked")).toBe(REDEEM_COPY.revoked);
    expect(closedStateCopy("expired")).toBe(REDEEM_COPY.expired);
    expect(closedStateCopy("fully_redeemed")).toBe(REDEEM_COPY.exhausted);
    expect(closedStateCopy("no_such_code")).toBe(REDEEM_COPY.invalid_code);
  });
});

describe("logGrantCheckFailOpen — the 1c record", () => {
  it("writes the audit row that distinguishes a fail-open from the pre-fix bug", async () => {
    await logGrantCheckFailOpen("partners_banner", "SomeLinkSlug99", "timeout");
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      new_value: expect.objectContaining({ grant_link_fail_open: true, surface: "partners_banner", code_prefix: "SomeLink", error: "timeout" }),
    }));
  });
});
