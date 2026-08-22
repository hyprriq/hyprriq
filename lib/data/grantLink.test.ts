import { describe, it, expect } from "vitest";
import { grantLinkOpen, type GrantLinkFields } from "./grantLink";

// ── CLICK-TIME LINK STATE (founder-found 2026-08-22: a revoked invite link still showed the
// full "assessment attached" banner). These fixtures pin the courtesy check; the redemption RPC
// remains the real gate and is not under test here.

const NOW = new Date("2026-08-22T12:00:00Z").getTime();

const open: GrantLinkFields = {
  revoked_at: null,
  expires_at: "2026-09-01T00:00:00Z",
  redemption_count: 0,
  max_redemptions: 1,
};

describe("grantLinkOpen", () => {
  it("a live grant is open", () => {
    expect(grantLinkOpen(open, NOW)).toBe(true);
  });

  it("THE FOUNDER'S REPRO: a revoked grant is closed — the banner promise is never made", () => {
    expect(grantLinkOpen({ ...open, revoked_at: "2026-08-22T11:00:00Z" }, NOW)).toBe(false);
  });

  it("expiry mirrors the admin manager: closed AT the boundary instant, open one ms before", () => {
    expect(grantLinkOpen({ ...open, expires_at: new Date(NOW).toISOString() }, NOW)).toBe(false);
    expect(grantLinkOpen({ ...open, expires_at: new Date(NOW + 1).toISOString() }, NOW)).toBe(true);
  });

  it("a fully redeemed grant is closed — including counts past the cap", () => {
    expect(grantLinkOpen({ ...open, redemption_count: 1 }, NOW)).toBe(false);
    expect(grantLinkOpen({ ...open, redemption_count: 5, max_redemptions: 3 }, NOW)).toBe(false);
  });

  it("a multi-redemption grant stays open until the cap", () => {
    expect(grantLinkOpen({ ...open, redemption_count: 2, max_redemptions: 3 }, NOW)).toBe(true);
  });

  it("no such code (null) is closed — a garbage link never earns the banner", () => {
    expect(grantLinkOpen(null, NOW)).toBe(false);
  });

  it("revoked wins even when everything else is fine (belt over braces)", () => {
    expect(
      grantLinkOpen({ revoked_at: "2026-08-01T00:00:00Z", expires_at: "2027-01-01T00:00:00Z", redemption_count: 0, max_redemptions: 100 }, NOW),
    ).toBe(false);
  });
});
