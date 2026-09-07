import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redeemGrant, isTerminalRedeemStatus, REDEEM_COPY, REDEEM_SUCCESS_COPY, wrongAccountMessage, getGrantRecipientByCode } from "@/lib/data/grants";
import { GRANT_COOKIE } from "@/lib/constants/grantCookie";

// ── INVITE-LINK ATTACH (grant-carrier rework, founder-directed 2026-08-21) ───────────────────
//
// The failure this kills: a parked cookie whose redemption fails (or never runs) producing a
// SILENT normal signup — the VA sees no offer, nothing errors, nobody finds out. This route is
// the ONE place the cookie is consumed, and it exists as a route (not a server component)
// because only a route can CLEAR the cookie:
//   · ok        → redeemed; cookie cleared; success copy returned (visible to the user)
//   · terminal  (expired / revoked / exhausted / email_already_used / already_has_plan /
//                invalid_code) → cookie cleared so it never re-fires; AUDITED so the founder
//                can see the failed attach in the admin; plain copy returned (visible)
//   · retryable (unavailable / no_client) → cookie KEPT; the next portal load tries again
// Called by the GrantAttach portal component once per session while the account is plan-less.

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const jar = await cookies();
  const code = jar.get(GRANT_COOKIE)?.value;
  if (!code) return NextResponse.json({ status: "no_cookie" });

  const status = await redeemGrant(code, userId);
  // wrong_account upgrades to the MASKED form (founder-ruled 2026-09-07): first char + ••• +
  // domain — enough for the right person to recognize their own address, nothing for a stranger
  // holding a forwarded link to harvest. The full address never leaves the server.
  const message = status === "ok"
    ? REDEEM_SUCCESS_COPY
    : status === "wrong_account"
      ? wrongAccountMessage(await getGrantRecipientByCode(code))
      : REDEEM_COPY[status];
  const res = NextResponse.json({ status, message });
  if (status === "ok" || isTerminalRedeemStatus(status)) {
    res.cookies.set(GRANT_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 0 });
  }
  if (isTerminalRedeemStatus(status)) {
    try {
      await supabaseAdmin.from("audit_log").insert({
        table_name: "grant_redemptions", record_id: null, action: "INSERT",
        actor_id: userId, actor_type: "client",
        new_value: { grant_attach_failed: true, status, code_prefix: code.slice(0, 8), client_id: userId },
      });
    } catch { /* the reporter never blocks the answer */ }
  }
  return res;
}
