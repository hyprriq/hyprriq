// ── STAFF INVITATIONS (2026-08-02) — the pure halves: capability sanitizing + open-state. ──
import { describe, it, expect } from "vitest";
import { sanitizeCapabilities, invitationOpen } from "./invitations";

describe("sanitizeCapabilities", () => {
  it("keeps only GRANTABLE capabilities — unknown strings, escalation attempts, and the super-only pair all drop", () => {
    expect(sanitizeCapabilities(["view_cases", "manage_users", "bogus", "view_all_clients", "adjust_credits"]))
      .toEqual(["view_cases"]); // manage_users is a ROLE; the super-only pair stays at the top (hierarchy 2026-08-02)
    expect(sanitizeCapabilities("not-an-array")).toEqual([]);
    expect(sanitizeCapabilities(null)).toEqual([]);
  });
});

describe("invitationOpen", () => {
  const future = new Date(Date.now() + 86_400_000).toISOString();
  const past = new Date(Date.now() - 86_400_000).toISOString();
  it("open = not accepted, not revoked, not expired", () => {
    expect(invitationOpen({ accepted_at: null, revoked_at: null, expires_at: future })).toBe(true);
  });
  it("accepted, revoked, or expired invitations can never be claimed again", () => {
    expect(invitationOpen({ accepted_at: past, revoked_at: null, expires_at: future })).toBe(false);
    expect(invitationOpen({ accepted_at: null, revoked_at: past, expires_at: future })).toBe(false);
    expect(invitationOpen({ accepted_at: null, revoked_at: null, expires_at: past })).toBe(false);
  });
});
