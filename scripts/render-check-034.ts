// ── RENDER CHECK — what the CLIENT surface actually produces for a given case, today.
// READ-ONLY. Runs the EXACT projection the portal page runs (projectClientReport +
// projectFindingJsonForClient + cleanClientFindingJson) and prints the result verbatim, so a
// screenshot can be checked against the code rather than argued about.
//
//   CASE=AWI-2608-034 npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local scripts/render-check-034.ts
import { supabaseAdmin } from "@/lib/supabase/admin";
import { projectClientReport, projectFindingJsonForClient, cleanClientFindingJson } from "@/lib/portal/clientReport";
import { findInternalTokens } from "@/lib/portal/clientTokenCheckpoint";

async function main() {
  const caseNumber = process.env.CASE ?? "AWI-2608-034";
  const { data: c } = await supabaseAdmin
    .from("cases").select("id, case_number, plan_type, status, delivered_attempt, additional_questions")
    .eq("case_number", caseNumber).maybeSingle();
  if (!c) { console.log(`case ${caseNumber} not found`); return; }
  const att = (c.delivered_attempt as number | null) ?? 1;
  console.log(`${c.case_number} (${c.plan_type}, ${c.status}) delivered_attempt=${att}\n`);

  const { data: snap } = await supabaseAdmin
    .from("case_synthesis").select("decision_snapshot, vendor_questions")
    .eq("case_id", c.id).eq("attempt_number", att).maybeSingle();

  const report = projectClientReport(
    (snap?.decision_snapshot ?? null) as Record<string, unknown> | null,
    snap?.vendor_questions,
    (c.additional_questions as { question?: unknown }[] | null) ?? [],
  );

  console.log("══ PROJECTED CLIENT REPORT (exactly what getClientReport returns) ══");
  console.log(`\n[headline]\n${report?.headline ?? "(none)"}`);
  console.log(`\n[the_real_risk]\n${report?.the_real_risk ?? "(none)"}`);
  console.log(`\n[leading_interpretation]\n${report?.leading_interpretation ?? "(none)"}`);

  const { data: rows } = await supabaseAdmin
    .from("case_track_results").select("track_key, compiled_findings_json, attempt_number")
    .eq("case_id", c.id).gte("track_number", 1).is("deleted_at", null);
  const mine = (rows ?? []).filter((r) => (r.attempt_number ?? 1) === att);

  console.log(`\n══ PROJECTED FINDINGS (${mine.length} rows) ══`);
  for (const r of mine) {
    const cf = r.compiled_findings_json as Record<string, unknown> | null;
    const projected = cf ? cleanClientFindingJson(projectFindingJsonForClient(cf, r.track_key), r.track_key, { allowInternalTokens: true }) : null;
    const p = (projected ?? {}) as Record<string, unknown>;
    console.log(`\n▸ ${r.track_key}`);
    console.log(`   summary: ${typeof p.summary === "string" ? p.summary.slice(0, 400) : JSON.stringify(p.summary)}`);
    if (p.category_compliance) console.log(`   category_compliance: ${JSON.stringify(p.category_compliance).slice(0, 500)}`);
  }

  const leaks = findInternalTokens({ report, findings: mine.map((r) => {
    const cf = r.compiled_findings_json as Record<string, unknown> | null;
    return cf ? cleanClientFindingJson(projectFindingJsonForClient(cf, r.track_key), r.track_key, { allowInternalTokens: true }) : null;
  }) });
  console.log(`\n══ CHECKPOINT: ${leaks.length} internal token(s) in the projected payload ══`);
  for (const l of leaks.slice(0, 10)) console.log(`   ${l.token} "${l.match}" at ${l.path}`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
