import type {
  WidenedM1Record, SynthesisAssertion, HypothesisSet, RiskGap, Module4ContradictionRecord,
  SourcingContradictionRecord, DimensionRunEntry, DimensionRunCause,
} from "@/lib/research/contracts";
import type { TrackKey } from "@/lib/constants/tracks";
import {
  buildCallBPrompt, buildRefuterPrompt, parseCallBOutput, CALL_B_OUTPUT_SCHEMA,
  type RawM4RecordParsed, type RawM5Hypothesis, type RawM6Gap,
} from "@/lib/research/synthesisCallB.prompt";
import { runModel } from "@/lib/ai/runModel";

// ── S-1d — Call B (M4+M5+M6) + Call B′ (the A3 refuter). LLM proposes; CODE decides:
// - THE OQ-S5 CAP (the sitting's conscience): contradictions sourced from vendor-supplied
//   documents — artifacts of ONE ACT OF CLAIMING, the corrected principle — contribute AT MOST
//   ONE load-bearing record toward the ≥2 floor. A record is DOCUMENT-SOURCED iff BOTH sides'
//   evidence_ids are non-empty and resolve to M1 items whose claimant is "vendor". The vendor's
//   WEBSITE is a separate act: web-vs-document contradictions MUST still floor (two-sided ATs).
//   The cap lives HERE, before certification consumes the set — frozen S-0 untouched.
// - M5: exactly one leading, ≤3, always a commitment (A4's tiebreak is a HELD ruling — not built).
// - M6: B3's law (plan-excluded ⇒ limitation, never material), the cause→law mapping
//   (B3 / H2 / OQ-A3), and the financial-scope law (the Morendelli air-freight pattern).
// - B′: code compares the two leading-hypothesis commitments — advisory only, never a verdict input. ──

export type RawM4Record = RawM4RecordParsed;
export interface CallBAudit { module: "m4" | "m5" | "m6"; id: string; field: string; from: string; to: string; reason: string }
export interface DimensionLimitation { dimension: TrackKey; cause: DimensionRunCause; law: "B3" | "H2" | "OQ-A3" }

export type CallBModelFn = (input: { task: "synthesis"; system: string; user: string; temperature: number; schema: object }) =>
  Promise<{ json: unknown; schema_fallback?: boolean; cost_usd: number }>;

export interface CallBResult {
  contradictions: Module4ContradictionRecord[];
  hypotheses: HypothesisSet;
  gaps: RiskGap[];
  limitations: DimensionLimitation[];
  what_would_change_the_leader: string;
  audits: CallBAudit[];
  schema_fallback: boolean; // R2 — the call_b flag (frozen field name)
  parse_failed: boolean;
  cost_usd: number;
}

export interface RefuterResult {
  conviction: "high" | "degraded";
  agreed: boolean;
  refuter_leader: string | null;
  admin_flag: boolean;
  schema_fallback: boolean; // R2 — the call_b_refuter flag (frozen field name)
  parse_failed: boolean;
  cost_usd: number;
}

export function certifyM4(
  raw: RawM4Record[],
  track5Records: SourcingContradictionRecord[],
  record: WidenedM1Record,
): { contradictions: Module4ContradictionRecord[]; audits: CallBAudit[] } {
  const audits: CallBAudit[] = [];
  const claimantById = new Map(record.accepted.items.map((i) => [i.evidence_id, i.claimant]));

  const merged: Module4ContradictionRecord[] = [
    ...raw.map((r): Module4ContradictionRecord => ({
      is_load_bearing: r.is_load_bearing,
      risk_level: r.risk_level,
      origin: "synthesis",
      contradiction_type: r.contradiction_type,
      assertion_a: r.assertion_a,
      assertion_b: r.assertion_b,
      interpretation: r.interpretation,
    })),
    // Track 5's writer stays m4c-1.0.0; the reader merges with the additive origin (m4c-1.1.0).
    ...track5Records.map((t): Module4ContradictionRecord => ({
      is_load_bearing: t.is_load_bearing,
      risk_level: t.risk_level,
      origin: "track5_m4c",
      contradiction_type: t.contradiction_type,
      assertion_a: t.assertion_a,
      assertion_b: t.assertion_b,
      interpretation: t.interpretation,
    })),
  ];

  // THE OQ-S5 CAP — vendor-document-class granularity. A side is document-sourced iff it cites
  // ≥1 id and EVERY cited id resolves to an M1 item whose claimant is "vendor" (the code literal
  // written only by track4 — enforced by the claimant-literal source-scan lock).
  const docSide = (side: Module4ContradictionRecord["assertion_a"]): boolean => {
    const ids = side?.evidence_ids ?? [];
    return ids.length > 0 && ids.every((id) => claimantById.get(id) === "vendor");
  };
  let docLoadBearingSeen = false;
  const contradictions = merged.map((c, i) => {
    if (!c.is_load_bearing || !docSide(c.assertion_a) || !docSide(c.assertion_b)) return c;
    if (!docLoadBearingSeen) { docLoadBearingSeen = true; return c; } // the first stays as judged
    audits.push({
      module: "m4", id: c.contradiction_type ?? String(i), field: "is_load_bearing", from: "true", to: "false",
      reason: "OQ-S5 cap: document-sourced contradictions are artifacts of one act of claiming — at most ONE contributes to the load-bearing floor",
    });
    return { ...c, is_load_bearing: false };
  });

  return { contradictions, audits };
}

export function certifyM5(raw: RawM5Hypothesis[], whatWouldChange: string): { hypotheses: HypothesisSet; audits: CallBAudit[] } {
  const audits: CallBAudit[] = [];
  let list = [...raw];
  if (list.length > 3) {
    audits.push({ module: "m5", id: list[3].label, field: "hypotheses", from: String(list.length), to: "3", reason: "hypothesis set truncated to 3 (code rule)" });
    list = list.slice(0, 3);
  }
  const leadings = list.filter((h) => h.likelihood === "leading");
  if (leadings.length === 0 && list.length > 0) {
    audits.push({ module: "m5", id: list[0].label, field: "likelihood", from: "alternative", to: "leading", reason: "M5 must commit — first hypothesis promoted to leading (code rule)" });
    list = list.map((h, i) => (i === 0 ? { ...h, likelihood: "leading" as const } : h));
  } else if (leadings.length > 1) {
    let seen = false;
    list = list.map((h) => {
      if (h.likelihood !== "leading") return h;
      if (!seen) { seen = true; return h; }
      audits.push({ module: "m5", id: h.label, field: "likelihood", from: "leading", to: "alternative", reason: "exactly one leading (code rule) — later leadings demoted" });
      return { ...h, likelihood: "alternative" as const };
    });
  }
  return { hypotheses: { hypotheses: list, what_would_change_the_leader: whatWouldChange }, audits };
}

// B3 detection: deterministic token map per dimension — a gap that names a not-assessed
// dimension can only be a stated limitation, never material. Crude by design (code, auditable);
// the prompt carries the same law and A5 measures quality.
const DIMENSION_TOKENS: Record<TrackKey, RegExp> = {
  intake_scope_guard: /intake scope/i,
  supplier_identity: /supplier identity|vendor identity/i,
  supply_chain_relationship: /supply.?chain|vendor.?brand relationship|authorization track/i,
  brand_risk_assessment: /brand risk/i,
  documentation_review: /documentation|document review|documents were not/i,
  sourcing_logic: /sourcing logic/i,
};
const FINANCIAL_SCOPE = /freight|shipping cost|price|pricing|cost (?:appears|of|is)|payment amount|deposit|discount|margin|EUR|USD [0-9]|[0-9,.]+ ?(?:EUR|USD)/i;

const LAW_BY_CAUSE: Record<DimensionRunCause, DimensionLimitation["law"]> = {
  plan_excluded: "B3",
  not_implemented: "B3",
  acquisition_failed: "H2",
  llm_failed: "H2",
  nothing_to_review: "OQ-A3",
};

export function certifyM6(raw: RawM6Gap[], dimensionRunRecord: DimensionRunEntry[]): { gaps: RiskGap[]; limitations: DimensionLimitation[]; audits: CallBAudit[] } {
  const audits: CallBAudit[] = [];
  const notAssessed = dimensionRunRecord.filter((d) => d.state === "not_assessed" && d.cause !== null);
  const limitations: DimensionLimitation[] = notAssessed.map((d) => ({
    dimension: d.dimension, cause: d.cause as DimensionRunCause, law: LAW_BY_CAUSE[d.cause as DimensionRunCause],
  }));

  const gaps: RiskGap[] = raw.map((g) => {
    const text = `${g.unknown} ${g.why_it_matters}`;
    const hitDim = notAssessed.find((d) => DIMENSION_TOKENS[d.dimension]?.test(text));
    if (g.is_material && hitDim) {
      audits.push({
        module: "m6", id: g.gap_id, field: "is_material", from: "true", to: "false",
        reason: `B3's law: ${hitDim.dimension} is not assessed (${hitDim.cause}) — a limitation, never a material gap counted against the case`,
      });
      return { ...g, is_material: false };
    }
    if (g.is_material && FINANCIAL_SCOPE.test(text)) {
      audits.push({
        module: "m6", id: g.gap_id, field: "is_material", from: "true", to: "false",
        reason: "financial-scope law: transaction economics is never a material gap — the engine assesses legitimacy anomalies and paperwork only, never the deal",
      });
      return { ...g, is_material: false };
    }
    return g;
  });

  return { gaps, limitations, audits };
}

export async function runCallB(input: {
  record: WidenedM1Record;
  assertions: SynthesisAssertion[];
  track5Records: SourcingContradictionRecord[];
  dimensionRunRecord: DimensionRunEntry[];
  model?: CallBModelFn;
}): Promise<CallBResult> {
  const model = input.model ?? (runModel as CallBModelFn);
  const { system, user } = buildCallBPrompt(input.record, input.assertions, input.track5Records, input.dimensionRunRecord);
  let json: unknown = null;
  let schema_fallback = false;
  let cost_usd = 0;
  try {
    const res = await model({ task: "synthesis", system, user, temperature: 0, schema: CALL_B_OUTPUT_SCHEMA });
    json = res.json; schema_fallback = res.schema_fallback === true; cost_usd = res.cost_usd;
  } catch {
    return { contradictions: [], hypotheses: { hypotheses: [], what_would_change_the_leader: "" }, gaps: [], limitations: [], what_would_change_the_leader: "", audits: [], schema_fallback: false, parse_failed: true, cost_usd };
  }
  const parsed = parseCallBOutput(json);
  if (parsed.parse_failed) {
    return { contradictions: [], hypotheses: { hypotheses: [], what_would_change_the_leader: "" }, gaps: [], limitations: [], what_would_change_the_leader: "", audits: [], schema_fallback, parse_failed: true, cost_usd };
  }
  // Explicit certification ORDER (the B7 guard): M4 is certified in code FIRST; M5's narrative
  // is downstream of the certified contradiction set and is never a verdict input; M6 last.
  const m4Res = certifyM4(parsed.contradictions, input.track5Records, input.record);
  const m5Res = certifyM5(parsed.hypotheses, parsed.what_would_change_the_leader);
  const m6Res = certifyM6(parsed.gaps, input.dimensionRunRecord);
  return {
    contradictions: m4Res.contradictions,
    hypotheses: m5Res.hypotheses,
    gaps: m6Res.gaps,
    limitations: m6Res.limitations,
    what_would_change_the_leader: parsed.what_would_change_the_leader,
    audits: [...m4Res.audits, ...m5Res.audits, ...m6Res.audits],
    schema_fallback,
    parse_failed: false,
    cost_usd,
  };
}

const norm = (s: string): string => s.trim().toLowerCase();

export async function runCallBRefuter(input: {
  record: WidenedM1Record;
  hypotheses: HypothesisSet;
  contradictions: Module4ContradictionRecord[];
  model?: CallBModelFn;
}): Promise<RefuterResult> {
  const model = input.model ?? (runModel as CallBModelFn);
  const leader = input.hypotheses.hypotheses.find((h) => h.likelihood === "leading")?.label ?? null;
  const { system, user } = buildRefuterPrompt(input.record, input.hypotheses, input.contradictions);
  const degraded = (parse_failed: boolean, schema_fallback: boolean, cost_usd: number, refuter_leader: string | null = null): RefuterResult =>
    ({ conviction: "degraded", agreed: false, refuter_leader, admin_flag: true, schema_fallback, parse_failed, cost_usd });
  let json: unknown = null;
  let schema_fallback = false;
  let cost_usd = 0;
  try {
    const res = await model({ task: "synthesis", system, user, temperature: 0, schema: CALL_B_OUTPUT_SCHEMA });
    json = res.json; schema_fallback = res.schema_fallback === true; cost_usd = res.cost_usd;
  } catch {
    return degraded(true, false, cost_usd);
  }
  const parsed = parseCallBOutput(json);
  if (parsed.parse_failed) return degraded(true, schema_fallback, cost_usd);
  const refuterLeader = parsed.hypotheses.find((h) => h.likelihood === "leading")?.label ?? null;
  // CODE compares the two commitments. An unmatched or missing refuter leader counts as
  // DISAGREEMENT — conservative: measured uncertainty degrades the advisory, never hides.
  const agreed = leader !== null && refuterLeader !== null && norm(leader) === norm(refuterLeader);
  if (!agreed) return degraded(false, schema_fallback, cost_usd, refuterLeader);
  return { conviction: "high", agreed: true, refuter_leader: refuterLeader, admin_flag: false, schema_fallback, parse_failed: false, cost_usd };
}
