/**
 * Backup-first re-run harness (founder-run; Claude does NOT run it).
 *
 * H1 (Case Investigation Ledger): a re-run now writes a NEW attempt_number — it never overwrites
 * prior attempts, and a delivered case's verdict/status stay frozen (only reinvestigation_pending
 * is raised). The local JSON backups are kept as belt-and-braces, no longer the only undo.
 * runPipeline still re-collects from LIVE Serper/WHOIS/Anthropic (~$0.10-0.25/case) — for a
 * zero-API re-score of STORED evidence use scripts/rejudge-case.ts instead.
 *
 * SAFETY:
 *   1. Asserts VALIDATION_VERSION AND all required env vars BEFORE anything → else STOP.
 *   2. Per case: writes a local JSON backup (cases row + ALL case_track_results rows) and VERIFIES
 *      it on disk BEFORE that case is re-run. No backup → no re-run.
 *   3. Requires --run to actually fire runPipeline. Without --run it is a DRY pass.
 *
 * Run:
 *   npx tsx --env-file=.env scripts/rerun-batch.ts          # DRY  — backups + plan only, no re-run
 *   npx tsx --env-file=.env scripts/rerun-batch.ts --run    # LIVE — backup-first, then re-run each case
 *   (Node ≥20.6 for --env-file; otherwise `dotenv -e .env -- npx tsx scripts/rerun-batch.ts [--run]`.)
 */
import { writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runPipeline } from "@/lib/research/pipeline";
import { VALIDATION_VERSION } from "@/lib/research/weightValidation";
import type { PlanType } from "@/lib/constants/plans";

const CASES: { id: string; label: string }[] = [
  { id: "eb63ba97-cff0-4e9c-89c3-ba8c98e9eace", label: "JC Sales" },
  { id: "c14dc564-d941-4df3-923e-7b45d3214dc6", label: "TD Synnex" },
  { id: "6336bada-ffa1-4a75-a291-acfc14844ee0", label: "Ingram Micro" },
  { id: "3478c9b3-53ae-4da0-ae44-45c37f2b2d58", label: "TD Synnex" },
  { id: "086655bb-1e0d-4818-9df7-2343e650ea0d", label: "Bosch / globaldist" },
  { id: "81b3edf4-c827-4603-b71f-d9834775523c", label: "TD Synnex" },
  { id: "2b359a6a-98f9-49c9-8f57-c19f4d8daaac", label: "TD Synnex" },
  { id: "ac552e68-8ba1-4e69-b0a2-898f912c4f8c", label: "MotoTec USA" },
];

const REQUIRED_ENV = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY", "SERPER_API_KEY", "WHOIS_API_KEY"];
const VETO_KEYS = new Set([
  "registration_fabricated", "address_fraudulent", "website_fraudulent", "scam_reports_corroborated",
  "counterfeit_channel", "conflicting_authorization", "b2b_only_confirmed", "active_ip_complaints",
  "confirmed_amazon_restrictions", "cease_and_desist_distributed", "document_alteration", "retail_receipt_as_wholesale",
]);

const RUN = process.argv.includes("--run");
type Row = Record<string, unknown>;
const signalsByTrack = (rows: Row[]): Record<string, unknown> =>
  Object.fromEntries(rows.map((r) => [`track_${r.track_number}`, r.track_verdict_signal]));

function preflight() {
  if (VALIDATION_VERSION !== "1.2.0") {
    console.error(`STOP: this code is VALIDATION_VERSION "${VALIDATION_VERSION}", expected "1.2.0". The fix is NOT deployed here — aborting so we don't re-score under old logic.`);
    process.exit(1);
  }
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`STOP: missing required env var(s): ${missing.join(", ")}. Load .env (prod keys) and retry.`);
    process.exit(1);
  }
  console.log(`✔ VALIDATION_VERSION ${VALIDATION_VERSION} · env OK · mode = ${RUN ? "LIVE (--run)" : "DRY (backup + plan only)"}`);
}

async function main() {
  preflight();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = join(process.cwd(), "backups", `rerun-${stamp}`);
  mkdirSync(dir, { recursive: true });
  console.log(`Backups → ${dir}\n`);

  const results: Row[] = [];
  for (const { id, label } of CASES) {
    console.log(`── ${label}  (${id})`);
    try {
      // 1) FETCH + BACKUP (always, before any re-run)
      const { data: caseRow, error: cErr } = await supabaseAdmin
        .from("cases")
        .select("id, vendor_name, vendor_website, brands_submitted, marketplace, plan_type, verdict, status")
        .eq("id", id).maybeSingle();
      if (cErr || !caseRow) { console.error(`   ! skip — case not found (${cErr?.message ?? "no row"})`); continue; }
      const { data: trackRows, error: tErr } = await supabaseAdmin
        .from("case_track_results").select("*").eq("case_id", id).is("deleted_at", null).order("track_number");
      if (tErr) { console.error(`   ! skip — could not read track rows: ${tErr.message}`); continue; }
      const backup = { backed_up_at: new Date().toISOString(), case: caseRow, case_track_results: trackRows ?? [] };
      const backupPath = join(dir, `${id}.json`);
      writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf8");
      if (!existsSync(backupPath) || statSync(backupPath).size < 2) { console.error(`   ! skip — backup NOT confirmed on disk; NOT re-running`); continue; }
      const oldSignals = signalsByTrack((trackRows ?? []) as Row[]);
      console.log(`   ✔ backed up ${(trackRows ?? []).length} track rows → ${id}.json  (old verdict=${caseRow.verdict}, signals=${JSON.stringify(oldSignals)})`);

      const record: Row = { case_id: id, label, input: { vendor_name: caseRow.vendor_name, vendor_website: caseRow.vendor_website, brands: caseRow.brands_submitted }, old: { verdict: caseRow.verdict, status: caseRow.status, signals: oldSignals } };

      // 2) RE-RUN (only with --run; backup is confirmed above)
      if (!RUN) { console.log(`   · DRY: would re-run runPipeline() with the STORED input above. (pass --run to fire)\n`); results.push(record); continue; }

      const pipe = await runPipeline({
        case_id: id, vendor_name: caseRow.vendor_name as string | null, vendor_website: caseRow.vendor_website as string | null,
        brands_submitted: (caseRow.brands_submitted as string[] | null) ?? [], marketplace: (caseRow.marketplace as string) ?? "amazon_us",
        plan_type: caseRow.plan_type as PlanType,
      });
      if (pipe.error) console.error(`   ! runPipeline error: ${pipe.error}`);

      // 3) READ BACK new state + the requested checks
      // H1 — compare like-with-like: only the NEWEST attempt's rows (re-runs append, never overwrite).
      const { data: newRows } = await supabaseAdmin
        .from("case_track_results").select("track_number, attempt_number, track_verdict_signal, evidence_items, track_validation_report").eq("case_id", id).is("deleted_at", null).order("track_number");
      const { data: newCase } = await supabaseAdmin.from("cases").select("verdict, status").eq("id", id).maybeSingle();
      const allRows = (newRows ?? []) as Row[];
      const latestAttempt = allRows.length ? Math.max(...allRows.map((r) => (r.attempt_number as number | null) ?? 1)) : 1;
      const rows = allRows.filter((r) => ((r.attempt_number as number | null) ?? 1) === latestAttempt);
      const t1 = rows.find((r) => r.track_number === 1);
      const rejected = ((t1?.track_validation_report as Row | null)?.rejected as Row[] | undefined) ?? [];
      const scamRejectedByCorroboration = rejected.some((r) => r.proposed_weight_key === "scam_reports_corroborated" && r.gate === "corroboration");
      const validatedKeys = rows.flatMap((r) => ((r.evidence_items as Row[] | null) ?? []).map((e) => e.weight_key)).filter((k): k is string => typeof k === "string");
      const scamValidated = validatedKeys.includes("scam_reports_corroborated");
      const validatedVetoes = [...new Set(validatedKeys.filter((k) => VETO_KEYS.has(k)))];

      record.new = { verdict: newCase?.verdict, status: newCase?.status, signals: signalsByTrack(rows) };
      record.scam_corroboration_rejected = scamRejectedByCorroboration;
      record.scam_validated = scamValidated;
      record.validated_veto_keys = validatedVetoes;
      record.website_fraudulent_validated = validatedKeys.includes("website_fraudulent");
      results.push(record);
      console.log(`   → new verdict=${newCase?.verdict}, signals=${JSON.stringify(signalsByTrack(rows))}`);
      console.log(`     scam rejected(corroboration)=${scamRejectedByCorroboration} · scam validated=${scamValidated} · vetoes=${JSON.stringify(validatedVetoes)}\n`);
    } catch (e) {
      console.error(`   ! ${label} failed: ${e instanceof Error ? e.message : String(e)}\n`);
    }
  }

  const resultsPath = join(dir, "RESULTS.json");
  writeFileSync(resultsPath, JSON.stringify(results, null, 2), "utf8");
  console.log(`\n${RUN ? "DONE (re-run)" : "DONE (dry)"} — ${results.length}/${CASES.length} cases processed. Results → ${resultsPath}`);
  if (!RUN) console.log("No research data was changed. Review the backups + plan, then re-run with --run.");
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
