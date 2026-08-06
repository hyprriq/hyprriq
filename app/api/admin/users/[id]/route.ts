import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getOperator, canManageStaff, canManageUsers } from "@/lib/auth/permissions";
import { grantableBy } from "@/lib/auth/grants";

// PATCH — edit capabilities or disable a user. Tiered (2026-08-02 hierarchy): the super admin
// edits admin AND sub_user rows; admins edit SUB_USER rows only, capabilities always filtered
// through grantableBy (subset-of-own; the super-only pair grantable by nobody). Never your own
// row; never a super_admin row (founder-seeded SQL, not API-managed).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const op = await getOperator(userId);
  if (!canManageStaff(op)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  if (id === userId) return NextResponse.json({ error: "cannot manage your own row" }, { status: 400 });

  const { data: target } = await supabaseAdmin.from("admin_permissions").select("role").eq("user_id", id).maybeSingle();
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (target.role === "super_admin") return NextResponse.json({ error: "super_admin rows are founder-managed (SQL), not API-managed" }, { status: 400 });
  if (target.role === "admin" && !canManageUsers(op)) {
    return NextResponse.json({ error: "admin rows are managed by the super admin only" }, { status: 403 });
  }

  let body: { capabilities?: string[]; disabled?: boolean } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  const fields: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (Array.isArray(body.capabilities)) {
    fields.capabilities = grantableBy(op!, body.capabilities);
  }
  if (typeof body.disabled === "boolean") fields.disabled = body.disabled;

  const { error } = await supabaseAdmin.from("admin_permissions").update(fields).eq("user_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabaseAdmin.from("audit_log").insert({
    table_name: "admin_permissions", record_id: id, action: "UPDATE",
    actor_id: userId, actor_type: "admin", new_value: { sub_user_updated: fields },
  });
  return NextResponse.json({ ok: true });
}
