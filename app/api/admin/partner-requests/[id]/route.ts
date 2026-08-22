import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOperator, canManageUsers } from "@/lib/auth/permissions";
import { setPartnerRequestStatus, type PartnerRequestStatus } from "@/lib/data/partnerRequests";
import { supabaseAdmin } from "@/lib/supabase/admin";

// ── PARTNER REQUEST DECISION (founder-ruled 2026-08-22, item 1d) — SUPER-ADMIN ONLY, the same
// gate as the grants API it sits beside. This route records a DECISION WORD and nothing else:
// "contacted" and "declined" never touch grants, credits, or clients (ruled 1c — a request can
// never become a grant by code). Every decision audits.

const STATUSES: PartnerRequestStatus[] = ["new", "contacted", "declined"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const op = await getOperator(userId);
  if (!op || !canManageUsers(op)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  let body: { status?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const status = STATUSES.find((s) => s === body.status);
  if (!status) return NextResponse.json({ error: "invalid_status" }, { status: 400 });

  const { error } = await setPartnerRequestStatus(id, status);
  if (error) return NextResponse.json({ error }, { status: 500 });

  try {
    await supabaseAdmin.from("audit_log").insert({
      table_name: "partner_requests", record_id: id, action: "UPDATE",
      actor_id: userId, actor_type: "admin",
      new_value: { partner_request_decided: true, status },
    });
  } catch { /* reporter never blocks */ }

  return NextResponse.json({ ok: true });
}
