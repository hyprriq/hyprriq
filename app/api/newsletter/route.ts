import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// ── CONSENT CAPTURE (ADR-EMAIL-001: the app collects, a tool sends) ──────────────────────────
//
// The ONLY app-side marketing surface besides /unsubscribe: a signup box POSTs here, we write
// the consent record, and campaigns happen in the external tool on its own domain. The app
// NEVER sends a campaign. Consent evidence is captured NOW because it cannot be reconstructed
// later (the ADR's reason this exists before any campaign does).
//
// ⚠ BLOCKS ON THE FOUNDER-RUN marketing_contacts MIGRATION: until the table exists this returns
// a plain 503 and the box says "not available yet" — fail-soft, never a crash.
//
// Duplicate/unsubscribed addresses: insert with ignoreDuplicates — a resubmission never resets
// consent_ts, and an UNSUBSCRIBED address stays unsubscribed (re-subscription is a deliberate
// future flow, not a side effect of typing your email twice).

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

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

  // ── LIVE SCHEMA (founder-run 2026-08-21 via MCP; verified live before this write path shipped):
  // consent_status ∈ {subscribed, unsubscribed, pending} (CHECK), consent_at timestamptz,
  // unsubscribed_at timestamptz (null = active). The EXPRESS-consent evidence is the combination
  // this row records: a labeled signup box (source) + the address + consent_at.
  const { error } = await supabaseAdmin
    .from("marketing_contacts")
    .upsert(
      {
        email,
        consent_status: "subscribed",
        consent_at: new Date().toISOString(),
        source,
      },
      { onConflict: "email", ignoreDuplicates: true },
    );

  if (error) {
    // Table not yet migrated (founder-run) or transient failure — same honest answer either way.
    console.error(`[newsletter] consent write failed: ${error.message}`);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
