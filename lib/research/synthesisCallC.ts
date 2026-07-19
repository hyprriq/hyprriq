import type {
  WidenedM1Record, SynthesisAssertion, HypothesisSet, RiskGap, DecisionSnapshot, DoubtCalibration,
  BrandEvidenceStatusEntry, SynthesisHypothesis,
} from "@/lib/research/contracts";
import type { TrackKey } from "@/lib/constants/tracks";
import { weightFor } from "@/lib/research/weights";
import { deriveCostLevel, deriveGapLevel, computeDoubtLevel, type GapThresholds } from "@/lib/research/doubtMatrix";
import { buildCallCPrompt, parseCallCOutput, CALL_C_OUTPUT_SCHEMA, type ParsedCallC } from "@/lib/research/synthesisCallC.prompt";
import type { DimensionLimitation } from "@/lib/research/synthesisCallB";
import { runModel } from "@/lib/ai/runModel";

// ── S-1e — Call C (M7+M8+M9) + brand_evidence_status assembly. LLM proposes; CODE decides:
// doubt_level (the d7-1.0.0 matrix), the derivation scanner (delivery), the financial filter,
// the roster lock, and the snapshot SHAPES. THE FOUNDER'S LAW is the conscience: the verdict
// sentence is stated identically at every doubt level, and `broad` commits to a reading —
// "here is my best account, and here is why you should not wire money against it yet." ──

export interface CallCAudit { module: "m7" | "m8" | "m9" | "brand_status"; id: string; field: string; from: string; to: string; reason: string }

// TEST-ONLY gap thresholds — NOT product values. The product thresholds are FOUNDER-RULED and
// BLANK until G4 measures them (the filled skeleton's law: cells founder-authored, thresholds
// his). Wiring MUST supply ruled values; importing this constant outside tests is a defect.
export const TEST_ONLY_GAP_THRESHOLDS: GapThresholds = { narrow: 1, material: 3, wide: 6 };

// Observable enforcement-posture keys (OQ-S1 (a) — observed stakes only; Keepa keys stay inert).
const ENFORCEMENT_POSTURE_KEYS = new Set(["brand_enforcement_signals", "brand_restricts_amazon", "map_policy_present"]);
// Mirrors S-1d's financial-scope pattern (synthesisCallB is FROZEN — cannot export from it);
// consolidation is a hygiene-pass item, flagged in the sitting record.
const FINANCIAL_SCOPE = /freight|shipping cost|price|pricing|cost (?:appears|of|is)|payment amount|deposit|discount|margin|EUR|USD [0-9]|[0-9,.]+ ?(?:EUR|USD)/i;

export type CallCModelFn = (input: { task: "synthesis"; system: string; user: string; temperature: number; schema: object }) =>
  Promise<{ json: unknown; schema_fallback?: boolean; cost_usd: number }>;

export function certifyM7(input: {
  record: WidenedM1Record;
  assertions: SynthesisAssertion[];
  roster: string[];
  attemptedDoubtLevel: string | null;
  doubtFocus: string;
  rationale: string;
  gapThresholds: GapThresholds;
}): { doubt: DoubtCalibration; audits: CallCAudit[] } {
  const audits: CallCAudit[] = [];
  // AXIS 1 — the RULED FALLBACK, labeled truthfully: LLM-derived (M3 unresolved + stored unknowns).
  const gap_inputs = {
    axis: "llm_derived" as const,
    unresolved_assertions: input.assertions.filter((a) => a.status === "unresolved").length,
    stored_unknowns: input.record.extension.unknowns.length,
    gap_level: "none" as ReturnType<typeof deriveGapLevel>,
  };
  gap_inputs.gap_level = deriveGapLevel(gap_inputs, input.gapThresholds);
  // AXIS 2 — OQ-S1 (a): observable enforcement stakes only, code-derived from the frozen record.
  const keys = input.record.accepted.items
    .map((i) => ({ key: i.weight_key, track: i.source_track }))
    .filter((k): k is { key: string; track: TrackKey } => !!k.key);
  const cost = {
    enforcement_posture_signals: [...new Set(keys.filter((k) => ENFORCEMENT_POSTURE_KEYS.has(k.key)).map((k) => k.key))],
    veto_grade_keys_present: [...new Set(keys.filter((k) => weightFor(k.track, k.key)?.hard_fail).map((k) => k.key))],
    brands_at_issue: input.roster.length,
  };
  const cost_inputs = { ...cost, cost_level: deriveCostLevel(cost) };
  // THE MATRIX OWNS THE LEVEL — never the model.
  const doubt_level = computeDoubtLevel(gap_inputs.gap_level, cost_inputs.cost_level);
  if (input.attemptedDoubtLevel !== null) {
    audits.push({
      module: "m7", id: "doubt_level", field: "doubt_level", from: input.attemptedDoubtLevel, to: doubt_level,
      reason: "code owns the matrix: the model attempted to set doubt_level — the LLM writes WHERE, never HOW MUCH (A2's mechanism)",
    });
  }
  return {
    doubt: { doubt_level, doubt_focus: input.doubtFocus, rationale: input.rationale, gap_inputs, cost_inputs },
    audits,
  };
}

export function certifyM8(rawQuestions: string[], trackQuestions: string[]): { questions: string[]; audits: CallCAudit[] } {
  const audits: CallCAudit[] = [];
  const seen = new Set<string>();
  const questions: string[] = [];
  for (const q of [...rawQuestions, ...trackQuestions]) {
    const norm = q.trim().toLowerCase();
    if (!norm || seen.has(norm)) continue;
    if (FINANCIAL_SCOPE.test(q)) {
      audits.push({ module: "m8", id: q.slice(0, 40), field: "question", from: q.slice(0, 60), to: "(dropped)", reason: "financial-scope law: transaction economics is never a vendor question — the M6 law binds M8 identically" });
      continue;
    }
    seen.add(norm);
    questions.push(q.trim());
  }
  return { questions, audits };
}

// PROPOSED limitation sentences (cause→sentence via the ruled cause→law mapping). ADMIN-side
// until the client-surface/PDF gate — every exact CLIENT string is founder-ruled there
// (the standing client-copy bar); these literals are engine-internal placeholders, flagged.
const limitationSentence = (l: DimensionLimitation): string => {
  switch (l.law) {
    case "B3": return `${l.dimension}: not included in this plan`;
    case "H2": return `${l.dimension}: we could not complete this assessment — our limitation, not a finding about the supplier`;
    case "OQ-A3": return `${l.dimension}: no documents were provided for review`;
  }
};

export interface ShapeSnapshotInput {
  raw: { headline: string; leading_interpretation: string; the_real_risk: string; what_to_verify: string[]; what_to_monitor: string[] };
  doubt: DoubtCalibration;
  leading: SynthesisHypothesis | null;
  limitations: DimensionLimitation[];
  materialUnresolvable: RiskGap[];
  questions: string[];
  verdictSentence: string;
}

export function shapeSnapshot(input: ShapeSnapshotInput): DecisionSnapshot {
  const { raw, doubt, verdictSentence } = input;
  const focus = doubt.doubt_focus || "the unverified items";
  const limitationLines = [
    ...input.limitations.map(limitationSentence),
    ...input.materialUnresolvable.map((g) => `${g.unknown} (not resolvable before purchase — stated limitation)`),
  ];
  const lead = (body: string): string => `${verdictSentence} ${body}`;

  switch (doubt.doubt_level) {
    case "minimal":
      return {
        headline: raw.headline,
        leading_interpretation: lead(raw.leading_interpretation),
        the_real_risk: raw.the_real_risk,
        what_to_verify: limitationLines,
        what_to_monitor: raw.what_to_monitor,
      };
    case "targeted":
      return {
        headline: raw.headline,
        leading_interpretation: lead(raw.leading_interpretation),
        the_real_risk: `The open question: ${focus}. ${raw.the_real_risk}`,
        what_to_verify: [...input.questions, ...limitationLines],
        what_to_monitor: raw.what_to_monitor,
      };
    case "elevated":
      return {
        headline: `${raw.headline} — subject to verification of ${focus}`,
        leading_interpretation: lead(`${raw.leading_interpretation} This reading rests on ${focus} holding.`),
        the_real_risk: raw.the_real_risk,
        what_to_verify: [...input.questions, ...limitationLines],
        what_to_monitor: raw.what_to_monitor,
      };
    case "broad":
      // THE FOUNDER'S LAW (the conscience watched the shrug version fail here): broad still
      // COMMITS — "here is my best account, and here is why you should not wire money against
      // it yet." The verdict sentence is injected identically; the leading reading survives,
      // explicitly framed as not-confirmed; the headline leads with what could NOT be verified.
      return {
        headline: `Key items could not be verified (${focus}). ${raw.headline}`,
        leading_interpretation: lead(`Best available reading — not a confirmed account: ${raw.leading_interpretation}`),
        the_real_risk: `What remains unverified drives the risk: ${raw.the_real_risk}`,
        what_to_verify: [...input.questions, ...limitationLines],
        what_to_monitor: raw.what_to_monitor,
      };
  }
}

const NEGATIVE_OR_VETO = (track: TrackKey, key: string): boolean => {
  const w = weightFor(track, key);
  return !!w && (w.hard_fail === true || w.points < 0);
};

export function assembleBrandEvidenceStatus(record: WidenedM1Record, roster: string[]): { entries: BrandEvidenceStatusEntry[]; audits: CallCAudit[] } {
  const audits: CallCAudit[] = [];
  const rosterSet = new Set(roster);
  const adverse = new Map<string, { veto: boolean }>();
  const flaggedOutOfRoster = new Set<string>();
  for (const i of record.accepted.items) {
    if (!i.brand || !i.weight_key) continue;
    if (!rosterSet.has(i.brand)) {
      if (!flaggedOutOfRoster.has(i.brand)) {
        flaggedOutOfRoster.add(i.brand);
        audits.push({ module: "brand_status", id: i.brand, field: "brand", from: i.brand, to: "(ignored)", reason: "roster lock: brand tag not in cases.brands_submitted — an LLM tag never mints an entry (unconditional)" });
      }
      continue;
    }
    if (NEGATIVE_OR_VETO(i.source_track, i.weight_key)) {
      const cur = adverse.get(i.brand) ?? { veto: false };
      cur.veto = cur.veto || weightFor(i.source_track, i.weight_key)?.hard_fail === true;
      adverse.set(i.brand, cur);
    }
  }
  // TWO STATES, ruled: absence is NEVER clearance — every roster brand gets an entry, and
  // no_adverse_findings_attributed is an ABSENCE statement, true whether the brand was clean,
  // acquisition was silent, or the model skipped it. attribution rides every entry (honest label).
  const entries: BrandEvidenceStatusEntry[] = roster.map((brand) => ({
    brand,
    status: adverse.has(brand) ? "adverse_findings_attributed" : "no_adverse_findings_attributed",
    driving: adverse.get(brand)?.veto === true,
    attribution: "llm_attributed",
  }));
  return { entries, audits };
}

export interface CallCResult {
  doubt: DoubtCalibration;
  questions: string[];
  snapshot: DecisionSnapshot;
  brand_evidence_status: BrandEvidenceStatusEntry[];
  audits: CallCAudit[];
  schema_fallback: boolean; // R2 — the call_c flag (the fourth and last)
  parse_failed: boolean;
  cost_usd: number;
}

export async function runCallC(input: {
  record: WidenedM1Record;
  assertions: SynthesisAssertion[];
  hypotheses: HypothesisSet;
  gaps: RiskGap[];
  limitations: DimensionLimitation[];
  trackQuestions: string[];
  roster: string[];
  verdictSentence: string;
  gapThresholds: GapThresholds;
  model?: CallCModelFn;
}): Promise<CallCResult> {
  const model = input.model ?? (runModel as CallCModelFn);
  const { system, user } = buildCallCPrompt(input.record, input.assertions, input.hypotheses, input.gaps, input.limitations, input.roster);
  const empty = (parse_failed: boolean, schema_fallback: boolean, cost_usd: number): CallCResult => ({
    doubt: { doubt_level: "minimal", doubt_focus: "", rationale: "" },
    questions: [], snapshot: { headline: "", leading_interpretation: "", the_real_risk: "", what_to_verify: [], what_to_monitor: [] },
    brand_evidence_status: [], audits: [], schema_fallback, parse_failed, cost_usd,
  });
  let parsed: ParsedCallC;
  let schema_fallback = false;
  let cost_usd = 0;
  try {
    const res = await model({ task: "synthesis", system, user, temperature: 0, schema: CALL_C_OUTPUT_SCHEMA });
    schema_fallback = res.schema_fallback === true; cost_usd = res.cost_usd;
    parsed = parseCallCOutput(res.json);
  } catch {
    return empty(true, false, cost_usd);
  }
  if (parsed.parse_failed) return empty(true, schema_fallback, cost_usd);

  const m7 = certifyM7({
    record: input.record, assertions: input.assertions, roster: input.roster,
    attemptedDoubtLevel: parsed.attempted_doubt_level, doubtFocus: parsed.doubt_focus,
    rationale: parsed.rationale, gapThresholds: input.gapThresholds,
  });
  const m8 = certifyM8(parsed.vendor_questions, input.trackQuestions);
  const leading = input.hypotheses.hypotheses.find((h) => h.likelihood === "leading") ?? null;
  const materialUnresolvable = input.gaps.filter((g) => g.is_material && !g.resolvable_by_client);
  const snapshot = shapeSnapshot({
    raw: {
      headline: parsed.headline, leading_interpretation: parsed.leading_interpretation,
      the_real_risk: parsed.the_real_risk, what_to_verify: parsed.what_to_verify, what_to_monitor: parsed.what_to_monitor,
    },
    doubt: m7.doubt, leading, limitations: input.limitations, materialUnresolvable,
    questions: m8.questions, verdictSentence: input.verdictSentence,
  });
  const brandStatus = assembleBrandEvidenceStatus(input.record, input.roster);
  return {
    doubt: m7.doubt,
    questions: m8.questions,
    snapshot,
    brand_evidence_status: brandStatus.entries,
    audits: [...m7.audits, ...m8.audits, ...brandStatus.audits],
    schema_fallback,
    parse_failed: false,
    cost_usd,
  };
}
