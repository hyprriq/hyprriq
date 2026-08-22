import { NextResponse } from "next/server";
import { EMAIL_RE } from "@/lib/utils/emailAddress";
import { recordMarketingConsent } from "@/lib/data/marketingConsent";

// ── CONSENT CAPTURE (ADR-EMAIL-001: the app collects, a tool sends) ──────────────────────────
//
// A signup box POSTs here, we write the consent record, and campaigns happen in the external
// tool on its own domain. The app NEVER sends a campaign. Consent evidence is captured NOW
// because it cannot be reconstructed later (the ADR's reason this exists before any campaign
// does). The write itself lives in lib/data/marketingConsent.ts (extracted 2026-08-22 — the
// partner-request opt-in shares it; duplicate/unsubscribed semantics are documented there).
//
// ⚠ BLOCKS ON THE FOUNDER-RUN marketing_contacts MIGRATION: until the table exists this returns
// a plain 503 and the box says "not available yet" — fail-soft, never a crash.

export async function POST(req: Request) {
  let body: { email?: unknown; source?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  const source = typeof body.source === "string" && body.source.length <= 64 ? body.source : "site";

  const { ok, error } = await recordMarketingConsent(email, source);
  if (!ok) {
    // Table not yet migrated (founder-run) or transient failure — same honest answer either way.
    console.error(`[newsletter] consent write failed: ${error}`);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
