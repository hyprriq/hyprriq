import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { redeemGrant, REDEEM_COPY, REDEEM_SUCCESS_COPY } from "@/lib/data/grants";

// ── COUPON REDEMPTION (founder-ruled 2026-08-21) — the typed-code mode. Authenticated client
// posts their code; the RPC does every check atomically; this route only maps status words to
// plain copy ("full assessment" framing — never the tier name). The invite-link mode redeems
// automatically on portal load (lib/data/client.ts); both paths end at the same RPC.

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { code?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code || code.length > 64) return NextResponse.json({ error: "invalid_code", message: REDEEM_COPY.invalid_code }, { status: 400 });

  const status = await redeemGrant(code, userId);
  if (status === "ok") return NextResponse.json({ ok: true, message: REDEEM_SUCCESS_COPY });
  const httpStatus = status === "unavailable" ? 503 : 400;
  return NextResponse.json({ error: status, message: REDEEM_COPY[status] }, { status: httpStatus });
}
