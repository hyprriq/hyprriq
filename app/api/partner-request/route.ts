import { NextResponse } from "next/server";
import { parsePartnerRequest, roleLabel, clientsBandLabel } from "@/lib/content/partnerRequest";
import { createPartnerRequest } from "@/lib/data/partnerRequests";
import { recordMarketingConsent } from "@/lib/data/marketingConsent";
import { sendAdminAlert } from "@/lib/email/notify";
import { rateLimit, clientIpFrom } from "@/lib/utils/rateLimit";

// ── PARTNER REQUEST INTAKE (founder-ruled 2026-08-22, item 1 — the mailto's replacement) ─────
//
// PUBLIC route (lib/auth/public-routes.ts): the whole point is a cold visitor with no account.
// Files a REQUEST row and pages the founder; RULED 1c — nothing here creates, reserves, or
// promises a grant. Grants are issued by hand from /admin/acquisition.
//
// Abuse posture (1h), in order of authority:
//   1. Server-side validation (lib/content/partnerRequest.ts) — the form is advisory only.
//   2. The DB's one-open-request-per-address unique index — duplicates cost nothing and page nobody.
//   3. Honeypot: bots that fill the hidden "website" field get a cheerful 200 and write nothing
//      (a 4xx would teach the bot the field is a trap). No CAPTCHA, ruled.
//   4. Per-IP nuisance brake (in-process, best-effort — see lib/utils/rateLimit.ts for scope).
//
// The founder email rides sendAdminAlert (OpsAlert on the shared EmailLayout, banned-language
// gated like every sender). Non-fatal by contract: the DB row is the durable record and the
// admin panel shows it either way — a blocked or failed email loses nothing.

const LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // Honeypot BEFORE the rate limit: trapped bots shouldn't consume a human's window either.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  if (!rateLimit(`partner-request:${clientIpFrom(req.headers)}`, LIMIT, WINDOW_MS).allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const parsed = parsePartnerRequest(body);
  if (parsed.error !== null) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = parsed.input;

  const result = await createPartnerRequest(input);
  if (result.status === "unavailable") return NextResponse.json({ error: "unavailable" }, { status: 503 });

  // Consent is a SEPARATE, optional act with its own unchecked-by-default box — recorded through
  // the one existing consent write (never a second implementation). Fail-soft: a consent-ledger
  // hiccup never fails the request the visitor actually made.
  if (input.marketingOptIn) {
    const consent = await recordMarketingConsent(input.email, "partner_request");
    if (!consent.ok) console.error(`[partner-request] consent write failed (non-fatal): ${consent.error}`);
  }

  // Duplicate = a pending request already holds this address: same honest 200 to the visitor
  // (their request IS on file), no second row, no second email — the no-admin-noise rule.
  if (result.status === "duplicate") return NextResponse.json({ ok: true });

  const r = result.request;
  const sent = await sendAdminAlert(
    `Partner request — ${input.name}`,
    [
      `<p><b>${esc(input.name)}</b> (${esc(input.email)}) asked to try HyprrIQ.</p>`,
      `<p>What they do: <b>${esc(roleLabel(input.role))}</b> · sources for <b>${esc(clientsBandLabel(input.clientsBand))}</b></p>`,
      input.note ? `<p>Note: ${esc(input.note)}</p>` : "",
      `<p>Decide in the admin: Acquisition → Partner requests (request ${esc(r.id.slice(0, 8))}…). Issuing a grant stays your manual call — this request reserved nothing.</p>`,
    ].join(""),
  );
  if (!sent.sent) console.error(`[partner-request] founder notification not sent (${sent.reason}) — request ${r.id} is in the admin panel regardless`);

  return NextResponse.json({ ok: true });
}
