import fs from "node:fs";
import path from "node:path";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stageVerdict } from "@/lib/research/pipeline.steps";
import type { TrackKey } from "@/lib/constants/tracks";
import type { TrackSignal, SynthesisOutput } from "@/lib/research/contracts";

// ── GOLDEN-CASE FREEZE (founder-locked 2026-08-22, item 3) ───────────────────────────────────
// Freezes each case's VERDICT INPUTS (per-track signals + the structured contradictions) and its
// verdict, so every deploy can replay the real engine chain and fail if a known case moves.
//
// ⛔ THE FREEZE VALIDATES ITSELF. A fixture is only written if replaying stageVerdict() on the
// frozen inputs reproduces the verdict stored on the case row. That proves the frozen subset is
// SUFFICIENT — if the verdict path ever read a field this does not capture, the replay would
// disagree here and the case would be refused rather than baked in wrong.
//
// Read-only. No engine change, no LLM call, no cost: stageVerdict is pure.

async function main() {
  const { data: rows } = await supabaseAdmin
    .from("cases")
    .select("id, case_number, status, verdict, plan_type, vendor_name, delivered_attempt")
    .is("deleted_at", null).not("verdict", "is", null).order("case_number");

  const fixtures: unknown[] = [];
  const mismatches: string[] = [];
  const skipped: string[] = [];

  for (const c of rows ?? []) {
    // ⚠ ATTEMPT PAIRING IS THE WHOLE INSTRUMENT (corrected 2026-08-22 after it lied twice).
    // A replay is only meaningful if the track signals and the contradictions come from the SAME
    // attempt. The first draft did not enforce that and produced two false "drift" reports:
    // AWI-2606-001 (delivered attempt 1, but synthesis exists only for attempt 2) got attempt-1
    // signals paired with attempt-2 contradictions; AWI-2606-012 (no delivered attempt) pulled
    // the track rows of SEVEN attempts at once and let the signal map be overwritten at random.
    // Mixed inputs cannot be a baseline. Pick ONE attempt that has both, or skip the case.
    const { data: tAll } = await supabaseAdmin
      .from("case_track_results").select("attempt_number").eq("case_id", c.id);
    const { data: sAll } = await supabaseAdmin
      .from("case_synthesis").select("attempt_number").eq("case_id", c.id).is("deleted_at", null);
    const tSet = new Set((tAll ?? []).map((r) => (r as { attempt_number: number | null }).attempt_number ?? 1));
    const sSet = new Set((sAll ?? []).map((r) => (r as { attempt_number: number | null }).attempt_number ?? 1));
    const both = [...tSet].filter((a) => sSet.has(a)).sort((a, b) => b - a);
    const delivered = c.delivered_attempt ?? null;
    const attempt = delivered != null && both.includes(delivered) ? delivered : both[0];
    if (attempt === undefined) { skipped.push(`${c.case_number}: no attempt has BOTH track rows and synthesis`); continue; }
    if (delivered != null && attempt !== delivered) {
      skipped.push(`${c.case_number}: delivered attempt ${delivered} has no synthesis — refusing to pair it with attempt ${attempt}`);
      continue;
    }

    const { data: srows } = await supabaseAdmin.from("case_synthesis")
      .select("attempt_number, contradictions").eq("case_id", c.id).is("deleted_at", null)
      .eq("attempt_number", attempt);
    const srow = (srows ?? [])[0] as { contradictions?: unknown } | undefined;
    if (!srow) { skipped.push(`${c.case_number}: no synthesis row`); continue; }

    const { data: trows } = await supabaseAdmin.from("case_track_results")
      .select("track_number, track_key, track_verdict_signal, attempt_number")
      .eq("case_id", c.id).eq("attempt_number", attempt);
    const useRows = (trows ?? []).filter((r) => (r as { track_number: number }).track_number >= 1);
    if (useRows.length === 0) { skipped.push(`${c.case_number}: no track rows`); continue; }

    const signals: Partial<Record<TrackKey, TrackSignal>> = {};
    for (const r of useRows as { track_key: string; track_verdict_signal: TrackSignal | null }[]) {
      if (r.track_verdict_signal) signals[r.track_key as TrackKey] = r.track_verdict_signal;
    }
    // module_4 is persisted in its own column (case_synthesis.contradictions).
    const contradictions = (Array.isArray(srow.contradictions) ? srow.contradictions : []) as SynthesisOutput["module_4_contradictions"];

    // The frozen synthesis: ONLY what the verdict path consumes (certifySynthesisForVerdict
    // rebuilds its input from module_4 and empties everything else — verified in source).
    const frozenSynthesis = {
      module_1_normalized_evidence: [], module_2_claim_attributions: [], module_3_assertions: [],
      module_4_contradictions: contradictions,
      module_5_coverage: [], module_6_conflicts: [], module_7_doubt_focus: null,
      module_8_vendor_questions: [], module_9_headline: null,
    } as unknown as SynthesisOutput;

    let replayed: string;
    try {
      replayed = stageVerdict(signals, frozenSynthesis as never).verdict;
    } catch (e) {
      skipped.push(`${c.case_number}: replay threw — ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    // THE BASELINE IS TODAY'S REPLAY, not the historical stored verdict. A regression suite must
    // detect FUTURE movement; three cases were decided by older pipelines (null / 1.3.0 / 1.7.0
    // against today's 1.8.0) and today's engine legitimately disagrees with them. Freezing the
    // stored verdict there would encode a verdict the current engine does not produce and fail
    // on day one for the wrong reason. The divergence is RECORDED per case, never hidden.
    if (replayed !== c.verdict) mismatches.push(`${c.case_number}: stored=${c.verdict} replayed=${replayed} (status=${c.status})`);

    fixtures.push({
      case_number: c.case_number,
      status: c.status,
      plan_type: c.plan_type,
      expected_verdict: replayed,
      stored_verdict: c.verdict,
      diverges_from_stored: replayed !== c.verdict,
      signals,
      attempt,
      contradiction_count: contradictions.length,
      module_4_contradictions: contradictions,
    });
  }

  const out = path.resolve(__dirname, "..", "lib/research/__fixtures__/goldenCases.json");
  fs.writeFileSync(out, JSON.stringify({
    generated_note: "Frozen verdict inputs + expected verdicts. Regenerate ONLY with an explicit founder ruling: scripts/golden-cases-freeze.ts",
    cases: fixtures,
  }, null, 2) + "\n");

  console.log(`frozen:    ${fixtures.length}`);
  console.log(`mismatch:  ${mismatches.length}`);
  for (const m of mismatches) console.log(`   ⚠ ${m}`);
  console.log(`skipped:   ${skipped.length}`);
  for (const s of skipped.slice(0, 12)) console.log(`   · ${s}`);
  const byV: Record<string, number> = {};
  for (const f of fixtures as { expected_verdict: string }[]) byV[f.expected_verdict] = (byV[f.expected_verdict] ?? 0) + 1;
  console.log(`by verdict:`, byV);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
