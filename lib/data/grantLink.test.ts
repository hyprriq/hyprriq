import { describe, it, expect } from "vitest";
import { grantLinkOpen, grantDisplayState, type GrantLinkFields } from "./grantLink";

// ── THE ONE VALIDITY NOTION (item 1b, founder-locked 2026-08-22). These fixtures pin the shared
// derivation every TS caller reads (landing, banner, sign-up check, admin labels); the caller
// lock test beside this file guarantees nobody re-derives. The redeem RPC stays the gate and is
// not under test here — but the semantics below deliberately mirror its checks line for line.

const NOW = new Date("2026-08-22T12:00:00Z").getTime();

const open: GrantLinkFields = {
  revoked_at: null,
  expires_at: "2026-09-01T00:00:00Z",
  redemption_count: 0,
  max_redemptions: 1,
};

describe("grantDisplayState — the shared derivation", () => {
  it("a live grant is active", () => {
    expect(grantDisplayState(open, NOW)).toBe("active");
  });

  it("THE FOUNDER'S REPRO: revoked — at every caller, not just the landing", () => {
    expect(grantDisplayState({ ...open, revoked_at: "2026-08-22T11:00:00Z" }, NOW)).toBe("revoked");
  });

  it("expiry mirrors the RPC (expires_at <= now()): closed AT the boundary instant, open one ms before", () => {
    expect(grantDisplayState({ ...open, expires_at: new Date(NOW).toISOString() }, NOW)).toBe("expired");
    expect(grantDisplayState({ ...open, expires_at: new Date(NOW + 1).toISOString() }, NOW)).toBe("active");
  });

  it("fully redeemed — including counts past the cap", () => {
    expect(grantDisplayState({ ...open, redemption_count: 1 }, NOW)).toBe("fully_redeemed");
    expect(grantDisplayState({ ...open, redemption_count: 5, max_redemptions: 3 }, NOW)).toBe("fully_redeemed");
  });

  it("a multi-redemption grant stays active until the cap", () => {
    expect(grantDisplayState({ ...open, redemption_count: 2, max_redemptions: 3 }, NOW)).toBe("active");
  });

  it("precedence mirrors the RPC: revoked outranks expired outranks exhausted", () => {
    expect(
      grantDisplayState({ revoked_at: "2026-08-01T00:00:00Z", expires_at: "2026-08-02T00:00:00Z", redemption_count: 9, max_redemptions: 1 }, NOW),
    ).toBe("revoked");
    expect(
      grantDisplayState({ revoked_at: null, expires_at: "2026-08-02T00:00:00Z", redemption_count: 9, max_redemptions: 1 }, NOW),
    ).toBe("expired");
  });
});

describe("grantLinkOpen — usable means exists AND active", () => {
  it("open only for an active grant", () => {
    expect(grantLinkOpen(open, NOW)).toBe(true);
    expect(grantLinkOpen({ ...open, revoked_at: "2026-08-22T11:00:00Z" }, NOW)).toBe(false);
    expect(grantLinkOpen({ ...open, expires_at: "2026-08-01T00:00:00Z" }, NOW)).toBe(false);
    expect(grantLinkOpen({ ...open, redemption_count: 1 }, NOW)).toBe(false);
  });

  it("no such code (null) is closed — a garbage link never earns the banner", () => {
    expect(grantLinkOpen(null, NOW)).toBe(false);
  });
});
