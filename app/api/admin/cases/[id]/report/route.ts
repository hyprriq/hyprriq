import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getOperator, can } from "@/lib/auth/permissions";
import { caseInScope } from "@/lib/auth/clientScope";
import { reportObjectKey, reportExists, signedReportUrl } from "@/lib/pdf/reportStorage";

// ── ADMIN REPORT DOWNLOAD (2026-08-20) ───────────────────────────────────────────────────────
//
// THE GAP THIS CLOSES, found by the founder on the first delivered operator-house case: the ONLY
// download path was the client route, which scopes `client_id = userId` — correct for clients,
// and a guaranteed 404 for the operator reviewing their own product. The admin client-view
// rendered a Download button that could never succeed for the person most likely to click it.
//
// Same discipline as the client route, admin-shaped:
//   1. authenticated + operator with view_cases, case in the operator's client scope
//   2. DELIVERED only — a PDF is the delivered artifact
//   3. same derived key (client_id + case_number + delivered_attempt), same short-lived signed
//      URL minted per click, never stored, never reused
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const op = await getOperator(userId);
  if (!can(op, "view_cases")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  if (!(await caseInScope(op, id))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data } = await supabaseAdmin
    .from("cases")
    .select("case_number, client_id, status, delivered_attempt")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const c = data as { case_number: string; client_id: string | null; status: string; delivered_attempt: number | null };
  if (c.status !== "delivered" && c.status !== "complete") {
    return NextResponse.json({ error: "not_delivered", message: "A PDF exists only for delivered cases." }, { status: 409 });
  }
  if (!c.client_id) return NextResponse.json({ error: "no_client" }, { status: 409 });

  const key = reportObjectKey(c.client_id, c.case_number, c.delivered_attempt ?? 1);
  if (!(await reportExists(key))) {
    return NextResponse.json(
      { error: "not_ready", message: "The PDF is still being rendered by the background job. The report on this page is complete." },
      { status: 202 },
    );
  }
  const url = await signedReportUrl(key);
  if (!url) return NextResponse.json({ error: "sign_failed" }, { status: 500 });
  return NextResponse.redirect(url, { status: 302 });
}
