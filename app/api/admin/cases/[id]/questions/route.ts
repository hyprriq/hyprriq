import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AdditionalQuestion } from "@/lib/research/contracts";
import { addQuestion, editQuestion, deleteQuestion } from "@/lib/portal/additional-questions";

// ADR-T2-002 follow-up — analyst/review-team questions (cases.additional_questions). Create / Edit /
// Delete, admin-only. The AI questions_to_ask (per-track) are NEVER touched here — this is a separate
// case-level store, merged with the AI side only in the view-model. Edits preserve history (no silent
// overwrite); every mutation is also written to audit_log for a centralized immutable trail.

const PRIORITIES = ["high", "medium", "low"] as const;
type Priority = (typeof PRIORITIES)[number];
const asPriority = (v: unknown): Priority | undefined => (PRIORITIES.includes(v as Priority) ? (v as Priority) : undefined);

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from("clients").select("role").eq("id", userId).maybeSingle();
  return !!data && data.role !== "client";
}

async function readList(id: string): Promise<AdditionalQuestion[] | null> {
  const { data } = await supabaseAdmin.from("cases").select("additional_questions").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!data) return null;
  return (data.additional_questions as AdditionalQuestion[] | null) ?? [];
}

async function persist(id: string, list: AdditionalQuestion[], userId: string, op: string) {
  const { error } = await supabaseAdmin.from("cases").update({ additional_questions: list }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabaseAdmin.from("audit_log").insert({
    table_name: "cases", record_id: id, action: "UPDATE", actor_id: userId, actor_type: "admin",
    new_value: { additional_questions_op: op, count: list.length },
  });
  return NextResponse.json({ ok: true, additional_questions: list });
}

async function guard(id: string): Promise<{ userId: string } | NextResponse> {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await isAdmin(userId))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const list = await readList(id);
  if (list === null) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return { userId };
}

// Create
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guard(id);
  if (g instanceof NextResponse) return g;
  const body = await req.json().catch(() => ({}));
  if (typeof body.question !== "string" || !body.question.trim()) {
    return NextResponse.json({ error: "question_required", message: "A question is required." }, { status: 400 });
  }
  const list = (await readList(id))!;
  const next = addQuestion(list, {
    question: body.question, reason: body.reason, brand: body.brand,
    priority: asPriority(body.priority), required: body.required === true,
  }, { id: crypto.randomUUID(), created_by: g.userId, created_at: new Date().toISOString() });
  return persist(id, next, g.userId, "create");
}

// Edit (preserves history)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guard(id);
  if (g instanceof NextResponse) return g;
  const body = await req.json().catch(() => ({}));
  if (typeof body.id !== "string") return NextResponse.json({ error: "id_required" }, { status: 400 });
  if (body.question !== undefined && (typeof body.question !== "string" || !body.question.trim())) {
    return NextResponse.json({ error: "question_required", message: "Question cannot be blank." }, { status: 400 });
  }
  const list = (await readList(id))!;
  if (!list.some((q) => q.id === body.id)) return NextResponse.json({ error: "question_not_found" }, { status: 404 });
  const next = editQuestion(list, body.id, {
    question: body.question, reason: body.reason, brand: body.brand,
    priority: asPriority(body.priority), required: typeof body.required === "boolean" ? body.required : undefined,
  }, { edited_by: g.userId, edited_at: new Date().toISOString() });
  return persist(id, next, g.userId, "edit");
}

// Delete
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guard(id);
  if (g instanceof NextResponse) return g;
  const body = await req.json().catch(() => ({}));
  if (typeof body.id !== "string") return NextResponse.json({ error: "id_required" }, { status: 400 });
  const list = (await readList(id))!;
  return persist(id, deleteQuestion(list, body.id), g.userId, "delete");
}
