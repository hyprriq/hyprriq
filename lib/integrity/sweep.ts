import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getClientDecisionSnapshot } from "@/lib/data/synthesis";
import { projectClientReport } from "@/lib/portal/clientReport";
import { getCaseTrackResults } from "@/lib/data/track-results";
import { buildClientFindings } from "@/lib/admin/reviewView";
import { findInternalTokens } from "@/lib/portal/clientTokenCheckpoint";
import { INTERNAL_CONTENT_PATTERNS } from "@/lib/integrity/checks";
import { deepStrings } from "@/lib/portal/deepStrings";
import { stageVerdict } from "@/lib/research/pipeline.steps";
import type { TrackKey } from "@/lib/constants/tracks";
import type { TrackSignal, SynthesisOutput } from "@/lib/research/contracts";

// ── THE CORPUS SWEEP (founder-locked 2026-08-22) — the ALERT half of the standing checks.
//
// Runs every corpus-wide check over every case and returns a structured result. IT DECIDES
// NOTHING about alerting: the caller diffs against the previous run and pages only on findings
// that are NEW (founder ruling 3a — an alarm that fires daily for the same thing is an alarm
// that gets ignored).
//
// COST: zero external spend. No LLM, no Serper, no WHOIS. It reads rows already in Postgres and
// replays PURE functions (the client projection, stageVerdict). The only cost is DB reads.

export interface SweepFinding {
  /** Stable across runs — the dedup key. A finding is "new" if this key was absent last run. */
  key: string;
  case_number: string;
  detail: string;
}

export interface SweepCheckResult {
  checkId: string;
  findings: SweepFinding[];
  casesScanned: number;
  /** Cases the check could not evaluate, and why. Never silently counted as clean. */
  notEvaluated: string[];
}

export interface SweepResult {
  ran_at: string;
  cases_total: number;
  checks: SweepCheckResult[];
}

const EMPTY_SYNTH = {
  module_1_normalized_evidence: [], module_2_claim_attributions: [], module_3_assertions: [],
  module_5_coverage: [], module_6_conflicts: [], module_7_doubt_focus: null,
  module_8_vendor_questions: [], module_9_headline: null,
};

export async function runIntegritySweep(): Promise<SweepResult> {
  const { data: cases } = await supabaseAdmin
    .from("cases")
    .select("id, case_number, status, verdict, delivered_attempt")
    .is("deleted_at", null)
    .order("case_number");
  const all = (cases ?? []) as {
    id: string; case_number: string; status: string; verdict: string | null; delivered_attempt: number | null;
  }[];

  const markers: SweepFinding[] = [];
  const content: SweepFinding[] = [];
  const divergence: SweepFinding[] = [];
  const noVerdict: SweepFinding[] = [];
  const payloadSkips: string[] = [];
  const divergenceSkips: string[] = [];

  for (const c of all) {
    const delivered = c.status === "delivered" || c.status === "complete";
    const onDelivered = delivered ? " — ON A DELIVERED REPORT" : "";

    if (delivered && !c.verdict) {
      noVerdict.push({
        key: `no_verdict:${c.case_number}`,
        case_number: c.case_number,
        detail: "Delivered with no verdict on the case row.",
      });
    }

    // ── the two client-payload checks, over the REAL projection ──────────────────────────────
    const snap = await getClientDecisionSnapshot(c.id);
    if (!snap) payloadSkips.push(`${c.case_number}: no decision snapshot to project`);
    const report = projectClientReport(
      (snap?.decision_snapshot ?? null) as Record<string, unknown> | null,
      snap?.vendor_questions as never,
      [],
      { allowInternalTokens: true },
    );

    let findingRows: unknown[] = [];
    try {
      findingRows = buildClientFindings(
        await getCaseTrackResults(c.id, c.delivered_attempt ?? undefined),
        { allowInternalTokens: true },
      ) as unknown[];
    } catch {
      payloadSkips.push(`${c.case_number}: findings could not be projected`);
    }

    // ONLY the fields a client actually reads.
    const clientPayload = {
      report,
      findings: (findingRows as { client_summary?: unknown; questions_to_ask?: unknown }[]).map((f) => ({
        client_summary: f?.client_summary,
        questions_to_ask: f?.questions_to_ask,
      })),
    };

    for (const leak of findInternalTokens(clientPayload)) {
      markers.push({
        key: `marker:${c.case_number}:${leak.token}:${leak.match}:${leak.path}`,
        case_number: c.case_number,
        detail: `${leak.token} "${leak.match}" at ${leak.path}${onDelivered}`,
      });
    }

    for (const { path, value } of deepStrings(clientPayload)) {
      for (const { name, re } of INTERNAL_CONTENT_PATTERNS) {
        const m = value.match(new RegExp(re.source, re.flags.replace("g", "")));
        if (m) {
          content.push({
            key: `content:${c.case_number}:${name}:${m[0]}:${path}`,
            case_number: c.case_number,
            detail: `${name} "${m[0]}" at ${path}${onDelivered}`,
          });
        }
      }
    }

    // ── verdict replay divergence (delivered cases only) ─────────────────────────────────────
    if (!delivered || !c.verdict) continue;
    const attempt = c.delivered_attempt;
    if (attempt == null) {
      divergenceSkips.push(`${c.case_number}: no delivered_attempt to pin`);
      continue;
    }
    const { data: srows } = await supabaseAdmin
      .from("case_synthesis").select("contradictions")
      .eq("case_id", c.id).is("deleted_at", null).eq("attempt_number", attempt);
    const srow = (srows ?? [])[0] as { contradictions?: unknown } | undefined;
    const { data: trows } = await supabaseAdmin
      .from("case_track_results").select("track_key, track_verdict_signal, track_number")
      .eq("case_id", c.id).eq("attempt_number", attempt);

    // ⚠ SAME-ATTEMPT PAIRING OR NOTHING. Mixing attempts produced two FALSE drift reports when
    // the golden-case generator was first written. A case that cannot be paired is NOT clean —
    // it is unevaluated, and it says so.
    if (!srow || !(trows ?? []).length) {
      divergenceSkips.push(`${c.case_number}: delivered attempt ${attempt} has no paired synthesis/track rows`);
      continue;
    }

    const signals: Partial<Record<TrackKey, TrackSignal>> = {};
    for (const r of (trows ?? []) as { track_key: string; track_verdict_signal: TrackSignal | null; track_number: number }[]) {
      if (r.track_number >= 1 && r.track_verdict_signal) signals[r.track_key as TrackKey] = r.track_verdict_signal;
    }

    try {
      const synthesis = { ...EMPTY_SYNTH, module_4_contradictions: srow.contradictions ?? [] } as unknown as SynthesisOutput;
      const replayed = stageVerdict(signals, synthesis as never).verdict;
      if (replayed !== c.verdict) {
        divergence.push({
          key: `divergence:${c.case_number}:${c.verdict}->${replayed}`,
          case_number: c.case_number,
          detail: `Delivered as ${c.verdict}; today's engine replays ${replayed} from the same frozen inputs (attempt ${attempt}).`,
        });
      }
    } catch (e) {
      divergenceSkips.push(`${c.case_number}: replay threw — ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const deliveredCount = all.filter((c) => c.status === "delivered" || c.status === "complete").length;

  return {
    ran_at: new Date().toISOString(),
    cases_total: all.length,
    checks: [
      { checkId: "internal_markers", findings: markers, casesScanned: all.length, notEvaluated: payloadSkips },
      { checkId: "internal_content", findings: content, casesScanned: all.length, notEvaluated: payloadSkips },
      { checkId: "verdict_replay_divergence", findings: divergence, casesScanned: deliveredCount, notEvaluated: divergenceSkips },
      { checkId: "delivered_without_verdict", findings: noVerdict, casesScanned: all.length, notEvaluated: [] },
    ],
  };
}
