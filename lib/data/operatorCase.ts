import { supabaseAdmin } from "@/lib/supabase/admin";
import { inngest } from "@/lib/inngest/client";
import { PLAN_CATEGORY, PLAN_BRAND_CAPS, type PlanType } from "@/lib/constants/plans";

// ── ADMIN BATCH — "RUN A CASE": the operator-run intake path. A DISTINCT code path from client
// submission by construction: this module is imported ONLY by the admin run route (permission
// "run_case"); the client submit route cannot reach it, and this path NEVER touches credits —
// no deduct, no refund, no balance read (the H6 credit system is simply not invoked; the
// deliberate hole is the ABSENCE of the call, not a magic number).
// PROVENANCE, one query forever:  SELECT * FROM cases WHERE origin = 'operator';
// Every run writes an audit row naming the operator + attribution + timestamp.
// ⛔ STOP-2 (tier behavior) PENDING FOUNDER RULING: plan_type is an explicit per-run parameter
// with NO default — the founder's ruling may fix it to one tier (a one-line change here). ──

export const OPERATOR_HOUSE_CLIENT_ID = "operator-house"; // seeded by the founder-run migration

export interface OperatorRunInput {
  operator_id: string;
  plan_type: PlanType;                 // explicit, no default — STOP-2 pending
  vendor_name: string;
  vendor_website: string | null;
  brands: string[];
  marketplace: string;
  notes: string | null;
  client_name: string | null;          // attribution — optional, displayed where a client email would be
  company_name: string | null;
}

export async function runOperatorCase(input: OperatorRunInput): Promise<{ case_id: string | null; case_number: string | null; error: string | null }> {
  if (!input.vendor_name.trim()) return { case_id: null, case_number: null, error: "vendor_name required" };
  if (input.brands.length === 0) return { case_id: null, case_number: null, error: "at least one brand required" };
  if (input.brands.length > PLAN_BRAND_CAPS[input.plan_type]) {
    return { case_id: null, case_number: null, error: `brand cap for ${input.plan_type} is ${PLAN_BRAND_CAPS[input.plan_type]}` };
  }
  // The house row must exist (founder-run migration) — fail loud, never silently mis-attribute.
  const { data: house } = await supabaseAdmin.from("clients").select("id").eq("id", OPERATOR_HOUSE_CLIENT_ID).maybeSingle();
  if (!house) return { case_id: null, case_number: null, error: "operator house client not seeded — run the 20260730 migration first" };

  const { data: created, error } = await supabaseAdmin
    .from("cases")
    .insert({
      client_id: OPERATOR_HOUSE_CLIENT_ID,
      plan_type: input.plan_type,
      plan_category: PLAN_CATEGORY[input.plan_type],
      submission_type: "full_review",
      vendor_name: input.vendor_name,
      vendor_website: input.vendor_website,
      brands_submitted: input.brands,
      marketplace: input.marketplace,
      client_notes: input.notes,
      credits_required: 0, credits_charged: 0,   // provenance: no credit moved, truthfully recorded
      status: "pending_intake",
      origin: "operator",
      operator_meta: { operator_id: input.operator_id, client_name: input.client_name, company_name: input.company_name },
    })
    .select("id, case_number")
    .single();
  if (error || !created) return { case_id: null, case_number: null, error: error?.message ?? "case insert failed" };

  // The audit row — every bypassed run, no exceptions.
  await supabaseAdmin.from("audit_log").insert({
    table_name: "cases", record_id: created.id, action: "INSERT",
    actor_id: input.operator_id, actor_type: "admin",
    new_value: {
      operator_run: true, credit_bypassed: true, plan_type: input.plan_type,
      client_name: input.client_name, company_name: input.company_name, at: new Date().toISOString(),
    },
  });

  // Downstream unchanged — the SAME durable pipeline event the client submit sends.
  try {
    await inngest.send({
      name: "pipeline/run-case",
      data: {
        case_id: created.id, vendor_name: input.vendor_name, vendor_website: input.vendor_website,
        brands_submitted: input.brands, marketplace: input.marketplace, plan_type: input.plan_type,
      },
    });
  } catch (e) {
    // No credit to refund (none was taken) — mark and report truthfully (the H2 pattern minus refund).
    await supabaseAdmin.from("cases").update({ status: "cancelled" }).eq("id", created.id);
    return { case_id: created.id, case_number: created.case_number, error: `enqueue failed: ${e instanceof Error ? e.message : "unknown"}` };
  }
  return { case_id: created.id, case_number: created.case_number, error: null };
}
