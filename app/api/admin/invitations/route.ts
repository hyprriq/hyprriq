import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getOperator, canManageUsers } from "@/lib/auth/permissions";
import { sanitizeCapabilities, INVITATION_TTL_DAYS } from "@/lib/auth/invitations";
import { FULL_ACCESS } from "@/lib/auth/capabilities";
import { sendAdminInvitation } from "@/lib/email/notify";

// ── ADMIN FOUNDATIONS — staff invitations (WordPress-style). SUPER-ADMIN ONLY (manage-users is
// the role, never a capability — same law as the users API). POST creates the invitation row +
// sends the Resend email (key-safe, banned-language-gated; an unsent email is NON-FATAL — the
// response carries the sign-up link for manual sharing). Claim happens at the invitee's first
// admin visit (lib/auth/invitations.ts). Only sub_user access can ever be minted this way. ──

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const op = await getOperator(userId);
  if (!canManageUsers(op)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
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
  if (!canManageUsers(op)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { email?: string; capabilities?: string[]; preset?: string } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "valid email required" }, { status: 400 });
  }
  const caps = body.preset === "full_access" ? [...FULL_ACCESS] : sanitizeCapabilities(body.capabilities);

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
