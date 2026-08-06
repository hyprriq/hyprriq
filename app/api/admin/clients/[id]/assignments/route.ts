import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getOperator, canManageUsers } from "@/lib/auth/permissions";

// ── ADMIN FOUNDATIONS (2026-08-02) — staff↔client assignments (CLIENT PARTITIONING's write
// side). SUPER-ADMIN ONLY: deciding which clients a staff member sees is user management, the
// same authority as granting capabilities. Assigning to super_admin rows is pointless (they see
// all) and refused so the table only ever encodes real restrictions. Every change audited. ──

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const op = await getOperator(userId);
  if (!canManageUsers(op)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("staff_client_assignments")
    .select("admin_user_id, assigned_by, created_at")
    .eq("client_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignments: data ?? [] });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const op = await getOperator(userId);
  if (!canManageUsers(op)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  let body: { admin_user_id?: string } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  const target = body.admin_user_id?.trim();
  if (!target) return NextResponse.json({ error: "admin_user_id required" }, { status: 400 });

  const { data: staff } = await supabaseAdmin
    .from("admin_permissions").select("role, disabled").eq("user_id", target).maybeSingle();
  if (!staff) return NextResponse.json({ error: "no admin_permissions row for that user" }, { status: 404 });
  if (staff.role === "super_admin") return NextResponse.json({ error: "super_admin sees all clients — assignment is meaningless" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("staff_client_assignments")
    .upsert({ admin_user_id: target, client_id: id, assigned_by: userId }, { onConflict: "admin_user_id,client_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabaseAdmin.from("audit_log").insert({
    table_name: "staff_client_assignments", record_id: `${target}:${id}`, action: "INSERT",
    actor_id: userId, actor_type: "admin", new_value: { client_assigned: true, admin_user_id: target, client_id: id },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const op = await getOperator(userId);
  if (!canManageUsers(op)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  let body: { admin_user_id?: string } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  const target = body.admin_user_id?.trim();
  if (!target) return NextResponse.json({ error: "admin_user_id required" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("staff_client_assignments")
    .delete()
    .eq("admin_user_id", target)
    .eq("client_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabaseAdmin.from("audit_log").insert({
    table_name: "staff_client_assignments", record_id: `${target}:${id}`, action: "DELETE",
    actor_id: userId, actor_type: "admin", new_value: { client_unassigned: true, admin_user_id: target, client_id: id },
  });
  return NextResponse.json({ ok: true });
}
