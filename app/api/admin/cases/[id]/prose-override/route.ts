import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getOperator, can } from "@/lib/auth/permissions";
import { caseInScope } from "@/lib/auth/clientScope";
import { scanHard } from "@/lib/utils/banned-language";
import { saveProseOverride, clearProseOverride } from "@/lib/data/proseOverrides";

// ── "SHOW + FIX" piece 2 — the operator's rewording of ONE client-visible field.
//
// The law (lib/portal/proseOverlay.ts, and the migration): an override is a CLIENT-PROJECTION
// layer, never an evidence edit. This route writes prose only. It cannot reach a weight, a signal
// or a verdict — there is no code path from case_prose_overrides into scoring, by construction.
//
// THE REPLACEMENT IS ITSELF GATED. You cannot fix banned language with more banned language: the
// submitted text runs the SAME unchanged scanHard, and a replacement that trips it is refused at
// 422 with the labels. That is why this feature is not a bypass — the gate still decides what may
// ship; the operator only gets to choose different words.

const MAX = 8000;

async function guard(userId: string | null, id: string) {
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data } = await supabaseAdmin.from("clients").select("role").eq("id", userId).maybeSingle();
  if (!data || data.role === "client") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const op = await getOperator(userId);
  if (!can(op, "review_publish")) return NextResponse.json({ error: "forbidden: requires review_publish" }, { status: 403 });
  if (!(await caseInScope(op, id))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return null;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  const { id } = await params;
  const denied = await guard(userId, id);
  if (denied) return denied;

  let body: {
    attempt_number?: number; target?: string; field_path?: string;
    original_text?: string; replacement_text?: string; reason?: string;
  } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }

  const { attempt_number, target, field_path, original_text, replacement_text } = body;
  if (!Number.isInteger(attempt_number) || (attempt_number as number) < 1
    || typeof target !== "string" || !target
    || typeof field_path !== "string" || !field_path
    || typeof original_text !== "string" || !original_text
    || typeof replacement_text !== "string" || !replacement_text.trim()) {
    return NextResponse.json({ error: "invalid_body", message: "attempt, target, field path, original and replacement text are all required." }, { status: 400 });
  }
  if (replacement_text.length > MAX) {
    return NextResponse.json({ error: "too_long", message: `Keep the rewording under ${MAX} characters.` }, { status: 400 });
  }

  // The gate decides, not the operator.
  const violations = scanHard(replacement_text);
  if (violations.length > 0) {
    return NextResponse.json({
      error: "banned_language",
      violations,
      message: `Your rewording still trips the gate: ${violations.join(", ")}.`,
    }, { status: 422 });
  }

  const { error } = await saveProseOverride({
    caseId: id, attempt: attempt_number as number, target, fieldPath: field_path,
    originalText: original_text, replacementText: replacement_text,
    reason: body.reason?.trim() || null, actorId: userId as string,
  });
  if (error) return NextResponse.json({ error: "save_failed", message: error }, { status: 500 });

  await supabaseAdmin.from("audit_log").insert({
    table_name: "case_prose_overrides", record_id: id, action: "INSERT",
    actor_id: userId, actor_type: "admin",
    old_value: { target, field_path, text: original_text },
    new_value: { target, field_path, text: replacement_text, attempt: attempt_number, reason: body.reason ?? null },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  const { id } = await params;
  const denied = await guard(userId, id);
  if (denied) return denied;

  let body: { attempt_number?: number; target?: string; field_path?: string } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  const { attempt_number, target, field_path } = body;
  if (!Number.isInteger(attempt_number) || typeof target !== "string" || typeof field_path !== "string") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { error } = await clearProseOverride(id, attempt_number as number, target, field_path);
  if (error) return NextResponse.json({ error: "save_failed", message: error }, { status: 500 });

  await supabaseAdmin.from("audit_log").insert({
    table_name: "case_prose_overrides", record_id: id, action: "DELETE",
    actor_id: userId, actor_type: "admin",
    new_value: { target, field_path, attempt: attempt_number, reverted_to: "engine wording" },
  });
  return NextResponse.json({ ok: true });
}
