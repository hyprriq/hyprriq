import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getOperator, can } from "@/lib/auth/permissions";

// ── ADMIN BATCH — credit adjust (permission: adjust_credits). ALWAYS through the H6 atomic RPCs
// (add_client_credits / deduct_client_credits) — never a raw UPDATE. Every adjustment writes an
// audit row: operator, delta, resulting balance, and a REQUIRED reason. No silent adjustments. ──

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const op = await getOperator(userId);
  if (!can(op, "adjust_credits")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  let body: { delta?: number; reason?: string } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  const delta = Number(body.delta);
  if (!Number.isInteger(delta) || delta === 0) return NextResponse.json({ error: "delta must be a non-zero integer" }, { status: 400 });
  if (!body.reason?.trim()) return NextResponse.json({ error: "reason required — no silent adjustments" }, { status: 400 });

  const rpc = delta > 0 ? "add_client_credits" : "deduct_client_credits";
  const { data: balance, error } = await supabaseAdmin.rpc(rpc, { p_client_id: id, p_amount: Math.abs(delta) });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from("audit_log").insert({
    table_name: "clients", record_id: id, action: "UPDATE",
    actor_id: userId, actor_type: "admin",
    new_value: { credit_adjust: true, delta, resulting_balance: balance, reason: body.reason.trim() },
  });
  return NextResponse.json({ ok: true, balance });
}
