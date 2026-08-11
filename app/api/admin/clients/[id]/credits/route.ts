import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getOperator, can } from "@/lib/auth/permissions";
import { clientInScope } from "@/lib/auth/clientScope";

// ── ADMIN BATCH — credit adjust (permission: adjust_credits). ALWAYS through an H6 atomic RPC —
// never a raw UPDATE. Every adjustment writes an audit row: operator, delta, resulting balance,
// and a REQUIRED reason. No silent adjustments. Since 2026-08-12 the RPC is adjust_client_credits
// (balance-only, rule (b)) — add/deduct_client_credits remain for purchases and consumption. ──

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const op = await getOperator(userId);
  if (!can(op, "adjust_credits")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  // CLIENT PARTITIONING (2026-08-02): a scoped operator adjusts only assigned clients' credits.
  if (!(await clientInScope(op, id))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { delta?: number; reason?: string } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  const delta = Number(body.delta);
  if (!Number.isInteger(delta) || delta === 0) return NextResponse.json({ error: "delta must be a non-zero integer" }, { status: 400 });
  if (!body.reason?.trim()) return NextResponse.json({ error: "reason required — no silent adjustments" }, { status: 400 });

  // ── CREDIT/USAGE SEMANTICS (FOUNDER-RULED 2026-08-12, LOCKED — the four rules live in
  // docs/SAAS_ARCHITECTURE.md "Credit & usage semantics"): an admin adjustment is a CORRECTION,
  // not consumption — it moves credits_available ONLY and NEVER touches credits_used_this_cycle.
  // The old path sent negative deltas through deduct_client_credits, whose usage increment is
  // rule (a)'s CONSUMPTION semantics — inflating the usage figure (the refund formula's input)
  // forever. adjust_client_credits carries rule-(b) semantics (migration 20260812, FOUNDER-RUN);
  // until it runs, adjustments FAIL CLOSED here rather than corrupt usage. ──
  const { data: balance, error } = await supabaseAdmin.rpc("adjust_client_credits", { p_client_id: id, p_delta: delta });
  if (error) {
    const missing = (error as { code?: string }).code === "PGRST202" || /adjust_client_credits/i.test(error.message ?? "");
    if (missing) {
      return NextResponse.json(
        { error: "migration_pending", message: "Credit adjustments are paused until the 20260812 credit-semantics migration is run (founder action) — the old path would have corrupted the usage figure." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // MONEY INTEGRITY (2026-08-11, close-out item 6): NULL = the RPC changed NOTHING (missing row
  // or the delta would take the balance negative). Fail loud, audit nothing.
  if (balance === null) {
    return NextResponse.json(
      { error: "insufficient_credits", message: "The client does not have that many credits — nothing was deducted." },
      { status: 409 },
    );
  }

  await supabaseAdmin.from("audit_log").insert({
    table_name: "clients", record_id: id, action: "UPDATE",
    actor_id: userId, actor_type: "admin",
    new_value: { credit_adjust: true, delta, resulting_balance: balance, reason: body.reason.trim() },
  });
  return NextResponse.json({ ok: true, balance });
}
