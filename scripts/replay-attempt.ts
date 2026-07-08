/**
 * H7 (OQ-D, founder-ruled) — REPLAY an attempt's frozen evidence as a genuine NEW attempt.
 * FOUNDER-RUN; Claude does NOT run it. The I1 (judgment backtesting) foundation.
 *
 *   npx tsx --env-file=.env.local scripts/replay-attempt.ts <case-id> <attempt>
 *
 * What it does: loads attempt N's stored packs (NO live acquisition, no Serper/WHOIS spend),
 * reuses the case's frozen supplier_identity (no live resolution), re-runs extraction → firewall →
 * signals → verdict, and appends the result as a real new attempt: rows/pack/synthesis under the
 * new attempt number, ledger event appended, audit-logged with a replay marker. A DELIVERED case's
 * verdict/status/delivered_* stay frozen (H1) — only reinvestigation_pending is raised.
 * Cost ≈ extraction LLM only (~$0.03–0.08/case). A verdict divergence is the gate WORKING
 * (extraction variance made visible) — record whatever it shows.
 */
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runPipeline } from "@/lib/research/pipeline";
import { VALIDATION_VERSION } from "@/lib/research/weightValidation";
import type { PlanType } from "@/lib/constants/plans";

const REQUIRED_ENV = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY"];

type Row = Record<string, unknown>;
const signalsByTrack = (rows: Row[]): Record<string, unknown> =>
  Object.fromEntries(rows.map((r) => [`track_${r.track_number}`, r.track_verdict_signal]));

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const [caseId, attemptArg] = args;
  const replayAttempt = Number(attemptArg);
  if (!caseId || !Number.isInteger(replayAttempt) || replayAttempt < 1) {
    console.error("Usage: npx tsx --env-file=.env.local scripts/replay-attempt.ts <case-id> <attempt>");
    process.exit(1);
  }
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`STOP: missing required env var(s): ${missing.join(", ")}.`);
    process.exit(1);
  }
  console.log(`✔ firewall ${VALIDATION_VERSION} · replaying case ${caseId}, attempt ${replayAttempt}\n`);

  const { data: c, error: cErr } = await supabaseAdmin
    .from("cases")
    .select("id, case_number, vendor_name, vendor_website, brands_submitted, marketplace, plan_type, verdict, status, supplier_identity")
    .eq("id", caseId).maybeSingle();
  if (cErr || !c) { console.error(`STOP: case not found (${cErr?.message ?? "no row"})`); process.exit(1); }
  console.log(`= ${c.case_number} · ${c.vendor_name} (status=${c.status}, stored verdict=${c.verdict})`);

  // Stored packs for the replayed attempt must exist for the plan's finding tracks (fail loud inside
  // the tracks otherwise). Show what we're replaying first.
  const { data: packs } = await supabaseAdmin
    .from("case_evidence_packs")
    .select("track_key, evidence_hash, schema_version")
    .eq("case_id", caseId).eq("attempt_number", replayAttempt);
  console.log(`  frozen packs @ attempt ${replayAttempt}: ${(packs ?? []).map((p) => `${p.track_key}(${p.schema_version}, ${String(p.evidence_hash).slice(0, 8)}…)`).join(", ") || "NONE"}`);

  // OQ-D — the replay marker is the audit-log provenance record for this appended attempt.
  await supabaseAdmin.from("audit_log").insert({
    table_name: "cases", record_id: caseId, action: "UPDATE",
    actor_id: "system", actor_type: "system",
    new_value: { replay_of_attempt: replayAttempt, reason: "H7 replay seam — judge frozen evidence again" },
  });

  const res = await runPipeline({
    case_id: caseId,
    vendor_name: c.vendor_name as string | null,
    vendor_website: c.vendor_website as string | null,
    brands_submitted: (c.brands_submitted as string[] | null) ?? [],
    marketplace: (c.marketplace as string) ?? "amazon_us",
    plan_type: c.plan_type as PlanType,
    replay_from_attempt: replayAttempt,
  });
  if (res.error) console.error(`! runPipeline error: ${res.error}`);

  // Diff: replayed attempt vs the new attempt (rows + verdict + hash identity proof).
  const { data: newRows } = await supabaseAdmin
    .from("case_track_results")
    .select("track_number, attempt_number, track_verdict_signal")
    .eq("case_id", caseId).is("deleted_at", null);
  const all = (newRows ?? []) as Row[];
  const newAttempt = all.length ? Math.max(...all.map((r) => (r.attempt_number as number | null) ?? 1)) : replayAttempt;
  const oldSignals = signalsByTrack(all.filter((r) => r.attempt_number === replayAttempt));
  const newSignals = signalsByTrack(all.filter((r) => r.attempt_number === newAttempt));
  const { data: newCase } = await supabaseAdmin.from("cases").select("verdict, status, reinvestigation_pending").eq("id", caseId).maybeSingle();
  const { data: newPacks } = await supabaseAdmin
    .from("case_evidence_packs")
    .select("track_key, evidence_hash")
    .eq("case_id", caseId).eq("attempt_number", newAttempt);
  const hashMatch = (packs ?? []).every((p) =>
    (newPacks ?? []).some((n) => n.track_key === p.track_key && n.evidence_hash === p.evidence_hash));

  console.log(`\nREPLAY COMPLETE — attempt ${replayAttempt} → new attempt ${newAttempt}`);
  console.log(`  evidence_hash identity: ${hashMatch ? "MATCH (same frozen evidence in — the seam's proof)" : "MISMATCH — investigate before trusting this replay"}`);
  console.log(`  signals @ ${replayAttempt}: ${JSON.stringify(oldSignals)}`);
  console.log(`  signals @ ${newAttempt}: ${JSON.stringify(newSignals)}`);
  console.log(`  verdict: stored=${c.verdict} → replay=${newCase?.verdict} (status=${newCase?.status}, reinvestigation_pending=${newCase?.reinvestigation_pending})`);
  console.log(`  (a delivered case's stored verdict/status/delivered_* are frozen per H1 — the replay verdict lives on the new attempt's record)`);
}
main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
