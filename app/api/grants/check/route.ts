import { NextResponse } from "next/server";
import { GRANT_COOKIE } from "@/lib/constants/grantCookie";
import { checkGrantCode, closedStateCopy } from "@/lib/data/grantCheck";
import { REDEEM_COPY } from "@/lib/data/grants";
import { GRANT_CODE_ENTRY_COPY } from "@/lib/content/partnerRequest";
import { rateLimit, clientIpFrom } from "@/lib/utils/rateLimit";

// ── TYPED-CODE ENTRY AT REGISTRATION (founder-locked 2a/2b, 2026-08-22) ──────────────────────
//
// PUBLIC route: the person typing has no account yet — that is the point. Validates a typed
// access code BEFORE the account exists (she must never register and then discover the code was
// dead), through the ONE shared validity path (lib/data/grantCheck → grantLink; the redeem RPC
// stays the gate at attach time). A valid code is parked in the SAME cookie the invite link
// uses, so link-arrivers and code-typers end up in the same state: register → attach applies it.
//
// GRANTS NOTHING (the 1c law carries over): this route writes no rows and reserves no value —
// it parks a code and answers honestly. Dead codes answer with the SAME pinned REDEEM_COPY
// words the billing box uses. A lookup failure here fails CLOSED with honest retry copy (unlike
// the link click, nothing breaks by asking her to try again in a moment) — logged, not silent.

const LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  if (!rateLimit(`grant-check:${clientIpFrom(req.headers)}`, LIMIT, WINDOW_MS).allowed) {
    return NextResponse.json({ ok: false, message: GRANT_CODE_ENTRY_COPY.rateLimited }, { status: 429 });
  }

  let body: { code?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: REDEEM_COPY.invalid_code }, { status: 400 });
  }
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code || code.length > 64) {
    return NextResponse.json({ ok: false, message: REDEEM_COPY.invalid_code }, { status: 400 });
  }

  const check = await checkGrantCode(code);
  if (check.outcome === "unavailable") {
    console.error(`[grant-check] signup code check unavailable for ${code.slice(0, 8)}… — FAILING CLOSED with retry copy: ${check.error}`);
    return NextResponse.json({ ok: false, message: REDEEM_COPY.unavailable }, { status: 503 });
  }
  if (check.outcome === "closed") {
    return NextResponse.json({ ok: false, message: closedStateCopy(check.state) }, { status: 400 });
  }

  // Open: park the code exactly as the invite link does (attach normalizes coupon casing).
  const res = NextResponse.json({ ok: true, message: GRANT_CODE_ENTRY_COPY.accepted });
  res.cookies.set(GRANT_COOKIE, code, {
    httpOnly: true, sameSite: "lax", secure: true, path: "/",
    maxAge: 7 * 86_400, // a week to finish registering; the grant's own expiry is the real clock
  });
  return res;
}
