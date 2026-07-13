/**
 * DISPUTE/ESCALATION RE-RUN (founder-ruled 2026-07-13). FOUNDER-RUN; Claude does NOT run it.
 *
 * PURPOSE — used RARELY: when a client challenges a verdict or asks for a refund and we need to
 * regenerate the case to demonstrate the verdict is stable and evidence-driven, or to apply a
 * ruled prompt/logic fix to one specific case. NOT a routine step — the product promise is that
 * the FIRST delivered verdict is complete and defensible; if re-running were routine, that promise
 * would be broken. The friction here is deliberate: a mandatory --reason (recorded in the audit
 * log) and a DRY default (--run to fire).
 *
 * WHAT IT IS (and is not): the system regenerating its OWN answer from the same facts — same
 * vendor, same brands, same already-uploaded documents (no re-upload, no input alteration), fresh
 * research through the CURRENT pipeline, appended as a genuine NEW attempt (H1). Same verdict
 * EXPECTED — verdict stability is the feature; a would-be flip is SURFACED, never silently
 * adopted. DISTINCT from "request further investigation": there a human adds NEW intelligence on
 * top and the verdict may legitimately change; this tool is the former only.
 *
 * SAFETY (each is a first-class test in lib/research/pipeline*.dispute.test.ts):
 *   - NEW attempt from existing inputs; prior attempts (incl. the delivered one) stay byte-unchanged.
 *   - NO live-pointer advance: cases.verdict/status/track statuses/supplier_identity/delivered_*
 *     untouched (stageFinalize's dedicated no-advance branch — the AWI-2607-022 lesson).
 *   - NO auto-deliver. Whether the new attempt becomes the case's current verdict is a separate,
 *     deliberate founder step afterward (admin publish).
 *   - NO credit re-charge: this re-runs an existing PAID case. The script snapshots the client's
 *     credits_available before/after and reports it unchanged.
 *
 * Run (founder):
 *   npx tsx --env-file=.env.local scripts/dispute-rerun.ts <case-id> --reason "<dispute/ticket ref>"          # DRY — plan + backup only
 *   npx tsx --env-file=.env.local scripts/dispute-rerun.ts <case-id> --reason "<dispute/ticket ref>" --run    # LIVE — fires the re-run
 */
import { writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runPipeline } from "@/lib/research/pipeline";
import { VALIDATION_VERSION } from "@/lib/research/weightValidation";
import type { PlanType } from "@/lib/constants/plans";

const REQUIRED_ENV = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY", "SERPER_API_KEY", "WHOIS_API_KEY"];

type Row = Record<string, unknown>;
const signalsByTrack = (rows: Row[]): Record<string, unknown> =>
  Object.fromEntries(rows.map((r) => [`track_${r.track_number}`, r.track_verdict_signal]));

function parseArgs() {
  const argv = process.argv.slice(2);
  const reasonIdx = argv.indexOf("--reason");
  const reason = reasonIdx >= 0 ? (argv[reasonIdx + 1] ?? "") : "";
  const positional = argv.filter((a, i) => !a.startsWith("--") && i !== reasonIdx + 1);
  return { caseId: positional[0], reason: reason.trim(), run: argv.includes("--run") };
}

async function main() {
  const { caseId, reason, run } = parseArgs();
  if (!caseId || !reason) {
    console.error(
      "STOP: a dispute re-run requires the case id AND a stated reason (it is recorded in the audit log).\n" +
      'Usage: npx tsx --env-file=.env.local scripts/dispute-rerun.ts <case-id> --reason "<dispute/ticket ref>" [--run]\n' +
      "This tool is for the EXCEPTION (client dispute / refund defense / applying a ruled fix to one case) — not the routine flow.",
    );
    process.exit(1);
  }
  if (VALIDATION_VERSION !== "1.6.0") { // version pin, the rerun-batch pattern — never re-score under unexpected logic
    console.error(`STOP: this code is VALIDATION_VERSION "${VALIDATION_VERSION}", expected "1.6.0" — aborting.`);
    process.exit(1);
  }
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length) { console.error(`STOP: missing required env var(s): ${missing.join(", ")}.`); process.exit(1); }

  // ── Fetch the case + snapshot the LIVE POINTER and the client's credit balance (the before). ──
  const { data: c, error: cErr } = await supabaseAdmin
    .from("cases")
    .select("id, case_number, vendor_name, vendor_website, brands_submitted, marketplace, plan_type, client_id, verdict, status, delivered_at, delivered_attempt")
    .eq("id", caseId).maybeSingle();
  if (cErr || !c) { console.error(`STOP: case not found (${cErr?.message ?? "no row"})`); process.exit(1); }
  const pointerBefore = { verdict: c.verdict, status: c.status, delivered_at: c.delivered_at, delivered_attempt: c.delivered_attempt };
  const { data: clientBefore } = await supabaseAdmin
    .from("clients").select("credits_available").eq("id", c.client_id).maybeSingle();
  const creditsBefore = clientBefore?.credits_available ?? null;

  console.log(`= ${c.case_number} · ${c.vendor_name} (status=${c.status}, verdict=${c.verdict}, delivered_attempt=${c.delivered_attempt ?? "—"})`);
  console.log(`  reason: ${reason}`);
  console.log(`  client credits_available (before): ${creditsBefore}`);

  // ── Backup-first (the rerun-batch pattern): cases row + all track rows to local JSON. ──
  const { data: trackRows, error: tErr } = await supabaseAdmin
    .from("case_track_results").select("*").eq("case_id", caseId).is("deleted_at", null).order("track_number");
  if (tErr) { console.error(`STOP: could not read track rows: ${tErr.message}`); process.exit(1); }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = join(process.cwd(), "backups", `dispute-${stamp}`);
  mkdirSync(dir, { recursive: true });
  const backupPath = join(dir, `${caseId}.json`);
  writeFileSync(backupPath, JSON.stringify({ backed_up_at: new Date().toISOString(), reason, case: c, case_track_results: trackRows ?? [] }, null, 2), "utf8");
  if (!existsSync(backupPath) || statSync(backupPath).size < 2) { console.error("STOP: backup NOT confirmed on disk — not re-running."); process.exit(1); }
  const allBefore = (trackRows ?? []) as Row[];
  const attemptBefore = allBefore.length ? Math.max(...allBefore.map((r) => (r.attempt_number as number | null) ?? 1)) : 0;
  console.log(`  ✔ backed up ${allBefore.length} track rows → ${backupPath} (latest attempt: ${attemptBefore})`);

  if (!run) {
    console.log("\nDRY — no re-run fired. This would: append a NEW attempt from the case's existing inputs");
    console.log("(same vendor/brands/uploaded documents), leave the live pointer and credits untouched, and");
    console.log("surface the verdict comparison. Pass --run to fire.");
    return;
  }

  // ── Provenance FIRST: the dispute marker + reason go on the audit log before anything runs. ──
  await supabaseAdmin.from("audit_log").insert({
    table_name: "cases", record_id: caseId, action: "UPDATE",
    actor_id: "founder", actor_type: "admin",
    new_value: { dispute_rerun_requested: true, reason, prior_latest_attempt: attemptBefore },
  });

  // ── Fire: the current pipeline, existing inputs, dispute mode (no-advance finalize). ──
  const res = await runPipeline({
    case_id: caseId,
    vendor_name: c.vendor_name as string | null,
    vendor_website: c.vendor_website as string | null,
    brands_submitted: (c.brands_submitted as string[] | null) ?? [],
    marketplace: (c.marketplace as string) ?? "amazon_us",
    plan_type: c.plan_type as PlanType,
    dispute_rerun: true,
  });
  if (res.error) console.error(`! runPipeline error: ${res.error}`);

  // ── Verify + report: pointer untouched, no charge, verdict comparison surfaced. ──
  const { data: after } = await supabaseAdmin
    .from("cases").select("verdict, status, delivered_at, delivered_attempt, reinvestigation_pending").eq("id", caseId).maybeSingle();
  const { data: clientAfter } = await supabaseAdmin
    .from("clients").select("credits_available").eq("id", c.client_id).maybeSingle();
  const { data: newRows } = await supabaseAdmin
    .from("case_track_results").select("track_number, attempt_number, track_verdict_signal").eq("case_id", caseId).is("deleted_at", null);
  const all = (newRows ?? []) as Row[];
  const attemptAfter = all.length ? Math.max(...all.map((r) => (r.attempt_number as number | null) ?? 1)) : attemptBefore;

  const pointerAfter = { verdict: after?.verdict, status: after?.status, delivered_at: after?.delivered_at, delivered_attempt: after?.delivered_attempt };
  const pointerUntouched = JSON.stringify(pointerBefore) === JSON.stringify(pointerAfter);
  const creditsAfter = clientAfter?.credits_available ?? null;

  // The rerun verdict is on the audit record (stageFinalize's dispute entry), not the case row.
  const { data: auditRows } = await supabaseAdmin
    .from("audit_log").select("new_value").eq("record_id", caseId).order("created_at", { ascending: false }).limit(5);
  const disputeEntry = (auditRows ?? []).map((r) => r.new_value as Row).find((v) => v?.dispute_rerun === true);
  const rerunVerdict = disputeEntry?.rerun_verdict ?? "(see audit log)";
  const stable = disputeEntry?.verdict_stable;

  console.log(`\nDISPUTE RE-RUN COMPLETE — attempt ${attemptBefore} → ${attemptAfter}`);
  console.log(`  signals @ ${attemptBefore}: ${JSON.stringify(signalsByTrack(allBefore.filter((r) => ((r.attempt_number as number | null) ?? 1) === attemptBefore)))}`);
  console.log(`  signals @ ${attemptAfter}: ${JSON.stringify(signalsByTrack(all.filter((r) => ((r.attempt_number as number | null) ?? 1) === attemptAfter)))}`);
  console.log(`  live pointer: ${pointerUntouched ? "UNTOUCHED ✔" : "⚠ CHANGED — INVESTIGATE IMMEDIATELY (this must never happen)"} (verdict=${pointerAfter.verdict}, status=${pointerAfter.status}, delivered_attempt=${pointerAfter.delivered_attempt ?? "—"})`);
  console.log(`  credits_available: ${creditsBefore} → ${creditsAfter} ${creditsBefore === creditsAfter ? "— NO CHARGE ✔" : "⚠ CHANGED — INVESTIGATE IMMEDIATELY"}`);
  console.log(`  verdict: current=${pointerBefore.verdict} · re-run=${rerunVerdict} → ${stable === true ? "VERDICT STABLE ✔ (the feature)" : stable === false ? "⚠ WOULD-BE FLIP — surfaced on the audit log, NOT adopted; rule on it deliberately" : "(comparison on the audit log)"}`);
  console.log(`  reinvestigation_pending=${after?.reinvestigation_pending} — adopting the new attempt is a separate, deliberate admin-publish step.`);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
