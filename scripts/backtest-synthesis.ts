/**
 * A5 — THE SYNTHESIS BACKTEST (S-1f Step 2; becomes the standing change-control harness every
 * future prompt change must pass). Replays the WIRED module pipeline over every frozen attempt:
 * stored evidence in, SYNTHESIS CALLS ONLY, zero new acquisition (A5's ruled definition of
 * zero-API), memoization off (Q4(b) — the wired stage has no memo), NOTHING WRITTEN to the DB.
 *
 * Per attempt it reports: doubt_level under the LOUDLY-FLAGGED TEST_ONLY thresholds (the founder
 * rules real ones from this table), gap/cost inputs, the leading hypothesis, B′ agreement, cap
 * fires, audits — and the VERDICT CHECK: the frozen composition over stored signals + the wired
 * synthesis's certified module_4 vs the same composition over the STORED synthesis record
 * (the baseline). A verdict difference is STOP-THE-LINE, flagged loudly.
 *
 * Run (founder / S-1f):
 *   npx tsx --env-file=.env.local scripts/backtest-synthesis.ts            # DRY — plan + cost estimate
 *   npx tsx --env-file=.env.local scripts/backtest-synthesis.ts --run      # fire the synthesis calls
 */
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runSynthesis } from "@/lib/research/synthesisEngine";
import { SYNTHESIS_GAP_THRESHOLDS } from "@/lib/research/synthesisEngine";
import { certifySynthesisForVerdict } from "@/lib/research/synthesisFirewall";
import { computeVerdict } from "@/lib/research/verdictEngine";
import { applyDocumentationNoOverride } from "@/lib/research/verdictNoOverride";
import { applyVerdictCeiling } from "@/lib/research/verdictCeiling";
import type { TrackOutput, TrackSignal, SupplierIdentity, SynthesisOutput, EvidenceItem, Unknown, WeightValidation, QuestionToAsk, SourcingLogicOutput, Module4ContradictionRecord } from "@/lib/research/contracts";
import type { TrackKey } from "@/lib/constants/tracks";
import type { PlanType } from "@/lib/constants/plans";

const RUN = process.argv.includes("--run");
const CONCURRENCY = 5;

interface Row {
  case_id: string; attempt_number: number | null; track_key: TrackKey; track_number: number;
  track_verdict_signal: string | null; evidence_items: EvidenceItem[] | null; unknowns: Unknown[] | null;
  weight_validation: WeightValidation[] | null; questions_to_ask: QuestionToAsk[] | null;
  compiled_findings_json: Record<string, unknown> | null;
}
interface CaseRow {
  id: string; case_number: string | null; vendor_name: string | null; verdict: string | null;
  status: string | null; delivered_attempt: number | null; brands_submitted: string[] | null;
  plan_type: PlanType | null; supplier_identity: SupplierIdentity | null;
}

// Reconstruct a TrackOutput from its frozen row (b2b advisory metadata is not reconstructed —
// it feeds no axis; noted in the report).
function toOutput(r: Row): TrackOutput {
  const cf = r.compiled_findings_json ?? {};
  return {
    track_key: r.track_key,
    evidence_items: r.evidence_items ?? [],
    evidence_weights_applied: [],
    reasoning_notes: "",
    unknowns: r.unknowns ?? [],
    weight_validation: r.weight_validation ?? undefined,
    questions_to_ask: r.questions_to_ask ?? undefined,
    acquisition_failed: cf.acquisition_failed === true || undefined,
    llm_failed: cf.llm_failed === true || undefined,
    not_implemented: cf.not_implemented === true || undefined,
    nothing_to_review: cf.nothing_to_review === true || undefined,
    non_voting: cf.non_voting === true ? true : undefined,
    sourcing_logic: (cf.sourcing_logic as SourcingLogicOutput | null) ?? undefined,
  };
}

const compose = (signals: Partial<Record<TrackKey, TrackSignal>>, synthesis: SynthesisOutput): string => {
  const certified = certifySynthesisForVerdict(synthesis);
  const raw = computeVerdict(signals, certified.synthesis);
  const no = applyDocumentationNoOverride(raw, signals, certified.synthesis);
  return applyVerdictCeiling({ verdict: no.verdict }, signals).verdict;
};

const emptySynth = (m4: Module4ContradictionRecord[]): SynthesisOutput => ({
  module_1_normalized_evidence: [], module_2_claim_attributions: [], module_3_assertions: [],
  module_4_contradictions: m4, module_5_hypotheses: { hypotheses: [], what_would_change_the_leader: "" },
  module_6_risk_gaps: [], module_7_doubt_calibration: { doubt_level: "minimal", doubt_focus: "", rationale: "backtest" },
  module_8_vendor_questions: [], module_9_decision_snapshot: { headline: "", leading_interpretation: "", the_real_risk: "", what_to_verify: [], what_to_monitor: [] },
});

async function main() {
  const { data: cases, error: cErr } = await supabaseAdmin.from("cases")
    .select("id, case_number, vendor_name, verdict, status, delivered_attempt, brands_submitted, plan_type, supplier_identity");
  if (cErr) { console.error(cErr.message); process.exit(1); }
  const caseById = new Map((cases as CaseRow[]).map((c) => [c.id, c]));

  const { data: rows, error: tErr } = await supabaseAdmin.from("case_track_results")
    .select("case_id, attempt_number, track_key, track_number, track_verdict_signal, evidence_items, unknowns, weight_validation, questions_to_ask, compiled_findings_json")
    .is("deleted_at", null);
  if (tErr) { console.error(tErr.message); process.exit(1); }

  const { data: synthRows } = await supabaseAdmin.from("case_synthesis")
    .select("case_id, attempt_number, contradictions").is("deleted_at", null);
  const storedM4 = new Map((synthRows ?? []).map((s) => [`${s.case_id}#${s.attempt_number ?? 1}`, (s.contradictions ?? []) as Module4ContradictionRecord[]]));

  const byAttempt = new Map<string, Row[]>();
  for (const r of (rows as Row[])) {
    const key = `${r.case_id}#${r.attempt_number ?? 1}`;
    if (!byAttempt.has(key)) byAttempt.set(key, []);
    byAttempt.get(key)!.push(r);
  }
  const keys = [...byAttempt.keys()].filter((k) => byAttempt.get(k)!.some((r) => r.track_number >= 1 && r.track_number <= 5)).sort((a, b) => {
    const na = caseById.get(a.split("#")[0])?.case_number ?? ""; const nb = caseById.get(b.split("#")[0])?.case_number ?? "";
    return na === nb ? Number(a.split("#")[1]) - Number(b.split("#")[1]) : na.localeCompare(nb);
  });

  console.log(`Backtest plan: ${keys.length} frozen attempts × 4 synthesis calls (zero acquisition, zero writes).`);
  if (!RUN) { console.log("DRY — pass --run to fire the synthesis calls. Estimated cost ≈ attempts × 4 × ~$0.02–0.05."); return; }

  const results: Record<string, unknown>[] = [];
  let totalCost = 0;
  const flips: string[] = [];
  const queue = [...keys];
  const worker = async () => {
    for (;;) {
      const key = queue.shift();
      if (!key) return;
      const [caseId, attemptStr] = key.split("#");
      const c = caseById.get(caseId);
      const trs = byAttempt.get(key)!.filter((r) => r.track_number >= 1 && r.track_number <= 5);
      const outputs = trs.map(toOutput);
      const signals: Partial<Record<TrackKey, TrackSignal>> = {};
      for (const r of trs) signals[r.track_key] = (r.track_verdict_signal ?? "n_a") as TrackSignal;
      const label = `${c?.case_number ?? caseId.slice(0, 8)}#${attemptStr}`;
      try {
        const { synthesis, artifacts } = await runSynthesis({
          trackOutputs: outputs,
          identity: c?.supplier_identity ?? null,
          roster: c?.brands_submitted ?? [],
          planType: (c?.plan_type ?? "scale_499") as PlanType,
          signals,
          // S-1f Step 4: the harness now measures the PRODUCT thresholds (the founder's ruling,
          // 3/8/13). HISTORICAL NOTE, so the delivered table stays interpretable: the 66-attempt
          // backtest of 2026-07-19 (docs/superpowers/plans/2026-07-19-a5-backtest.md) was produced
          // under the TEST_ONLY stand-in 1/3/6 — re-running now yields a DIFFERENT distribution by
          // design. Reproduce that table from the commit, not from this harness.
          gapThresholds: SYNTHESIS_GAP_THRESHOLDS,
        });
        const baseline = compose(signals, emptySynth(storedM4.get(key) ?? []));
        const wired = compose(signals, synthesis);
        if (wired !== baseline) flips.push(`${label}: ${baseline} → ${wired}`);
        const d = synthesis.module_7_doubt_calibration;
        const leading = (synthesis.module_5_hypotheses.hypotheses as { label?: string; likelihood?: string }[]).find((h) => h.likelihood === "leading");
        const capFires = artifacts.audits.filter((a) => a.module === "m4").length;
        totalCost += artifacts.cost_usd;
        results.push({
          label, vendor: c?.vendor_name ?? "?",
          stored_verdict: c ? `${c.verdict ?? "—"}${c.delivered_attempt !== null ? (Number(attemptStr) === c.delivered_attempt ? " (delivered)" : "") : (Number(attemptStr) === Math.max(...[...byAttempt.keys()].filter((k) => k.startsWith(caseId)).map((k) => Number(k.split("#")[1]))) ? " (live ptr)" : "")}` : "?",
          doubt_level: d.doubt_level,
          gap: d.gap_inputs ? `${d.gap_inputs.unresolved_assertions}u+${d.gap_inputs.stored_unknowns}k=${d.gap_inputs.gap_level}` : "—",
          cost: d.cost_inputs ? `${d.cost_inputs.enforcement_posture_signals.length}s/${d.cost_inputs.veto_grade_keys_present.length}v/${d.cost_inputs.brands_at_issue}b=${d.cost_inputs.cost_level}` : "—",
          leading: leading?.label ?? "(none)",
          b_prime: artifacts.refuter.parse_failed ? "failed" : artifacts.refuter.agreed ? "agree" : "DISAGREE",
          cap_fires: capFires, audits: artifacts.audits.length,
          parse: Object.entries(artifacts.parse_failures).filter(([, v]) => v).map(([k]) => k).join(",") || "ok",
          verdict_check: wired === baseline ? "same" : `FLIP ${baseline}→${wired}`,
          cost_usd: artifacts.cost_usd,
        });
        console.log(`done ${label} (${results.length}/${keys.length})`);
      } catch (e) {
        results.push({ label, vendor: c?.vendor_name ?? "?", error: e instanceof Error ? e.message : String(e) });
        console.log(`ERROR ${label}: ${e instanceof Error ? e.message : e}`);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  results.sort((a, b) => String(a.label).localeCompare(String(b.label)));
  console.log("\n=== A5 BACKTEST TABLE (doubt levels under TEST_ONLY thresholds — NOT calibrated values) ===");
  console.log("| attempt | vendor | stored verdict | doubt | gap (u+k=level) | cost (s/v/b=level) | leading | B′ | cap | audits | parse | verdict check |");
  console.log("|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const r of results) {
    if (r.error) { console.log(`| ${r.label} | ${r.vendor} | ERROR: ${r.error} |`); continue; }
    console.log(`| ${r.label} | ${r.vendor} | ${r.stored_verdict} | ${r.doubt_level} | ${r.gap} | ${r.cost} | ${r.leading} | ${r.b_prime} | ${r.cap_fires} | ${r.audits} | ${r.parse} | ${r.verdict_check} |`);
  }
  const dist = new Map<string, number>();
  for (const r of results) if (!r.error) dist.set(String(r.doubt_level), (dist.get(String(r.doubt_level)) ?? 0) + 1);
  console.log(`\nDISTRIBUTION (TEST_ONLY thresholds): ${[...dist.entries()].map(([k, v]) => `${k}=${v}`).join(" · ")}`);
  console.log(`B′ agreement: agree=${results.filter((r) => r.b_prime === "agree").length} · disagree=${results.filter((r) => r.b_prime === "DISAGREE").length} · failed=${results.filter((r) => r.b_prime === "failed").length}`);
  console.log(`Total synthesis cost: $${totalCost.toFixed(2)} across ${results.filter((r) => !r.error).length} attempts (AT-SYN-COST datum).`);
  if (flips.length) {
    console.log(`\n⛔ STOP-THE-LINE — VERDICT DIVERGENCE (${flips.length}):`);
    for (const f of flips) console.log(`  ${f}`);
  } else {
    console.log("\n✔ ZERO verdict divergence: every attempt composes to the same verdict as its stored record's baseline.");
  }
  console.log("READ-ONLY on the DB — nothing written.");
}
main();
