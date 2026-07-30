import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getOperator, canManageUsers, CAPABILITIES, FULL_ACCESS, type Capability } from "@/lib/auth/permissions";

// ── ADMIN BATCH — user management. SUPER-ADMIN ONLY (the role, not a capability — no sub-user
// can ever reach these, so self-escalation is structural). The API can only create/manage
// sub_user rows: a super_admin row is seeded by the founder (migration template), never minted
// here. A caller can never modify their own row. ──

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const op = await getOperator(userId);
  if (!canManageUsers(op)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { data, error } = await supabaseAdmin
    .from("admin_permissions").select("user_id, email, role, capabilities, disabled, created_by, created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data ?? [] });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const op = await getOperator(userId);
  if (!canManageUsers(op)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { user_id?: string; email?: string; capabilities?: string[]; preset?: string } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  if (!body.user_id?.trim() || !body.email?.trim()) return NextResponse.json({ error: "user_id and email required" }, { status: 400 });
  if (body.user_id === userId) return NextResponse.json({ error: "cannot manage your own row" }, { status: 400 });

  const caps: Capability[] = body.preset === "full_access"
    ? [...FULL_ACCESS]
    : (body.capabilities ?? []).filter((c): c is Capability => (CAPABILITIES as readonly string[]).includes(c));

  const { error } = await supabaseAdmin.from("admin_permissions").insert({
    user_id: body.user_id, email: body.email, role: "sub_user", capabilities: caps, created_by: userId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabaseAdmin.from("audit_log").insert({
    table_name: "admin_permissions", record_id: body.user_id, action: "INSERT",
    actor_id: userId, actor_type: "admin", new_value: { sub_user_created: true, email: body.email, capabilities: caps },
  });
  return NextResponse.json({ ok: true });
}
