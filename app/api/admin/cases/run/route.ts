import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOperator, can } from "@/lib/auth/permissions";
import { runOperatorCase } from "@/lib/data/operatorCase";
import { PLAN_CATEGORY, type PlanType } from "@/lib/constants/plans";

// ── ADMIN BATCH — "run a case" (permission: run_case). The operator-run intake path: the normal
// pipeline, no credit deducted, provenance origin='operator', audited. STRUCTURALLY separate from
// the client submit route — this is the ONLY caller of runOperatorCase.
// ⛔ STOP-2 PENDING: plan_type is an explicit per-run choice with no default until the founder
// rules operator-case tier behavior. ──

const VALID_PLANS = Object.keys(PLAN_CATEGORY) as PlanType[];

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const op = await getOperator(userId);
  if (!can(op, "run_case")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: {
    plan_type?: string; vendor_name?: string; vendor_website?: string; brands?: string[];
    marketplace?: string; notes?: string; client_name?: string; company_name?: string;
  } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  if (!body.plan_type || !VALID_PLANS.includes(body.plan_type as PlanType)) {
    return NextResponse.json({ error: "plan_type required (explicit — operator-case tier behavior pends the STOP-2 ruling)" }, { status: 400 });
  }
  const r = await runOperatorCase({
    operator_id: userId,
    plan_type: body.plan_type as PlanType,
    vendor_name: String(body.vendor_name ?? "").trim(),
    vendor_website: body.vendor_website?.trim() || null,
    brands: (body.brands ?? []).map((b) => String(b).trim()).filter(Boolean),
    marketplace: body.marketplace?.trim() || "amazon_us",
    notes: body.notes?.trim() || null,
    client_name: body.client_name?.trim() || null,
    company_name: body.company_name?.trim() || null,
  });
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.error.includes("not seeded") ? 503 : 400 });
  return NextResponse.json({ ok: true, case_id: r.case_id, case_number: r.case_number });
}
