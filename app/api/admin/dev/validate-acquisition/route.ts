import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Orchestrator } from "@/lib/research/acquisition/orchestrator";
import { whoisPlugin } from "@/lib/research/acquisition/plugins/whois";
import { serperPlugin } from "@/lib/research/acquisition/plugins/serper";
import { nativeWebSearchPlugin } from "@/lib/research/acquisition/plugins/nativeWebSearch";
import { persistEvidencePack, persistAcquisitionMetrics } from "@/lib/data/acquisition";
import { writeIntelligence } from "@/lib/data/intelligence";
import { normalizeName } from "@/lib/utils/normalize-name";
import type { ResearchQuestion } from "@/lib/research/acquisition/types";
import { getOperator } from "@/lib/auth/permissions";

// Phase 5.1a INFRASTRUCTURE VALIDATION endpoint (admin-only, dev tool). Runs the REAL Research
// Orchestrator + plugins end-to-end on one supplier, persists the Evidence Pack + acquisition
// metrics, fires the ADR-G006 writeIntelligence(), and returns everything so the founder can
// inspect the persisted rows manually. Creates a throwaway SEED-VALIDATE case (delete after).
// NOT part of the product surface — remove or keep behind admin once 5.1a is frozen.

async function isAdmin(userId: string): Promise<boolean> {
  // ADMIN ACCESS FIX (2026-07-30): routed through getOperator so pages and APIs can never
  // disagree (covers seeded operators with no clients row; legacy roles via the fallback).
  return (await getOperator(userId)) !== null;
}

function hostOf(website: string | null): string | null {
  if (!website) return null;
  try { return new URL(website.startsWith("http") ? website : `https://${website}`).hostname; }
  catch { return null; }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await isAdmin(userId))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { vendor_name?: string; vendor_website?: string; brands_submitted?: string[] } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  const vendorName = body.vendor_name?.trim();
  if (!vendorName) return NextResponse.json({ error: "vendor_name required" }, { status: 400 });
  const vendorWebsite = body.vendor_website?.trim() ?? null;
  const brands = (body.brands_submitted ?? []).map((b) => b.trim()).filter(Boolean);
  const host = hostOf(vendorWebsite);

  // throwaway case (FK target for the persisted pack/metrics)
  const { data: client } = await supabaseAdmin.from("clients").select("id").neq("role", "client").limit(1).maybeSingle();
  if (!client) return NextResponse.json({ error: "no admin client to attach the case to" }, { status: 409 });
  const caseId = crypto.randomUUID();
  const caseNumber = `SEED-VALIDATE-${Date.now()}`;
  const { error: caseErr } = await supabaseAdmin.from("cases").insert({
    id: caseId, case_number: caseNumber, client_id: client.id,
    plan_type: "growth_279", plan_category: "subscription", submission_type: "full_review",
    vendor_name: vendorName, vendor_website: vendorWebsite, brands_submitted: brands,
    marketplace: "amazon_us", status: "research_running",
  });
  if (caseErr) return NextResponse.json({ error: `case insert: ${caseErr.message}` }, { status: 500 });

  // Track-1 (supplier_identity) acquisition request set — code-defined queries routed by capability.
  const requests: { question: ResearchQuestion; input: string }[] = [
    ...(host ? [{ question: "domain_age" as const, input: host }] : []),
    { question: "business_registry", input: `${vendorName} business registration` },
    { question: "linkedin_presence", input: `${vendorName} LinkedIn company` },
    { question: "bbb_listing", input: `${vendorName} BBB` },
    { question: "address_verification", input: `${vendorName} address contact` },
    { question: "scam_reports", input: `${vendorName} scam complaints reviews` },
  ];

  const orchestrator = new Orchestrator([whoisPlugin, serperPlugin, nativeWebSearchPlugin]);
  const { pack, metrics } = await orchestrator.gather({ case_id: caseId, track_key: "supplier_identity", requests });

  const packErr = await persistEvidencePack(pack, 1); // dev validation seeds are always attempt 1
  const metricsErr = await persistAcquisitionMetrics(caseId, "supplier_identity", metrics);
  // H6 signature — dev seed has no resolved identity/verdict; the event records the attempt as-is.
  await writeIntelligence({
    case_id: caseId, vendor_name: vendorName, vendor_website: vendorWebsite,
    brands_submitted: brands, marketplace: "amazon_us", plan_type: "growth_279",
  }, { signals: {}, verdict: null, identityFailed: false, identityUnconfirmed: false });

  return NextResponse.json({
    ok: true,
    case_id: caseId,
    case_number: caseNumber,
    vendor_name_normalized: normalizeName(vendorName),
    brands_normalized: brands.map(normalizeName),
    pack_summary: {
      schema_version: pack.schema_version,
      evidence_hash: pack.evidence_hash,
      source_count: pack.sources.length,
      by_profile: pack.sources.reduce<Record<string, number>>((acc, s) => {
        acc[s.provenance.source_profile] = (acc[s.provenance.source_profile] ?? 0) + 1; return acc;
      }, {}),
      sample_provenance: pack.sources.slice(0, 3).map((s) => ({ url: s.url, ...s.provenance })),
    },
    metrics,
    persist_errors: { pack: packErr.error, metrics: metricsErr.error },
    inspect: {
      evidence_pack: `select schema_version, evidence_hash, pack, collected_at from case_evidence_packs where case_id = '${caseId}';`,
      metrics: `select * from case_acquisition_metrics where case_id = '${caseId}';`,
      vendor_intelligence: `select * from vendor_intelligence where vendor_name_normalized = '${normalizeName(vendorName)}';`,
      cleanup: `delete from case_evidence_packs where case_id='${caseId}'; delete from case_acquisition_metrics where case_id='${caseId}'; delete from cases where id='${caseId}';`,
    },
  });
}
