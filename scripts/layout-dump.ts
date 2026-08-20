// ── LAYOUT QA, HALF 1 (data) — dumps the exact client projection for one or more cases to JSON,
// so a plain-Node harness (scripts/layout-render.tsx, no react-server condition) can render the
// REAL ReportView with REAL content and a browser can look at it at all four tiers.
//
// Two halves because the conditions are incompatible: this half needs --conditions=react-server
// (server-only imports); the render half needs react-dom/server, which that condition forbids.
//
//   CASES=AWI-2608-035,... npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local scripts/layout-dump.ts <outdir>
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getProseOverrides } from "@/lib/data/proseOverrides";
import { overlayTrackRows, overlaySynthesisClient } from "@/lib/portal/overlayDelivery";
import { deriveClientCertainty } from "@/lib/portal/certainty";
import {
  projectClientReport, cleanClientProseDeep, cleanClientFindingJson,
  projectFindingJsonForClient, projectQuestionsForClient,
} from "@/lib/portal/clientReport";
import type { QuestionToAsk } from "@/lib/research/contracts";

// Inlined PG-1 projection (lib/data/cases.projectSupplierIdentityForClient) — importing that
// module pulls Clerk/Next client context, which the react-server condition cannot load. Keep in
// sync: ONLY the discrepancy kind + client_note cross.
function projectIdentity(si: { identity_discrepancy?: { kind?: string; client_note?: string } | null } | null) {
  if (!si?.identity_discrepancy) return null;
  return { identity_discrepancy: { kind: si.identity_discrepancy.kind, client_note: si.identity_discrepancy.client_note } };
}

const OUT = process.argv[2];
if (!OUT) { console.error("usage: CASES=... layout-dump.ts <outdir>"); process.exit(1); }

async function main() {
  mkdirSync(OUT, { recursive: true });
  const wanted = (process.env.CASES ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const { data: cases } = await supabaseAdmin
    .from("cases")
    .select("id, case_number, vendor_name, vendor_website, brands_submitted, brands_confirmed, status, verdict, plan_type, delivered_at, delivered_attempt, change_request_deadline, change_request_used, sla_deadline, created_at, supplier_identity, additional_questions")
    .in("case_number", wanted);

  for (const c of (cases ?? []) as Record<string, unknown>[]) {
    const caseId = c.id as string;
    const { data } = await supabaseAdmin
      .from("case_track_results")
      .select("id, track, track_key, evidence_items, compiled_findings_json, questions_to_ask, attempt_number")
      .eq("case_id", caseId).gte("track_number", 1).is("deleted_at", null)
      .order("track_number", { ascending: true });
    type Row = { id: string; track: string; track_key: string; evidence_items: { certainty?: string | null }[] | null; compiled_findings_json: Record<string, unknown> | null; questions_to_ask: QuestionToAsk[] | null; attempt_number: number | null };
    const rows = (data as Row[]) ?? [];
    const chosen = (c.delivered_attempt as number | null) ?? Math.max(1, ...rows.map((r) => r.attempt_number ?? 1));
    const overrides = await getProseOverrides(caseId, chosen);
    const { rows: overlaid } = overlayTrackRows(rows.filter((r) => (r.attempt_number ?? 1) === chosen), overrides);
    // The SAME projection getCaseFindings performs (minus Clerk/status gating — operator QA only).
    const findings = overlaid.map((r) => ({
      id: r.id, track: r.track, track_key: r.track_key,
      finding_certainty: deriveClientCertainty(r.evidence_items),
      compiled_findings_json: r.compiled_findings_json
        ? cleanClientFindingJson(projectFindingJsonForClient(r.compiled_findings_json as Record<string, unknown>, r.track_key), r.track_key)
        : null,
      questions_to_ask: cleanClientProseDeep(projectQuestionsForClient(r.questions_to_ask)),
    }));

    const { data: s } = await supabaseAdmin
      .from("case_synthesis").select("decision_snapshot, vendor_questions")
      .eq("case_id", caseId).eq("attempt_number", chosen).is("deleted_at", null).maybeSingle();
    const synth = overlaySynthesisClient((s as { decision_snapshot?: unknown } | null)?.decision_snapshot ?? null, (s as { vendor_questions?: unknown } | null)?.vendor_questions ?? null, overrides);
    const report = projectClientReport(
      (synth.decision_snapshot ?? null) as Record<string, unknown> | null,
      synth.vendor_questions,
      (c.additional_questions as { question?: string }[] | null) ?? [],
    );

    const detail = {
      ...c,
      supplier_identity: projectIdentity(c.supplier_identity as never),
    };
    const payload = { c: detail, findings, report, plan: c.plan_type };
    writeFileSync(join(OUT, `${c.case_number}.json`), JSON.stringify(payload, null, 1));
    console.log(`✔ ${c.case_number} (${c.plan_type}, attempt ${chosen}) → ${OUT}`);
  }
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
