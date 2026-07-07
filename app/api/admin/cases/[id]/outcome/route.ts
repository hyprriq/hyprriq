import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { recordCaseOutcome, OUTCOME_TYPES, type OutcomeType } from "@/lib/data/outcomes";

// H6 — founder records what actually happened with a delivered case (the learning loop's raw
// material). Update-only: the row exists iff the case was delivered (seeded by the review route).

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from("clients").select("role").eq("id", userId).maybeSingle();
  return !!data && data.role !== "client";
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await isAdmin(userId))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  let body: { outcome_type?: string; outcome_notes?: string; prediction_correct?: boolean } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  if (!body.outcome_type || !OUTCOME_TYPES.includes(body.outcome_type as OutcomeType)) {
    return NextResponse.json({ error: "invalid_outcome_type" }, { status: 400 });
  }
  const r = await recordCaseOutcome(id, {
    outcome_type: body.outcome_type as OutcomeType, outcome_notes: body.outcome_notes ?? null,
    prediction_correct: body.prediction_correct ?? null, reported_by: "founder",
  });
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.error.startsWith("no outcome row") ? 404 : 500 });
  await supabaseAdmin.from("audit_log").insert({
    table_name: "case_outcomes", record_id: id, action: "UPDATE",
    actor_id: userId, actor_type: "admin", new_value: { outcome_recorded: body },
  });
  return NextResponse.json({ ok: true });
}
