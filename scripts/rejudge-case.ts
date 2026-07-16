/**
 * H1 determinism proof (AT-3) — re-derives every track signal from the STORED evidence_items and
 * the verdict from those signals, then compares against what is persisted. READ-ONLY: zero API
 * calls, zero writes. PASS (exit 0) = the stored record fully determines the verdict — the Case
 * Investigation Ledger property.
 *
 * Run (founder):
 *   npx tsx --env-file=.env.local scripts/rejudge-case.ts <case_id> [attempt]
 * Default attempt = the case's latest. Note: cases.verdict reflects the LATEST finalized attempt
 * unless the case is delivered (frozen) — when re-judging a non-delivered attempt the verdict
 * comparison is skipped for other attempts (reported, not failed).
 */
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rederiveStoredSignal } from "@/lib/research/rederive";
import { certifySynthesisForVerdict } from "@/lib/research/synthesisFirewall";
import { computeVerdict } from "@/lib/research/verdictEngine";
import { applyVerdictCeiling } from "@/lib/research/verdictCeiling";
import { applyDocumentationNoOverride } from "@/lib/research/verdictNoOverride";
import type { TrackKey } from "@/lib/constants/tracks";
import type { TrackSignal, SynthesisOutput, EvidenceItem } from "@/lib/research/contracts";

const [caseId, attemptArg] = process.argv.slice(2);
if (!caseId) { console.error("usage: rejudge-case.ts <case_id> [attempt]"); process.exit(1); }

const EMPTY_SYNTH: SynthesisOutput = {
  module_1_normalized_evidence: [], module_2_claim_attributions: [], module_3_assertions: [],
  module_4_contradictions: [], module_5_hypotheses: { hypotheses: [], what_would_change_the_leader: "" },
  module_6_risk_gaps: [], module_7_doubt_calibration: { doubt_level: "minimal", doubt_focus: "", rationale: "rejudge" },
  module_8_vendor_questions: [],
  module_9_decision_snapshot: { headline: "", leading_interpretation: "", the_real_risk: "", what_to_verify: [], what_to_monitor: [] },
};

type Row = { track_key: string; track_number: number; attempt_number: number | null; track_verdict_signal: string | null; evidence_items: EvidenceItem[] | null };

async function main() {
  const { data, error } = await supabaseAdmin.from("case_track_results")
    .select("track_key, track_number, attempt_number, track_verdict_signal, evidence_items")
    .eq("case_id", caseId).is("deleted_at", null).order("track_number");
  if (error) { console.error(`read failed: ${error.message}`); process.exit(1); }
  const all = (data ?? []) as Row[];
  if (!all.length) { console.error("no track rows for this case"); process.exit(1); }

  const attempt = attemptArg ? Number(attemptArg) : Math.max(...all.map((r) => r.attempt_number ?? 1));
  const rows = all.filter((r) => (r.attempt_number ?? 1) === attempt && r.track_number >= 1 && r.track_number <= 4);
  console.log(`Re-judging case ${caseId} attempt ${attempt} (${rows.length} scoring tracks) — READ-ONLY\n`);

  const signals: Partial<Record<TrackKey, TrackSignal>> = {};
  let mismatches = 0;
  for (const r of rows) {
    const stored = r.track_verdict_signal as TrackSignal | null;
    if (stored === "n_a" || stored === null) {
      // n_a is a workflow state (skipped / could-not-research), not derivable from evidence — carry it.
      signals[r.track_key as TrackKey] = "n_a";
      console.log(`· ${r.track_key}: n_a (carried — not evidence-derived)`);
      continue;
    }
    // F4 (founder-approved 2026-07-14) — the SHARED re-derivation composition (dedupe → signal →
    // source-diversity cap), identical to what the pipeline stored. Re-composing the steps here
    // (pre-F4, without the cap) made this proof false-fail on any capped single-source pass.
    const items = r.evidence_items ?? [];
    const re = rederiveStoredSignal(r.track_key as TrackKey, items);
    signals[r.track_key as TrackKey] = re;
    const ok = re === stored;
    if (!ok) mismatches++;
    console.log(`${ok ? "✔" : "✘"} ${r.track_key}: stored=${stored} rejudged=${re} (${items.length} evidence items)`);
  }

  const { data: synth } = await supabaseAdmin.from("case_synthesis").select("contradictions")
    .eq("case_id", caseId).eq("attempt_number", attempt).is("deleted_at", null).maybeSingle();
  const contradictions = (synth?.contradictions as SynthesisOutput["module_4_contradictions"] | null) ?? [];
  const synthUsed = { ...EMPTY_SYNTH, module_4_contradictions: contradictions };
  // S-0 — the synthesis→verdict firewall applied HERE exactly as at the other sites: the
  // re-derived verdict consumes only certified synthesis, matching what the pipeline stored.
  const certified = certifySynthesisForVerdict(synthUsed);
  if (certified.audits.length > 0) console.log(`· certification audits: ${JSON.stringify(certified.audits)}`);
  const raw = computeVerdict(signals, certified.synthesis);
  // H3 — the ceiling AND the documentation no-override (founder-ruled 2026-07-12) are applied
  // HERE exactly as in stageVerdict and the admin viewModel (one shared fn each, three sites):
  // the re-derived verdict must equal what the pipeline stored.
  const noOverride = applyDocumentationNoOverride(raw, signals, certified.synthesis);
  const ceiled = applyVerdictCeiling({ verdict: noOverride.verdict }, signals);

  const { data: c } = await supabaseAdmin.from("cases").select("verdict, status, delivered_attempt").eq("id", caseId).maybeSingle();
  const verdictComparable = c?.delivered_attempt != null ? c.delivered_attempt === attempt : true;
  const verdictOk = !verdictComparable || c?.verdict === ceiled.verdict;
  const ceilNote = ceiled.ceiling_applied ? ` [ceiling: ${ceiled.original_verdict} → ${ceiled.verdict}]` : "";
  if (!verdictComparable) {
    console.log(`· verdict: rejudged=${ceiled.verdict}${ceilNote} — stored cases.verdict belongs to delivered attempt ${c?.delivered_attempt}, comparison skipped`);
  } else {
    console.log(`${verdictOk ? "✔" : "✘"} verdict: stored=${c?.verdict} rejudged=${ceiled.verdict}${ceilNote} (score ${raw.weighted_score.toFixed(2)}, vetoes: ${raw.veto_reasons.join("; ") || "none"})`);
  }

  const pass = mismatches === 0 && verdictOk;
  console.log(`\n${pass ? "PASS — the stored record fully determines the verdict." : `FAIL — ${mismatches} signal mismatch(es)${verdictOk ? "" : " + verdict mismatch"}.`}`);
  process.exit(pass ? 0 : 1);
}
main();
