import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getOperator, canManageStaff } from "@/lib/auth/permissions";
import { INVITATION_TTL_DAYS } from "@/lib/auth/invitations";
import { grantableBy, fullGrantBy } from "@/lib/auth/grants";
import { sendAdminInvitation } from "@/lib/email/notify";

// ── STAFF INVITATIONS (WordPress-style; hierarchy 2026-08-02). Super admin AND admins invite
// STAFF; invited capabilities pass through the same grant core as direct creation (subset-of-
// own; super-only pair never). The claim path mints sub_user ONLY — an invitation can never
// produce an admin (containment rule b). POST creates the row + sends the Resend email
// (key-safe, banned-language-gated; an unsent email is NON-FATAL — the response carries the
// sign-up link for manual sharing). ──

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const op = await getOperator(userId);
  if (!canManageStaff(op)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { data, error } = await supabaseAdmin
    .from("admin_invitations")
    .select("id, email, capabilities, invited_by, created_at, expires_at, accepted_at, accepted_user_id, revoked_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invitations: data ?? [] });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const op = await getOperator(userId);
  if (!canManageStaff(op)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { email?: string; capabilities?: string[]; preset?: string } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "valid email required" }, { status: 400 });
  }
  // Same grant core as direct creation — containment rules (a) and (b) hold on the invite path.
  const caps = body.preset === "full_access" ? fullGrantBy(op!) : grantableBy(op!, body.capabilities);

  // One OPEN invitation per address — revoke-then-reinvite is the edit path.
  const { data: existing } = await supabaseAdmin
    .from("admin_invitations").select("id")
    .eq("email", email).is("accepted_at", null).is("revoked_at", null)
    .gte("expires_at", new Date().toISOString()).limit(1);
  if ((existing ?? []).length > 0) {
    return NextResponse.json({ error: "an open invitation already exists for this email — revoke it first" }, { status: 409 });
  }

  const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 86_400_000).toISOString();
  const { data: created, error } = await supabaseAdmin
    .from("admin_invitations")
    .insert({ email, capabilities: caps, invited_by: userId, expires_at: expiresAt })
    .select("id")
    .single();
  if (error || !created) return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 });

  await supabaseAdmin.from("audit_log").insert({
    table_name: "admin_invitations", record_id: String(created.id), action: "INSERT",
    actor_id: userId, actor_type: "admin",
    new_value: { invitation_created: true, email, capabilities: caps, expires_at: expiresAt },
  });

  const origin = new URL(req.url).origin;
  const signUpUrl = `${origin}/sign-up`;
  const emailResult = await sendAdminInvitation({ to: email, signUpUrl, invitedByEmail: op!.role === "super_admin" ? "The HyprrIQ founder" : "A HyprrIQ admin" });

  return NextResponse.json({
    ok: true, id: created.id, email, capabilities: caps, expires_at: expiresAt,
    email_sent: emailResult.sent, ...(emailResult.sent ? {} : { email_skip_reason: emailResult.reason, share_link: signUpUrl }),
  });
}
