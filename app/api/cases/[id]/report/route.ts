import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { reportObjectKey, reportExists, signedReportUrl } from "@/lib/pdf/reportStorage";

// ── AUTHORIZED REPORT DOWNLOAD (§4, founder-ruled) ──────────────────────────────────────────
//
// THE BUCKET IS PRIVATE AND THE OBJECT PATH IS NEVER PUBLIC. This route is the only way a client
// reaches their PDF, and it re-checks ownership on EVERY click — the signed URL is minted here,
// lives for minutes, and is never stored, never emailed, never reused.
//
// THREE CHECKS, ALL REQUIRED, IN THIS ORDER:
//   1. authenticated                  — no session, no answer
//   2. the case belongs to THIS client — `client_id = userId` in the query itself, so the database
//      does the scoping rather than a JavaScript comparison someone can later reorder around
//   3. the case is DELIVERED           — a PDF is the delivered artifact, never a preview of one
//
// ⚠ 404, NOT 403, FOR A CASE THAT IS NOT YOURS. A 403 confirms the case exists; that turns this
// route into an oracle for enumerating other clients' case numbers. Same reason the key is derived
// from client_id — a leaked key cannot be walked sideways into another client's folder.
//
// ⚠ H1 — the key carries the DELIVERED attempt, so a client always gets the bytes they were sent.
// A re-investigation creates a new attempt and a NEW object; it can never rewrite this one.

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data } = await supabaseAdmin
    .from("cases")
    .select("id, case_number, client_id, status, delivered_attempt")
    .eq("id", id)
    .eq("client_id", userId)      // (2) scoping in the query, not in a later `if`
    .is("deleted_at", null)
    .maybeSingle();

  // Not found / not yours — indistinguishable on purpose.
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const c = data as { case_number: string; client_id: string; status: string; delivered_attempt: number | null };
  if (c.status !== "delivered" && c.status !== "complete") {
    return NextResponse.json({ error: "not_delivered" }, { status: 409 });
  }

  const key = reportObjectKey(c.client_id, c.case_number, c.delivered_attempt ?? 1);

  // The render job runs after publish, so a client can legitimately click before the object lands.
  // That is a WAIT, not a failure, and the message says so rather than implying something broke.
  if (!(await reportExists(key))) {
    return NextResponse.json(
      { error: "not_ready", message: "Your PDF is still being prepared. It will also arrive by email — the full report is readable in your portal now." },
      { status: 202 },
    );
  }

  const url = await signedReportUrl(key);
  if (!url) return NextResponse.json({ error: "sign_failed" }, { status: 500 });

  // 302 to a short-lived signed URL: the browser downloads directly from storage and the bytes
  // never pass through this function.
  return NextResponse.redirect(url, { status: 302 });
}
