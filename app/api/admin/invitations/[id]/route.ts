import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getOperator, canManageStaff } from "@/lib/auth/permissions";

// DELETE — revoke a pending invitation (staff managers: super admin + admins, hierarchy
// 2026-08-02). Accepted invitations cannot be revoked here — disable the resulting sub_user
// row via the users API instead (one door per act).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const op = await getOperator(userId);
  if (!canManageStaff(op)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const { data: inv } = await supabaseAdmin
    .from("admin_invitations").select("id, email, accepted_at, revoked_at").eq("id", id).maybeSingle();
  if (!inv) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (inv.accepted_at) return NextResponse.json({ error: "already accepted — manage the user row instead" }, { status: 400 });
  if (inv.revoked_at) return NextResponse.json({ error: "already revoked" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("admin_invitations").update({ revoked_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabaseAdmin.from("audit_log").insert({
    table_name: "admin_invitations", record_id: String(id), action: "UPDATE",
    actor_id: userId, actor_type: "admin", new_value: { invitation_revoked: true, email: inv.email },
  });
  return NextResponse.json({ ok: true });
}
