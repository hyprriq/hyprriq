import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/constants/site";
import { GRANT_COOKIE } from "@/lib/constants/grantCookie";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { grantLinkOpen } from "@/lib/data/grantLink";

// ── THE INVITE LINK (founder-ruled 2026-08-21): click → register → credit already applied, no
// code typed. This handler stores the code in a short-lived cookie and lands the visitor on
// /partners with context ("a VA should arrive with context rather than 'you've been invited to
// something'" — ruled same day); the redemption itself happens on their first authenticated
// portal load (lib/data/client.ts), through the same atomic RPC as the coupon path. PUBLIC
// route — the URL is the secret (28-char unguessable slug), and every real check lives in the
// RPC, so a wrong guess costs the guesser a sign-up and gains them 'invalid_code'.
//
// CLICK-TIME HONESTY (founder-found 2026-08-22): a revoked/expired/exhausted/garbage link used
// to show the full "your assessment is attached" banner anyway — the RPC would refuse it later,
// after the person had already registered on the strength of the promise. Now the link is
// LOOKED UP first: closed links land on /partners?invite=inactive (honest line + the request
// form), with no cookie and no banner. FAIL-SOFT by design: if the lookup itself errors, the
// old behavior stands and the RPC remains the gate — a DB blip never bricks a working invite.

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const safeCode = code && code.length <= 64 ? code : null;

  // No plausible code at all (empty / oversized garbage) → the honest landing, never the banner.
  if (!safeCode) return NextResponse.redirect(new URL("/partners?invite=inactive", SITE_URL));

  const { data, error } = await supabaseAdmin
    .from("acquisition_grants")
    .select("revoked_at, expires_at, redemption_count, max_redemptions")
    .eq("code", safeCode)
    .maybeSingle();
  // error → skip the courtesy check (fail-soft); no error → data:null means NO such code.
  if (!error && !grantLinkOpen(data)) {
    return NextResponse.redirect(new URL("/partners?invite=inactive", SITE_URL));
  }

  // The code rides the redirect too (same secret the clicked URL already carried) so the
  // partners banner can show it for the cross-device path: register elsewhere → type it on the
  // billing page. The cookie remains the hands-free same-browser carrier.
  const dest = new URL("/partners?invited=1", SITE_URL);
  if (safeCode) dest.searchParams.set("code", safeCode);
  const res = NextResponse.redirect(dest);
  if (safeCode) {
    res.cookies.set(GRANT_COOKIE, safeCode, {
      httpOnly: true, sameSite: "lax", secure: true, path: "/",
      maxAge: 7 * 86_400, // a week to finish registering; the grant's own 30-day expiry is the real clock
    });
  }
  return res;
}
