/**
 * KEEPA STAGE 1 — the phase-3 real case, run LOCALLY (founder-directed 2026-09-08).
 *
 *   npx tsx --env-file=.env.local scripts/run-staging-case.ts \
 *     --vendor "Vendor Name" --website "https://…" --plan single_149 \
 *     --brand "Brand=B0ASIN12345" [--brand "Brand2=B0…"] [--notes "…"] [--run]
 *
 * Creates a HOUSE-ACCOUNT operator case (no credit moved, audited, origin=operator) and runs the
 * SYNCHRONOUS pipeline in this process — the same stages the durable Inngest handler runs (one
 * source of truth), but executing THIS working tree's code with .env.local's keys. Nothing is
 * enqueued to the deployed environment; production code and production behavior are untouched.
 * Without --run it prints what it would do and stops.
 *
 * Costs REAL money/tokens: Serper + LLM (~$0.10-0.25) and measured Keepa tokens (reported).
 */
import { runOperatorCase } from "@/lib/data/operatorCase";
import { runPipeline } from "@/lib/research/pipeline";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { validateOperatorBrandAsins } from "@/lib/portal/asinIntake";
import type { PlanType } from "@/lib/constants/plans";
import type { TrackContextWithIntake } from "@/lib/research/intakeExtras";

const REQUIRED_ENV = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY", "SERPER_API_KEY", "KEEPA_API_KEY"];

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null;
}
function args(name: string): string[] {
  const out: string[] = [];
  process.argv.forEach((a, i) => { if (a === `--${name}` && process.argv[i + 1]) out.push(process.argv[i + 1]); });
  return out;
}

async function main() {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length) { console.error(`STOP: missing env: ${missing.join(", ")}`); process.exit(1); }

  const vendor = arg("vendor");
  const plan = (arg("plan") ?? "single_149") as PlanType;
  const brandSpecs = args("brand").map((s) => { const [b, a] = s.split("="); return { brand: (b ?? "").trim(), asin: (a ?? "").trim() }; });
  if (!vendor || brandSpecs.length === 0 || brandSpecs.some((b) => !b.brand)) {
    console.error('Usage: --vendor "Name" --plan single_149 --brand "Brand=ASIN" [--run]');
    process.exit(1);
  }
  const brands = brandSpecs.map((b) => b.brand);
  const asinMap = Object.fromEntries(brandSpecs.filter((b) => b.asin).map((b) => [b.brand, b.asin]));
  const check = validateOperatorBrandAsins(plan, brands, asinMap);
  if (!check.ok) { console.error(`STOP: ${check.error} — ${check.message}`); process.exit(1); }

  console.log(`plan=${plan} vendor=${vendor} brands=${brands.join(", ")}`);
  console.log(`asins=${JSON.stringify(check.clean)}`);
  if (!process.argv.includes("--run")) { console.log("\nDRY: pass --run to create the case and run the pipeline."); return; }

  const r = await runOperatorCase({
    operator_id: "staging-script", plan_type: plan, vendor_name: vendor,
    vendor_website: arg("website"), brands, marketplace: "amazon_us",
    notes: arg("notes") ?? "keepa stage-1 staging run", client_name: null, company_name: null,
    brand_asins: check.clean, skip_enqueue: true,
  });
  if (r.error || !r.case_id) { console.error(`STOP: ${r.error}`); process.exit(1); }
  console.log(`\n✔ case created: ${r.case_number} (${r.case_id}) — running pipeline locally…\n`);

  const ctx: TrackContextWithIntake = {
    case_id: r.case_id, vendor_name: vendor, vendor_website: arg("website"),
    brands_submitted: brands, marketplace: "amazon_us", plan_type: plan,
    ...(check.clean ? { brand_asins: check.clean } : {}),
  } as TrackContextWithIntake;

  const t0 = Date.now();
  const res = await runPipeline(ctx);
  console.log(`\npipeline finished in ${Math.round((Date.now() - t0) / 1000)}s — error: ${res.error ?? "none"}`);

  // Read back what landed — verdict, the track_3 marketplace block, the track_6 assessment.
  const { data: c } = await supabaseAdmin.from("cases").select("case_number, status, verdict").eq("id", r.case_id).maybeSingle();
  console.log(`case: ${JSON.stringify(c)}`);
  const { data: rows } = await supabaseAdmin
    .from("case_track_results")
    .select("track_key, compiled_findings_json")
    .eq("case_id", r.case_id).in("track_key", ["brand_risk_assessment", "category_compliance"])
    .is("deleted_at", null);
  for (const row of rows ?? []) {
    const cf = row.compiled_findings_json as Record<string, unknown> | null;
    if (row.track_key === "brand_risk_assessment") {
      console.log(`\n── marketplace_history (track_3) ──\n${JSON.stringify(cf?.marketplace_history ?? null, null, 2)}`);
    } else {
      console.log(`\n── category_compliance (track_6) ──\n${JSON.stringify(cf?.category_compliance ?? null, null, 2)?.slice(0, 3000)}`);
    }
  }
  const { data: audits } = await supabaseAdmin
    .from("audit_log").select("new_value").eq("record_id", r.case_id)
    .order("created_at", { ascending: false }).limit(10);
  const keepaAudit = (audits ?? []).map((a) => a.new_value as Record<string, unknown>).find((v) => v?.marketplace_history);
  console.log(`\nkeepa audit: ${JSON.stringify(keepaAudit ?? null)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
