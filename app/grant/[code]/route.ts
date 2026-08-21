import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/constants/site";
import { GRANT_COOKIE } from "@/lib/constants/grantCookie";

// ── THE INVITE LINK (founder-ruled 2026-08-21): click → register → credit already applied, no
// code typed. This handler stores the code in a short-lived cookie and hands the visitor to
// sign-up; the redemption itself happens on their first authenticated portal load
// (lib/data/client.ts), through the same atomic RPC as the coupon path. PUBLIC route — the URL
// is the secret (28-char unguessable slug), and every real check lives in the RPC, so a wrong
// guess costs the guesser a sign-up and gains them 'invalid_code'.

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const res = NextResponse.redirect(new URL("/sign-up", SITE_URL));
  if (code && code.length <= 64) {
    res.cookies.set(GRANT_COOKIE, code, {
      httpOnly: true, sameSite: "lax", secure: true, path: "/",
      maxAge: 7 * 86_400, // a week to finish registering; the grant's own 30-day expiry is the real clock
    });
  }
  return res;
}
