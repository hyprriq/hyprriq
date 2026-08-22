// ── THE ONE TS NOTION OF GRANT VALIDITY (founder-locked 2026-08-22, item 1b) ─────────────────
//
// Every TypeScript surface that answers "is this grant usable / what state is it in" reads THIS
// module — the landing route, the /partners banner, the sign-up code check, and the admin
// manager's status labels. A caller growing its own revoked/expired/exhausted logic is the
// defect this collapse removed (the admin manager had an independent copy until 2026-08-22);
// grantLink.callers.lock.test.ts fails the build if a caller re-derives instead of importing.
//
// TWO NOTIONS EXIST BY DESIGN, ONE PER LAYER — and only two: this module is the COURTESY
// mirror (honest UI before any promise is made), and the redeem_acquisition_grant RPC
// (20260821000400) is the GATE — row-locked, atomic, the only thing that ever grants value.
// The RPC's checks (lines 36–38 of its migration) and grantDisplayState below must agree; the
// fixtures pin this module to the RPC's exact semantics (expires_at <= now() is closed AT the
// boundary instant).
//
// Deliberately pure and dependency-free so the fixtures cover every caller's cases without
// mocking a client.

export interface GrantLinkFields {
  revoked_at: string | null;
  expires_at: string;
  redemption_count: number;
  max_redemptions: number;
}

export type GrantDisplayState = "revoked" | "expired" | "fully_redeemed" | "active";

/**
 * The one state derivation. Precedence mirrors the RPC: revoked → expired → exhausted → active.
 * (A grant both revoked and expired reads "revoked" — the deliberate act outranks the clock.)
 */
export function grantDisplayState(g: GrantLinkFields, now = Date.now()): GrantDisplayState {
  if (g.revoked_at) return "revoked";
  if (new Date(g.expires_at).getTime() <= now) return "expired";
  if (g.redemption_count >= g.max_redemptions) return "fully_redeemed";
  return "active";
}

/** Usable = exists and active. null = definitively no such code — never earns a promise. */
export function grantLinkOpen(g: GrantLinkFields | null, now = Date.now()): boolean {
  return g !== null && grantDisplayState(g, now) === "active";
}
