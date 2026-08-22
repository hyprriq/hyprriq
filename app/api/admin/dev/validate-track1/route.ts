import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOperator } from "@/lib/auth/permissions";
import { devValidationRoutesArmed } from "@/lib/auth/devRoutes";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runPipeline } from "@/lib/research/pipeline";
import { finalizePack } from "@/lib/research/acquisition/pack";
import { buildTrack1Prompt } from "@/lib/research/track1.prompt";
import { runModel } from "@/lib/ai/runModel";
import { normalizeName } from "@/lib/utils/normalize-name";
import type { RawSource } from "@/lib/research/acquisition/types";
import type { PlanType } from "@/lib/constants/plans";

// Phase 5.1b STEP-1 VALIDATION endpoint (admin-only, dev tool). Triggers the REAL runPipeline on a
// throwaway case for one known supplier — exercising the full Track 1 path (acquisition → Evidence
// Pack → prompt → firewall → deriveTrackSignal → verdict → memory write) in isolation from the portal
// submission workflow. Step 2 (portal → Inngest → same runPipeline) must produce identical outputs.
// Reads back the five outputs + an evidence_hash stability check + the dedup view for inspection.
// NOT a product surface; remove or keep behind admin once Track 1 is frozen.

// ADMIN ACCESS FIX (2026-07-30) applied here 2026-08-22 — this route was the one site the
// original sweep missed: it still read clients.role directly, so the super-admin identity (no
// clients row, by founder ruling) was refused by its own tool. getOperator is the one notion.
async function isAdmin(userId: string): Promise<boolean> {
  return (await getOperator(userId)) !== null;
}

export async function POST(req: Request) {
  // Disarmed unless DEV_VALIDATION_ROUTES=1 (CTO audit 2026-08-22): this route spends real
  // research budget and seeds throwaway cases. 404, not 403 — a disabled dev tool does not
  // advertise itself. Never arm this in Production.
  if (!devValidationRoutesArmed()) return NextResponse.json({ error: "not_found" }, { status: 404 });
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

  // ── Phase 1 boundary diagnostics (root-cause evidence; NO fixes here) ──
  // (1) env propagation: are the provider keys present in THIS (deployed) environment?
  const env_present = {
    serper: !!process.env.SERPER_API_KEY,
    whois: !!process.env.WHOIS_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
  };
  // (2) acquisition boundary: did each plugin return sources, or skip/fail?
  const { data: acqMetrics } = await supabaseAdmin
    .from("case_acquisition_metrics")
    .select("plugin_id, final_status, retry_count, evidence_items_returned, latency_ms, api_cost_usd")
    .eq("case_id", caseId);
  // (3) Evidence Pack boundary: what did the pack actually contain?
  const packSources = (epack?.pack as RawSource[] | null) ?? [];
  const pack_summary = {
    source_count: packSources.length,
    by_profile: packSources.reduce<Record<string, number>>((a, s) => {
      a[s.provenance.source_profile] = (a[s.provenance.source_profile] ?? 0) + 1; return a;
    }, {}),
    sample: packSources.slice(0, 3).map((s) => ({ url: s.url, title: s.title, profile: s.provenance.source_profile, method: s.provenance.acquisition_method })),
  };
  // (4) model boundary: re-run the prompt on the PERSISTED pack and capture the raw output / error.
  let model_diagnostic: Record<string, unknown>;
  try {
    const promptSources = packSources.map((s, i) => ({ source_id: `src_${i}`, url: s.url, title: s.title, snippet: s.snippet }));
    const { system, user } = buildTrack1Prompt({ vendor_name: vendorName, vendor_website: vendorWebsite }, promptSources);
    const res = await runModel({ task: "track", system, user, temperature: 0 });
    model_diagnostic = { ok: true, model_version: res.model_version, tokens: res.tokens, raw_json: res.json };
  } catch (e) {
    model_diagnostic = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

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
    diagnostics: {
      env_present,           // false here = key not set in THIS (Vercel) environment → H1
      acquisition_metrics: acqMetrics, // per-plugin final_status: "skipped" = no key; "ok" = worked
      pack_summary,          // source_count 0 = acquisition produced nothing
      model_diagnostic,      // raw_json shows the model output; {_parse_error,_raw} = brittle-JSON (H2); error = call failed
    },
    inspect: {
      track1_row: `select track_verdict_signal, classifications_total, classifications_accepted, acceptance_rate, weight_validation, track_validation_report from case_track_results where case_id = '${caseId}' and track_number = 1;`,
      evidence_pack: `select evidence_hash, schema_version, pack from case_evidence_packs where case_id = '${caseId}';`,
      vendor_intelligence: `select * from vendor_intelligence where vendor_name_normalized = '${normalizeName(vendorName)}';`,
      cleanup: `-- throwaway: run scripts/scenarios/cleanup.mjs (matches SEED-%), then optionally delete the vendor_intelligence row.`,
    },
  });
}
