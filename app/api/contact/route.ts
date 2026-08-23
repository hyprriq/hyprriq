import { NextResponse } from "next/server";
import { parseContactRequest } from "@/lib/content/contact";
import { sendAdminAlert } from "@/lib/email/notify";
import { rateLimit, clientIpFrom } from "@/lib/utils/rateLimit";

// ── CONTACT INTAKE (2026-08-24) ───────────────────────────────────────────────────────────────
//
// PUBLIC route (lib/auth/public-routes.ts): the sender is a cold visitor with no account, which is
// the whole point. Modelled on /api/partner-request — the same cold-visitor class, the same abuse
// posture, in the same order of authority:
//   1. Server-side validation (lib/content/contact.ts) — the form is advisory only.
//   2. Honeypot: bots filling the hidden "website" field get a cheerful 200 and nothing is sent.
//      A 4xx would teach the bot the field is a trap. No CAPTCHA, per the ruled posture.
//   3. Per-IP nuisance brake (in-process, best-effort — see lib/utils/rateLimit.ts for scope).
//
// ⚠ EMAIL IS THE ONLY RECORD. There is no contact table, and creating one is a migration — which
// stops and goes to the founder. So unlike the partner-request route, where the DB row is the
// durable record and a failed email loses nothing, HERE A FAILED SEND LOSES THE MESSAGE. That is
// why this route reports the failure to the sender instead of returning a cheerful 200: telling
// someone their message arrived when it did not is the one outcome worth avoiding. Flagged for a
// durable table the next time the founder runs a migration.

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

  // Honeypot BEFORE the rate limit: a trapped bot must not consume a human's window either.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  if (!rateLimit(`contact:${clientIpFrom(req.headers)}`, LIMIT, WINDOW_MS).allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const parsed = parseContactRequest(body);
  if (parsed.error !== null) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = parsed.input;

  const html = [
    `<p><b>Topic:</b> ${esc(input.topic)}</p>`,
    `<p><b>From:</b> ${esc(input.name)} &lt;${esc(input.email)}&gt;</p>`,
    input.company ? `<p><b>Business:</b> ${esc(input.company)}</p>` : "",
    `<p><b>Message:</b></p><p>${esc(input.message).replace(/\n/g, "<br />")}</p>`,
  ].join("");

  const result = await sendAdminAlert(`Contact form — ${input.topic}`, html);
  if (!result.sent) {
    // The sender is told the truth. See the header note: email is the only record here.
    return NextResponse.json({ error: "not_delivered", reason: result.reason }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
