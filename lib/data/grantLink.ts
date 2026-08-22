// ── INVITE-LINK STATE AT CLICK TIME (founder-found 2026-08-22: a REVOKED link still showed the
// "your free full assessment is attached" banner and a sign-up push — the money was safe (the
// redemption RPC is the real gate and refuses revoked/expired/exhausted codes), but the visitor
// was promised at the door what the counter would refuse). This pure check lets /grant/[code]
// answer honestly BEFORE the promise is made. It is a COURTESY CHECK, not the gate: the RPC
// keeps every real decision, and a lookup failure fails SOFT to the old behavior — a transient
// DB blip must never brick a working invite link.
//
// Deliberately pure and dependency-free so the fixtures cover it without mocking a client.

export interface GrantLinkFields {
  revoked_at: string | null;
  expires_at: string;
  redemption_count: number;
  max_redemptions: number;
}

/** Mirrors grantState() in the admin manager: revoked, expired (<= now), or fully redeemed = closed. */
export function grantLinkOpen(g: GrantLinkFields | null, now = Date.now()): boolean {
  if (!g) return false; // definitively no such code — the banner would promise a credit that cannot exist
  if (g.revoked_at) return false;
  if (new Date(g.expires_at).getTime() <= now) return false;
  if (g.redemption_count >= g.max_redemptions) return false;
  return true;
}
