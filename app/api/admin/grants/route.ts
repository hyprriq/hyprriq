import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOperator, canManageUsers } from "@/lib/auth/permissions";
import { createGrant, listGrants, type GrantMode } from "@/lib/data/grants";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PLAN_TYPES, type PlanType } from "@/lib/constants/plans";

// ── ADMIN GRANTS API (founder-ruled 2026-08-21) — SUPER-ADMIN ONLY. Creating a grant hands out
// credit value (money-adjacent), the same class as the acquisition nav item's existing gate.
// Every create/revoke audits.

async function requireSuperAdmin() {
  const { userId } = await auth();
  if (!userId) return { userId: null, res: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  const op = await getOperator(userId);
  if (!op || !canManageUsers(op)) return { userId: null, res: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  return { userId, res: null };
}

export async function GET() {
  const gate = await requireSuperAdmin();
  if (gate.res) return gate.res;
  const { grants, redemptions } = await listGrants();
  return NextResponse.json({ grants, redemptions });
}

export async function POST(req: Request) {
  const gate = await requireSuperAdmin();
  if (gate.res) return gate.res;

  let body: { mode?: unknown; note?: unknown; expiresDays?: unknown; maxRedemptions?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const mode = body.mode === "link" || body.mode === "coupon" ? (body.mode as GrantMode) : null;
  if (!mode) return NextResponse.json({ error: "mode must be 'link' or 'coupon'" }, { status: 400 });
  const note = typeof body.note === "string" ? body.note.slice(0, 200) : "";
  const expiresDays = Math.min(30, Math.max(1, Number(body.expiresDays) || 30)); // 30 = the ruled ceiling
  const maxRedemptions = Math.min(1000, Math.max(1, Number(body.maxRedemptions) || 1));

  // The grant value is RULED (one free full assessment — GRANT_PLAN_TYPE growth_279, 1 credit;
  // founder-locked 2026-08-22, superseding the scale_499 this comment previously called "ruled"
  // — that value was in fact a data-layer fallback the founder never chose) and deliberately NOT
  // settable from this form: a campaign that needs a different value is a new ruling, not a
  // dropdown. Unsold tiers are structurally ungrantable — no plan input exists on any API.
  const { grant, error } = await createGrant({ mode, note, createdBy: gate.userId!, expiresDays, maxRedemptions });
  if (error || !grant) return NextResponse.json({ error: error ?? "create_failed" }, { status: 500 });

  try {
    await supabaseAdmin.from("audit_log").insert({
      table_name: "acquisition_grants", record_id: grant.id, action: "INSERT",
      actor_id: gate.userId, actor_type: "admin",
      new_value: { grant_created: true, mode, code_prefix: grant.code.slice(0, 6), max_redemptions: maxRedemptions, expires_at: grant.expires_at, note },
    });
  } catch { /* reporter never blocks */ }

  return NextResponse.json({ grant });
}

// Type guard the registry import so a registry change breaks THIS file loudly (tsc), not silently.
const _planCheck: readonly PlanType[] = PLAN_TYPES;
void _planCheck;
