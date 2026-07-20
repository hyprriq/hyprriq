import type {
  TrackOutput, SupplierIdentity, SynthesisOutput, DimensionRunEntry, DimensionRunCause,
  Verdict, TrackSignal, SchemaFallbackRecord, M1RecordExtension,
} from "@/lib/research/contracts";
import type { TrackKey } from "@/lib/constants/tracks";
import type { PlanType } from "@/lib/constants/plans";
import { TRACK_REGISTRY } from "@/lib/research/pipeline.registry";
import { assembleM1Record, type M1TrackInput } from "@/lib/research/m1Assembler";
import { runCallA, type CallAModelFn } from "@/lib/research/synthesisCallA";
import { runCallB, runCallBRefuter, type CallBModelFn, type RefuterResult, type DimensionLimitation, type CallBAudit } from "@/lib/research/synthesisCallB";
import { runCallC, type CallCModelFn, type CallCAudit } from "@/lib/research/synthesisCallC";
import type { CallAAudit } from "@/lib/research/synthesisCallA";
import type { GapThresholds } from "@/lib/research/doubtMatrix";
import { deriveWatchConditions } from "@/lib/research/watchConditions";
import { certifySynthesisForVerdict } from "@/lib/research/synthesisFirewall";
import { computeVerdict } from "@/lib/research/verdictEngine";
import { applyDocumentationNoOverride } from "@/lib/research/verdictNoOverride";
import { applyVerdictCeiling } from "@/lib/research/verdictCeiling";

// ── S-1f (Step 1) — THE WIRED ENGINE. The six-sitting stub retires: M1 assembler → Call A →
// Call B + B′ → Call C, each certified/validated in CODE before the next consumes it (the ruled
// four-call staging, SO-S1-2). The verdict-preview for M9's sentence is computed via the FROZEN
// composition (certify → computeVerdict → no-override → ceiling) over the same signals the
// pipeline's stageVerdict will use — deterministic, so the preview and the stored verdict can
// never disagree (the three-site-agreement property extended to the narrative). Memoization is
// DISABLED (Q4(b)) — the caller no longer consults the evidence-hash memo. ──

// PROPOSED admin-side literals — exact CLIENT strings are founder-ruled at the client-surface/PDF
// gate (the standing client-copy bar). Injected byte-identically at every doubt level (the
// founder's law; code-injected, never model-written).
export const VERDICT_SENTENCES: Record<Verdict, string> = {
  source_clear: "Verdict: Source Clear.",
  usable_with_conditions: "Verdict: Usable With Conditions.",
  verify_before_purchase: "Verdict: Verify Before Purchase.",
  do_not_rely: "Verdict: Do Not Rely.",
};

// THE GAP-THRESHOLD RULING — founder, 2026-07-19 (STOP #1), read off the A5 backtest's 66-attempt
// distribution. PROVISIONAL-PENDING-G4: G4 owns retuning, on the two recorded entry conditions
// (the k-term noise dominance in this axis; the degenerate cost axis). These values are the
// founder's authorship, like the matrix cells — no threshold tuning to force a result, ever.
// The INTERIM TEST_ONLY stand-in (1/3/6) that carried Steps 1–3 is retired here.
export const SYNTHESIS_GAP_THRESHOLDS: GapThresholds = { narrow: 3, material: 8, wide: 13 };

export interface SynthesisModels { callA?: CallAModelFn; callB?: CallBModelFn; callBRefuter?: CallBModelFn; callC?: CallCModelFn }

export interface SynthesisRunInput {
  trackOutputs: TrackOutput[];
  identity: SupplierIdentity | null;
  roster: string[];
  planType: PlanType;
  signals: Partial<Record<TrackKey, TrackSignal>>;
  gapThresholds?: GapThresholds;
  models?: SynthesisModels;
}

export interface SynthesisArtifacts {
  refuter: RefuterResult;
  limitations: DimensionLimitation[];
  audits: (CallAAudit | CallBAudit | CallCAudit)[];
  parse_failures: { call_a: boolean; call_b: boolean; call_b_refuter: boolean; call_c: boolean };
  cost_usd: number;
}

// The deterministic CASE-level execution record (ruled 2026-07-17): plan_excluded from the
// registry (the orchestrator omits excluded tracks — row absent is the plan's word); the other
// causes are the stored H3 flags, VERBATIM. The cause selects the client sentence's law
// (B3 / H2 / OQ-A3) downstream — never collapsed.
export function deriveDimensionRunRecord(planType: PlanType, trackOutputs: TrackOutput[]): DimensionRunEntry[] {
  const byKey = new Map(trackOutputs.map((o) => [o.track_key, o]));
  return TRACK_REGISTRY.filter((t) => t.track_key !== "intake_scope_guard").map((t): DimensionRunEntry => {
    if (!t.plan_gates.includes(planType)) return { dimension: t.track_key, state: "not_assessed", cause: "plan_excluded" };
    const out = byKey.get(t.track_key);
    const cause: DimensionRunCause | null =
      !out ? "plan_excluded"
      : out.not_implemented ? "not_implemented"
      : out.nothing_to_review ? "nothing_to_review"
      : out.acquisition_failed ? "acquisition_failed"
      : out.llm_failed ? "llm_failed"
      : null;
    return cause === null
      ? { dimension: t.track_key, state: "assessed", cause: null }
      : { dimension: t.track_key, state: "not_assessed", cause };
  });
}

export async function runSynthesis(input: SynthesisRunInput): Promise<{ synthesis: SynthesisOutput; artifacts: SynthesisArtifacts }> {
  const thresholds = input.gapThresholds ?? SYNTHESIS_GAP_THRESHOLDS;

  // M1 — deterministic assembly (the hash anchor + the widened extension, beside it — Q3).
  const m1Inputs: M1TrackInput[] = input.trackOutputs.map((output) => ({ output }));
  const record = assembleM1Record(m1Inputs, input.identity);
  const dimensionRunRecord = deriveDimensionRunRecord(input.planType, input.trackOutputs);
  const track5Records = input.trackOutputs.find((o) => o.track_key === "sourcing_logic")?.sourcing_logic?.contradictions ?? [];
  const trackQuestions = input.trackOutputs.flatMap((o) => (o.questions_to_ask ?? []).map((q) => q.question));

  // CALL A — M2 + M3, code-certified (firewall-wins, pairing, dangling drops, the roster lock).
  const a = await runCallA({ record, roster: input.roster, model: input.models?.callA });

  // CALL B — M4 + M5 + M6, code-certified (the OQ-S5 cap, one-leading, B3/financial filters).
  const b = await runCallB({
    record, assertions: a.assertions, track5Records, dimensionRunRecord, model: input.models?.callB,
  });

  // CALL B′ — the A3 refuter; advisory only, never a verdict input.
  const refuter = await runCallBRefuter({
    record, hypotheses: b.hypotheses, contradictions: b.contradictions, model: input.models?.callBRefuter,
  });

  // VERDICT PREVIEW for M9's sentence — the FROZEN composition over the same inputs stageVerdict
  // will use. Deterministic: preview and stored verdict cannot disagree.
  const provisional: SynthesisOutput = {
    module_1_normalized_evidence: record.accepted.items,
    module_2_claim_attributions: a.attributions,
    module_3_assertions: a.assertions,
    module_4_contradictions: b.contradictions,
    module_5_hypotheses: b.hypotheses,
    module_6_risk_gaps: b.gaps,
    module_7_doubt_calibration: { doubt_level: "minimal", doubt_focus: "", rationale: "preview" },
    module_8_vendor_questions: [],
    module_9_decision_snapshot: { headline: "", leading_interpretation: "", the_real_risk: "", what_to_verify: [], what_to_monitor: [] },
  };
  const certified = certifySynthesisForVerdict(provisional);
  const raw = computeVerdict(input.signals, certified.synthesis);
  const noOverride = applyDocumentationNoOverride(raw, input.signals, certified.synthesis);
  const previewVerdict = applyVerdictCeiling({ verdict: noOverride.verdict }, input.signals).verdict;

  // CALL C — M7 + M8 + M9 + brand_evidence_status (the matrix owns doubt_level; the shapes own M9).
  const c = await runCallC({
    record, assertions: a.assertions, hypotheses: b.hypotheses, gaps: b.gaps, limitations: b.limitations,
    trackQuestions, roster: input.roster, verdictSentence: VERDICT_SENTENCES[previewVerdict],
    gapThresholds: thresholds, model: input.models?.callC,
  });

  const extension: M1RecordExtension = record.extension;

  // A6 (S-1f Step 3) — the watch-condition record: written HERE, at synthesis time, because it
  // cannot be backfilled (G006's law). Deterministic projection of M5; rides the hypotheses jsonb.
  const hypothesesWithWatch = { ...b.hypotheses, watch_conditions: deriveWatchConditions(b.hypotheses) };

  const synthesis: SynthesisOutput = {
    module_1_normalized_evidence: record.accepted.items,
    module_2_claim_attributions: a.attributions,
    module_3_assertions: a.assertions,
    module_4_contradictions: b.contradictions,
    module_5_hypotheses: hypothesesWithWatch,
    module_6_risk_gaps: b.gaps,
    module_7_doubt_calibration: c.doubt,
    module_8_vendor_questions: c.questions,
    module_9_decision_snapshot: c.snapshot,
    module_1_extension: extension,
    brand_evidence_status: c.brand_evidence_status,
    dimension_run_record: dimensionRunRecord,
    schema_fallbacks: {
      call_a: a.schema_fallback, call_b: b.schema_fallback,
      call_b_refuter: refuter.schema_fallback, call_c: c.schema_fallback,
    } satisfies SchemaFallbackRecord,
  };

  return {
    synthesis,
    artifacts: {
      refuter,
      limitations: b.limitations,
      audits: [...a.audits, ...b.audits, ...c.audits],
      parse_failures: { call_a: a.parse_failed, call_b: b.parse_failed, call_b_refuter: refuter.parse_failed, call_c: c.parse_failed },
      cost_usd: a.cost_usd + b.cost_usd + refuter.cost_usd + c.cost_usd,
    },
  };
}
