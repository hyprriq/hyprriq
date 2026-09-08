import { supabaseAdmin } from "@/lib/supabase/admin";
import { inngest } from "@/lib/inngest/client";
import { CASE_SLA_HOURS, PLAN_CATEGORY, PLAN_BRAND_CAPS, type PlanType } from "@/lib/constants/plans";

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
  // ── OPERATOR ASIN INTAKE (Keepa stage 1, 2026-09-08). Validated by the route via
  // validateOperatorBrandAsins: format, brand membership, one-per-brand, PLAN_ASIN_ELIGIBLE.
  // ⚠ UNRULED, deliberate and flagged: the operator path checks PLAN eligibility but NOT the
  // KEEPA_LIVE form-gating flag — that flag governs what the CLIENT form renders ("no field
  // nothing consumes"); an operator supplying ASINs by hand is not that failure mode. Founder
  // to ratify or reverse.
  brand_asins?: Record<string, string> | null;
  // Staging-run seam (2026-09-08): create the case + audit rows but do NOT enqueue the durable
  // pipeline — the caller runs the synchronous runPipeline locally instead (same stages, one
  // source of truth). Used by scripts/run-staging-case.ts; the admin route never sets it.
  skip_enqueue?: boolean;
}

// ── ADMIN CLOSE-OUT (2026-08-11) — operator document upload. PRE-VETTED by the route (count cap,
// size, magic-byte sniff — the same fileSniff rules as client submit; this module never trusts a
// claimed type). Storage is IDENTICAL to the client path: same case-documents bucket, same
// uploaded_files table, attribution = the house row (matches cases.client_id). documentPack reads
// by case_id only, so Documentation Review consumes operator uploads exactly like client uploads. ──
export interface OperatorRunDocument {
  name: string;
  buffer: Buffer;
  mime: string;                        // SNIFFED mime — never client-claimed
  kind: "pdf" | "image";
  size: number;
}

export async function runOperatorCase(input: OperatorRunInput, documents: OperatorRunDocument[] = []): Promise<{ case_id: string | null; case_number: string | null; error: string | null }> {
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
      // SLA (2026-08-12): operator-run cases carry the same 24h deadline — the queue risk view
      // must cover every case the team owes, credit-bypassed or not.
      sla_deadline: new Date(Date.now() + CASE_SLA_HOURS * 3_600_000).toISOString(),
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

  // Documents BEFORE enqueue (same order as client submit) — the pipeline's documentPack must
  // never race an empty upload set. Best-effort per file; the case proceeds regardless.
  for (const [idx, d] of documents.entries()) {
    try {
      const path = `${OPERATOR_HOUSE_CLIENT_ID}/${created.id}/${Date.now()}-${idx}-${d.name}`;
      const { error: upErr } = await supabaseAdmin.storage
        .from("case-documents")
        .upload(path, d.buffer, { contentType: d.mime });
      if (!upErr) {
        await supabaseAdmin.from("uploaded_files").insert({
          case_id: created.id,
          client_id: OPERATOR_HOUSE_CLIENT_ID,
          file_name: d.name,
          file_type: d.kind === "pdf" ? "invoice_pdf" : "invoice_image",
          storage_path: path,
          file_size_bytes: d.size,
        });
      }
    } catch {
      /* per-file best effort — never blocks the run */
    }
  }

  // ASIN persistence — same best-effort pattern as the client submit route (the column is
  // migration-gated there too); the EVENT carries the value regardless, per intakeExtras.
  if (input.brand_asins && Object.keys(input.brand_asins).length > 0) {
    const { error: asinErr } = await supabaseAdmin.from("cases").update({ brand_asins: input.brand_asins }).eq("id", created.id);
    if (asinErr) console.error("[operator-run] brand_asins persist failed (non-fatal):", asinErr.message, { case_id: created.id });
  }

  if (input.skip_enqueue) return { case_id: created.id, case_number: created.case_number, error: null };

  // Downstream unchanged — the SAME durable pipeline event the client submit sends.
  try {
    await inngest.send({
      name: "pipeline/run-case",
      data: {
        case_id: created.id, vendor_name: input.vendor_name, vendor_website: input.vendor_website,
        brands_submitted: input.brands, marketplace: input.marketplace, plan_type: input.plan_type,
        ...(input.brand_asins && Object.keys(input.brand_asins).length > 0 ? { brand_asins: input.brand_asins } : {}),
      },
    });
  } catch (e) {
    // No credit to refund (none was taken) — mark and report truthfully (the H2 pattern minus refund).
    await supabaseAdmin.from("cases").update({ status: "cancelled" }).eq("id", created.id);
    return { case_id: created.id, case_number: created.case_number, error: `enqueue failed: ${e instanceof Error ? e.message : "unknown"}` };
  }
  return { case_id: created.id, case_number: created.case_number, error: null };
}
