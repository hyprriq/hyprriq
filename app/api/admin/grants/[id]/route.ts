import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOperator, canManageUsers } from "@/lib/auth/permissions";
import { revokeGrant } from "@/lib/data/grants";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Revoke — the kill switch (revoked_at, immediate; redemptions refuse from the next call).
export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const op = await getOperator(userId);
  if (!op || !canManageUsers(op)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const { error } = await revokeGrant(id);
  if (error) return NextResponse.json({ error }, { status: 500 });

  try {
    await supabaseAdmin.from("audit_log").insert({
      table_name: "acquisition_grants", record_id: id, action: "UPDATE",
      actor_id: userId, actor_type: "admin",
      new_value: { grant_revoked: true },
    });
  } catch { /* reporter never blocks */ }

  return NextResponse.json({ ok: true });
}
