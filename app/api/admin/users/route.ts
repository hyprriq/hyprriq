import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getOperator, canManageStaff } from "@/lib/auth/permissions";
import { grantableBy, fullGrantBy, rolesCreatableBy, type GrantableRole } from "@/lib/auth/grants";
import { resolveOperatorNames } from "@/lib/data/operatorNames";

// ── PERMISSION HIERARCHY (founder-ruled 2026-08-02) — user management. Super admin creates
// admins AND staff; admins create STAFF ONLY with a subset of their OWN capabilities. Both
// containment rules are enforced through lib/auth/grants (the single grant core): (a) subset-
// of-own via grantableBy; (b) the granting power is never grantable — roles come only from
// rolesCreatableBy, no capability string confers management, and super_admin rows stay
// founder-seeded SQL. A caller can never modify their own row. ──

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const op = await getOperator(userId);
  if (!canManageStaff(op)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  let q = supabaseAdmin
    .from("admin_permissions").select("user_id, email, role, capabilities, disabled, created_by, created_at, updated_at");
  // Admins see their management domain only (staff); the super admin sees everyone.
  if (op!.role === "admin") q = q.eq("role", "sub_user");
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // NAME RESOLUTION (2026-08-20): the list showed the raw email as identity. Names live in Clerk
  // (one source, no drift) — resolve them at request time and enrich each row. Fail-soft: on a
  // Clerk miss the row keeps name:null and the client falls back to email.
  const rows = data ?? [];
  const names = await resolveOperatorNames(rows.map((r) => r.user_id as string));
  const users = rows.map((r) => ({
    ...r,
    name: names.get(r.user_id as string)?.name ?? null,
    image_url: names.get(r.user_id as string)?.imageUrl ?? null,
  }));
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const op = await getOperator(userId);
  if (!canManageStaff(op)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { user_id?: string; email?: string; role?: string; capabilities?: string[]; preset?: string } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  if (!body.user_id?.trim() || !body.email?.trim()) return NextResponse.json({ error: "user_id and email required" }, { status: 400 });
  if (body.user_id === userId) return NextResponse.json({ error: "cannot manage your own row" }, { status: 400 });

  // Containment rule (b): the requested role must be mintable BY THIS GRANTOR. Admins asking
  // for anything but sub_user are refused loudly, never silently downgraded.
  const requestedRole = (body.role ?? "sub_user") as GrantableRole;
  if (!rolesCreatableBy(op!).includes(requestedRole)) {
    return NextResponse.json({ error: `your role cannot create '${body.role}' users` }, { status: 403 });
  }
  // Containment rule (a): subset-of-own (and never the super-only pair, for anyone).
  const caps = body.preset === "full_access" ? fullGrantBy(op!) : grantableBy(op!, body.capabilities);

  const { error } = await supabaseAdmin.from("admin_permissions").insert({
    user_id: body.user_id, email: body.email, role: requestedRole, capabilities: caps, created_by: userId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabaseAdmin.from("audit_log").insert({
    table_name: "admin_permissions", record_id: body.user_id, action: "INSERT",
    actor_id: userId, actor_type: "admin",
    new_value: { user_created: true, role: requestedRole, email: body.email, capabilities: caps, grantor_role: op!.role },
  });
  return NextResponse.json({ ok: true });
}
