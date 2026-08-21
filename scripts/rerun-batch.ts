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
 * Run (case ids are REQUIRED args — the old hardcoded list went stale post-H6-cleanup and
 * contained OQ-1-excluded junk cases; labels now come from the DB, per the fixture rule):
 *   npx tsx --env-file=.env.local scripts/rerun-batch.ts <case-id> [<case-id>…]          # DRY  — backups + plan only, no re-run
 *   npx tsx --env-file=.env.local scripts/rerun-batch.ts <case-id> [<case-id>…] --run    # LIVE — backup-first, then re-run each case
 *   (Node ≥20.6 for --env-file; otherwise `dotenv -e .env.local -- npx tsx scripts/rerun-batch.ts …`.)
 */
import { writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runPipeline } from "@/lib/research/pipeline";
import { VALIDATION_VERSION } from "@/lib/research/weightValidation";
import { IOS } from "@/lib/research/ios";
import type { PlanType } from "@/lib/constants/plans";

// Fixture rule (earned thrice): identity comes from the DB, never a shorthand label — case ids are
// passed as args and each case is announced by its DB case_number + vendor_name after the fetch.
const CASE_IDS: string[] = process.argv.slice(2).filter((a) => !a.startsWith("--"));

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
  if (CASE_IDS.length === 0) {
    console.error("STOP: no case ids given.\nUsage: npx tsx --env-file=.env.local scripts/rerun-batch.ts <case-id> [<case-id>…] [--run]");
    process.exit(1);
  }
  // S-2 (b) — synthesis_version joins the pins (pin-first: S-1 bumps IOS.synthesis_version and
  // updates this expectation in the same commit). REPINNED at the S-1 FREEZE: "0.0.0" → "g005-1.0.0".
  if (IOS.synthesis_version !== "g005-1.0.0") {
    console.error(`STOP: this code is synthesis_version "${IOS.synthesis_version}", expected "g005-1.0.0" — aborting so we don't re-score under unexpected synthesis logic.`);
    process.exit(1);
  }
  // REPINNED 1.7.0 → 1.8.0 with the polarity gate (same-commit rule the 1.7.0 note states).
  if (VALIDATION_VERSION !== "1.8.0") { // H7 (SO-2) — pin tracks the firewall version deliberately
    console.error(`STOP: this code is VALIDATION_VERSION "${VALIDATION_VERSION}", expected "1.8.0". The fix is NOT deployed here — aborting so we don't re-score under old logic.`);
    process.exit(1);
  }
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`STOP: missing required env var(s): ${missing.join(", ")}. Load .env (prod keys) and retry.`);
    process.exit(1);
  }
  console.log(`✔ VALIDATION_VERSION ${VALIDATION_VERSION} · env OK · ${CASE_IDS.length} case(s) · mode = ${RUN ? "LIVE (--run)" : "DRY (backup + plan only)"}`);
}

async function main() {
  preflight();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = join(process.cwd(), "backups", `rerun-${stamp}`);
  mkdirSync(dir, { recursive: true });
  console.log(`Backups → ${dir}\n`);

  const results: Row[] = [];
  for (const id of CASE_IDS) {
    console.log(`── ${id}`);
    try {
      // 1) FETCH + BACKUP (always, before any re-run). The DB row IS the identity (fixture rule).
      const { data: caseRow, error: cErr } = await supabaseAdmin
        .from("cases")
        .select("id, case_number, vendor_name, vendor_website, brands_submitted, marketplace, plan_type, verdict, status")
        .eq("id", id).maybeSingle();
      if (cErr || !caseRow) { console.error(`   ! skip — case not found (${cErr?.message ?? "no row"})`); continue; }
      const label = `${caseRow.case_number ?? id} · ${caseRow.vendor_name ?? "?"}`;
      console.log(`   = ${label} (status=${caseRow.status})`);
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
      console.error(`   ! ${id} failed: ${e instanceof Error ? e.message : String(e)}\n`);
    }
  }

  const resultsPath = join(dir, "RESULTS.json");
  writeFileSync(resultsPath, JSON.stringify(results, null, 2), "utf8");
  console.log(`\n${RUN ? "DONE (re-run)" : "DONE (dry)"} — ${results.length}/${CASE_IDS.length} cases processed. Results → ${resultsPath}`);
  if (!RUN) console.log("No research data was changed. Review the backups + plan, then re-run with --run.");
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
