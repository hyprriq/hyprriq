// ── ADMIN FOUNDATIONS (2026-08-02) — STAFF INVITATIONS, WordPress-style, founder-ruled.
// Flow: super admin enters an email + capabilities → admin_invitations row + Resend email with
// the sign-up link → invitee creates their Clerk login normally → on their FIRST admin visit,
// requireAdmin finds no operator, calls claimAdminInvitation, and the pending invitation for
// their CLERK-VERIFIED email materializes the admin_permissions sub_user row. Audited both ends.
//
// WHY claim-by-verified-email (not a token handshake): Clerk owns email verification; an
// invitation is created by a super admin FOR a specific address, so possession of the verified
// address IS the credential. No Clerk webhook dependency, no token to leak — the email carries
// only the ordinary sign-up URL. Expiry + revocation live on the row. Only sub_user rows can
// ever be minted this way (a super_admin row remains founder-seeded SQL, never API/claim).

import { clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { GRANTABLE_CAPABILITIES, type Capability } from "@/lib/auth/capabilities";

export const INVITATION_TTL_DAYS = 7;

// GRANTABLE only (hierarchy 2026-08-02): the claim path can never materialize the super-only
// pair, even from a hand-edited invitation row — grant-time filtering is the other half.
export function sanitizeCapabilities(input: unknown): Capability[] {
  if (!Array.isArray(input)) return [];
  return input.filter((c): c is Capability => (GRANTABLE_CAPABILITIES as readonly string[]).includes(c as string));
}

export function invitationOpen(inv: { accepted_at: string | null; revoked_at: string | null; expires_at: string }): boolean {
  return !inv.accepted_at && !inv.revoked_at && new Date(inv.expires_at).getTime() > Date.now();
}

/**
 * Called by requireAdmin ONLY when getOperator returned null (cheap: never on the hot path).
 * Returns true if an invitation was claimed (caller re-runs getOperator).
 */
export async function claimAdminInvitation(userId: string): Promise<boolean> {
  try {
    const cc = await clerkClient();
    const user = await cc.users.getUser(userId);
    const verified = user.emailAddresses
      .filter((e) => e.verification?.status === "verified")
      .map((e) => e.emailAddress.toLowerCase());
    if (verified.length === 0) return false;

    const { data: rows, error } = await supabaseAdmin
      .from("admin_invitations")
      .select("id, email, capabilities, invited_by, expires_at, accepted_at, revoked_at")
      .in("email", verified)
      .is("accepted_at", null)
      .is("revoked_at", null);
    if (error || !rows || rows.length === 0) return false;
    const open = rows.find((r) => invitationOpen(r));
    if (!open) return false;

    // Materialize the sub_user row. Insert (not upsert): if a row already exists the claim is
    // moot and the unique PK refuses — fail quiet, the operator path re-checks anyway.
    const caps = sanitizeCapabilities(open.capabilities);
    const { error: insErr } = await supabaseAdmin.from("admin_permissions").insert({
      user_id: userId, email: open.email, role: "sub_user", capabilities: caps, created_by: open.invited_by,
    });
    if (insErr) return false;
    await supabaseAdmin.from("admin_invitations")
      .update({ accepted_at: new Date().toISOString(), accepted_user_id: userId })
      .eq("id", open.id);
    await supabaseAdmin.from("audit_log").insert({
      table_name: "admin_invitations", record_id: String(open.id), action: "UPDATE",
      actor_id: userId, actor_type: "admin",
      new_value: { invitation_accepted: true, email: open.email, capabilities: caps, invited_by: open.invited_by },
    });
    return true;
  } catch {
    return false; // claim is best-effort; a failure just means the normal redirect happens
  }
}
