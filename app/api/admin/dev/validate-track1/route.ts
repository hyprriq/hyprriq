import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runPipeline } from "@/lib/research/pipeline";
import { finalizePack } from "@/lib/research/acquisition/pack";
import { normalizeName } from "@/lib/utils/normalize-name";
import type { RawSource } from "@/lib/research/acquisition/types";
import type { PlanType } from "@/lib/constants/plans";

// Phase 5.1b STEP-1 VALIDATION endpoint (admin-only, dev tool). Triggers the REAL runPipeline on a
// throwaway case for one known supplier — exercising the full Track 1 path (acquisition → Evidence
// Pack → prompt → firewall → deriveTrackSignal → verdict → memory write) in isolation from the portal
// submission workflow. Step 2 (portal → Inngest → same runPipeline) must produce identical outputs.
// Reads back the five outputs + an evidence_hash stability check + the dedup view for inspection.
// NOT a product surface; remove or keep behind admin once Track 1 is frozen.

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from("clients").select("role").eq("id", userId).maybeSingle();
  return !!data && data.role !== "client";
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await isAdmin(userId))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { vendor_name?: string; vendor_website?: string; brands_submitted?: string[] } = {};
  try { body = await req.json(); } catch { /* defaults below */ }
  const vendorName = (body.vendor_name ?? "Ingram Micro").trim();
  const vendorWebsite = (body.vendor_website ?? "https://www.ingrammicro.com").trim();
  const brands = (body.brands_submitted ?? ["Samsung"]).map((b) => b.trim()).filter(Boolean);
  const plan_type: PlanType = "growth_279";

  const { data: client } = await supabaseAdmin.from("clients").select("id").neq("role", "client").limit(1).maybeSingle();
  if (!client) return NextResponse.json({ error: "no admin client to attach the case to" }, { status: 409 });

  const caseId = crypto.randomUUID();
  const caseNumber = `SEED-VALIDATE-T1-${Date.now()}`;
  const { error: caseErr } = await supabaseAdmin.from("cases").insert({
    id: caseId, case_number: caseNumber, client_id: client.id,
    plan_type, plan_category: "subscription", submission_type: "full_review",
    vendor_name: vendorName, vendor_website: vendorWebsite, brands_submitted: brands,
    marketplace: "amazon_us", status: "research_running",
  });
  if (caseErr) return NextResponse.json({ error: `case insert: ${caseErr.message}` }, { status: 500 });

  // ── Run the REAL pipeline (Track 1 makes live Serper/WHOIS/Anthropic calls) ──
  const pipeErr = await runPipeline({
    case_id: caseId, vendor_name: vendorName, vendor_website: vendorWebsite,
    brands_submitted: brands, marketplace: "amazon_us", plan_type,
  });

  // ── Read back the five outputs ──
  const { data: t1 } = await supabaseAdmin
    .from("case_track_results")
    .select("evidence_items, weight_validation, classifications_total, classifications_accepted, classifications_rejected, classifications_unknown, acceptance_rate, track_validation_report, track_verdict_signal, confidence_score, confidence_band")
    .eq("case_id", caseId).eq("track_number", 1).maybeSingle();
  const { data: epack } = await supabaseAdmin
    .from("case_evidence_packs").select("pack, evidence_hash, collected_at")
    .eq("case_id", caseId).eq("track_key", "supplier_identity").maybeSingle();
  const { data: vi } = await supabaseAdmin
    .from("vendor_intelligence").select("vendor_name_normalized, overall_risk_signal, case_count, known_brand_relationships")
    .eq("vendor_name_normalized", normalizeName(vendorName)).maybeSingle();
  const { data: c } = await supabaseAdmin.from("cases").select("verdict, status, synthesis_status").eq("id", caseId).maybeSingle();

  // ── evidence_hash determinism: re-run finalizePack on the persisted sources → must equal stored hash ──
  let evidence_hash_stable: boolean | null = null;
  if (epack?.pack && epack.evidence_hash) {
    const rehashed = finalizePack(caseId, "supplier_identity", epack.pack as RawSource[], (epack.collected_at as string) ?? "");
    evidence_hash_stable = rehashed.evidence_hash === epack.evidence_hash;
  }

  // ── dedup view: validated weight_keys vs distinct (proves multi-source dedup if duplicates existed) ──
  const evItems = (t1?.evidence_items as { weight_key?: string }[] | null) ?? [];
  const validatedKeys = evItems.map((e) => e.weight_key).filter((k): k is string => !!k);
  const distinctKeys = [...new Set(validatedKeys)];

  return NextResponse.json({
    ok: true,
    pipeline_error: pipeErr.error,
    case_id: caseId,
    case_number: caseNumber,
    vendor: { name: vendorName, normalized: normalizeName(vendorName), website: vendorWebsite, brands },
    outputs: {
      evidence_items_count: evItems.length,
      validated_weight_keys: validatedKeys,
      distinct_weight_keys: distinctKeys,
      dedup_active: validatedKeys.length !== distinctKeys.length, // true if any duplicate was collapsed
      weight_validation_count: ((t1?.weight_validation as unknown[] | null) ?? []).length,
      classifications: {
        total: t1?.classifications_total, accepted: t1?.classifications_accepted,
        rejected: t1?.classifications_rejected, unknown: t1?.classifications_unknown,
        acceptance_rate: t1?.acceptance_rate,
      },
      track_verdict_signal: t1?.track_verdict_signal,
      track_validation_report: t1?.track_validation_report,
      vendor_intelligence: vi,
      case_verdict: c?.verdict, case_status: c?.status,
    },
    checks: {
      evidence_hash: epack?.evidence_hash ?? null,
      evidence_hash_stable, // re-hashing the persisted pack reproduces the stored hash
    },
    inspect: {
      track1_row: `select track_verdict_signal, classifications_total, classifications_accepted, acceptance_rate, weight_validation, track_validation_report from case_track_results where case_id = '${caseId}' and track_number = 1;`,
      evidence_pack: `select evidence_hash, schema_version, pack from case_evidence_packs where case_id = '${caseId}';`,
      vendor_intelligence: `select * from vendor_intelligence where vendor_name_normalized = '${normalizeName(vendorName)}';`,
      cleanup: `-- throwaway: run scripts/scenarios/cleanup.mjs (matches SEED-%), then optionally delete the vendor_intelligence row.`,
    },
  });
}
