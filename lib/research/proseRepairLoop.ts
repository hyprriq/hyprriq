import { runModel } from "@/lib/ai/runModel";
import { scanFindingsForBannedLanguage } from "@/lib/utils/banned-language";
import { locateBannedLanguage, type BannedHit } from "@/lib/utils/bannedLanguageReport";
import { scanTrackProseAtDelivery, scanSynthesisAtDelivery } from "@/lib/research/synthesisMethodScan";
import { locateMethodLeakage, locateSynthesisMethodLeakage } from "@/lib/research/methodScanReport";
import { projectFindingJsonForClient, projectQuestionsForClient } from "@/lib/portal/clientReport";
import { checkRepairInvariants } from "@/lib/research/proseRepair";
import type { QuestionToAsk, SynthesisOutput } from "@/lib/research/contracts";

// ── THE SELF-CORRECTING LOOP (Part B — founder-directed 2026-08-20: "flawless execution") ─────
//
// Part A (lib/research/proseRepair.ts, founder-ruled 2026-08-17) is the GUARD: six mechanical
// invariants that decide whether a regenerated field may replace the original. THIS file is the
// loop Part A was written for: at GENERATION, right before persist, the publish gate's own
// scanners run over the client-bound prose; a violation triggers ONE bounded rewrite call, and
// every candidate replacement must pass checkRepairInvariants — citations, entities, numbers,
// negation count, length floor, and the LOCALIZED-EDIT law — or it is refused and the original
// stands. The operating problem: at 30 reports/day, a gate that blocks at publish turns every
// vocabulary slip into an operator intervention; this loop clears the slips the moment they are
// written, and the publish gate + prose overrides remain the backstop for the residue.
//
// ⚖ STRUCTURAL SAFETY, three fences deep:
//   1. Callers pass ONLY prose fields — evidence, weights, signals, keys never enter this module.
//   2. A replacement can only land on a string BYTE-IDENTICAL to a flagged field's text, and only
//      after checkRepairInvariants returns [] for it (Part A's law, sixth invariant included).
//   3. The repaired value is kept ONLY if it scans strictly cleaner than the original; any model
//      failure, garbage, refusal, or non-improvement returns the ORIGINAL untouched. Fail-open:
//      this layer can never fail a pipeline run. The VERDICT is untouched by construction.

export interface ProseRepairOutcome<T> {
  value: T;
  /** true when violations were found and a repair call was made (or attempted). */
  attempted: boolean;
  /** labels cleared by the repair (empty when not attempted or not improved). */
  cleared: string[];
  /** labels still present after repair — the publish gate's remaining work. */
  residual: string[];
  /** replacements the Part A invariants REFUSED (audit visibility; the original stood). */
  refused: { where: string; invariants: string[] }[];
}

const REPAIR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["replacements"],
  properties: {
    replacements: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["index", "text"],
        properties: { index: { type: "integer" }, text: { type: "string" } },
      },
    },
  },
} as const;

const REPAIR_SYSTEM = [
  "You are the prose-repair layer of a vendor due-diligence report engine. A language gate flagged",
  "sentences in client-facing report prose. For each numbered item you receive the COMPLETE field",
  "text, the flagged sentence, the rule label, and rewrite guidance.",
  "REWRITE THE COMPLETE FIELD TEXT for each item, changing ONLY the flagged words and their",
  "immediate grammar — every other word of the field must survive VERBATIM. Preserve meaning,",
  "strength, every citation (src_N), every name, every number. Never soften or hedge a finding,",
  "never add or drop a claim, never mention rules, gates, or this repair.",
  "House substitutions: write SUPPORTS / INDICATES / DOCUMENTS / SHOWS instead of confirm/certify",
  "next to authorization; say what the record shows or does not show instead of corroboration",
  "vocabulary or source counts; never any snake_case internal key name in prose; never 'Amazon",
  "approved'/'Amazon approval' — refer to brand gating or required documentation instead; never",
  "bare 'is legitimate' — state the observable facts instead.",
  "Return STRICT JSON per the schema: {\"replacements\":[{\"index\":<item number>,\"text\":\"<the",
  "complete replacement field text>\"}]} — one entry per item, nothing else.",
].join("\n");

/** Replace every string in `node` byte-identical to `from` with `to`. Pure; returns a new tree. */
export function swapExactStrings<T>(node: T, from: string, to: string): T {
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return v === from ? to : v;
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(node) as T;
}

/** The core: scan → locate → one repair call → Part A invariants per candidate → byte-guarded
 *  apply → keep only if strictly cleaner. */
export async function repairFlaggedProse<T>(opts: {
  surface: string;
  value: T;
  scan: (v: T) => string[];
  locate: (v: T) => BannedHit[];
}): Promise<ProseRepairOutcome<T>> {
  const initial = opts.scan(opts.value);
  if (initial.length === 0) return { value: opts.value, attempted: false, cleared: [], residual: [], refused: [] };

  // One hit per distinct field text — the model rewrites whole fields, so N sentences in one
  // field are one rewrite. Order is stable for the index contract.
  const hits: BannedHit[] = [];
  for (const h of opts.locate(opts.value)) {
    if (h.field_text && !hits.some((x) => x.field_text === h.field_text)) hits.push(h);
  }
  if (hits.length === 0) {
    // A scanner fired with no locatable sentence (label-only classes). Nothing to rewrite here —
    // the publish gate reports it; this layer only ever fixes what it can point at.
    return { value: opts.value, attempted: false, cleared: [], residual: initial, refused: [] };
  }

  const refused: ProseRepairOutcome<T>["refused"] = [];
  try {
    const user = JSON.stringify({
      surface: opts.surface,
      items: hits.map((h, i) => ({
        index: i,
        rule: h.label,
        flagged_sentence: h.sentence,
        guidance: h.fix,
        field_text: h.field_text,
      })),
    });
    const res = await runModel({ task: "repair", system: REPAIR_SYSTEM, user, schema: REPAIR_SCHEMA as unknown as object, temperature: 0 });
    const reps = ((res.json ?? {}) as { replacements?: { index?: unknown; text?: unknown }[] }).replacements ?? [];

    let repaired = opts.value;
    for (const r of reps) {
      if (typeof r.index !== "number" || typeof r.text !== "string") continue;
      const hit = hits[r.index];
      const text = r.text.trim();
      if (!hit || !text || text === hit.field_text) continue;
      // ── PART A — the founder-ruled invariants. Any failure refuses THIS replacement; the
      // original field stands and the publish gate reports it. Never silent: refusals ride the
      // outcome into the audit row. The gate's own matched sentences (BOTH scanner halves) are
      // passed as the additive flag source, so the sixth invariant knows exactly where the gate
      // matched — method-class repairs stay possible, edits elsewhere stay refused.
      const snippets = opts.locate(opts.value).filter((x) => x.field_text === hit.field_text).map((x) => x.sentence).filter(Boolean);
      const fails = checkRepairInvariants(hit.field_text, text, { extraFlaggedSnippets: snippets });
      if (fails.length) {
        refused.push({ where: hit.where, invariants: [...new Set(fails.map((f) => f.invariant))] });
        continue;
      }
      repaired = swapExactStrings(repaired, hit.field_text, text);
    }

    const residual = opts.scan(repaired);
    if (residual.length < initial.length) {
      const cleared = initial.filter((l) => !residual.includes(l));
      return { value: repaired, attempted: true, cleared, residual, refused };
    }
    return { value: opts.value, attempted: true, cleared: [], residual: initial, refused };
  } catch {
    // Fail-open, always: a repair failure is a missed optimization, never a pipeline failure.
    return { value: opts.value, attempted: true, cleared: [], residual: initial, refused };
  }
}

// ── THE TRACK SURFACE — the same composition the publish gate runs over a track row. ─────────

export interface TrackProseFields {
  client_summary?: string | null;
  brand_relationship_finding?: string | null;
  brand_risk_finding?: string | null;
  documentation_finding?: string | null;
  questions_to_ask?: QuestionToAsk[] | null;
}

function trackScanShape(v: TrackProseFields): { compiled: Record<string, unknown>; questions: QuestionToAsk[] | null } {
  return {
    compiled: {
      summary: v.client_summary ?? null,
      brand_relationship_finding: v.brand_relationship_finding ?? null,
      brand_risk_finding: v.brand_risk_finding ?? null,
      documentation_finding: v.documentation_finding ?? null,
    },
    questions: v.questions_to_ask ?? null,
  };
}

export async function repairTrackClientProse(
  trackKey: string,
  fields: TrackProseFields,
): Promise<ProseRepairOutcome<TrackProseFields>> {
  const scan = (v: TrackProseFields): string[] => {
    const s = trackScanShape(v);
    return [...new Set([
      ...scanFindingsForBannedLanguage(s.compiled),
      ...scanFindingsForBannedLanguage(s.questions),
      ...scanTrackProseAtDelivery([{ track_key: trackKey, compiled_findings_json: s.compiled, questions_to_ask: s.questions }]),
    ])];
  };
  const locate = (v: TrackProseFields): BannedHit[] => {
    const s = trackScanShape(v);
    return [
      ...locateBannedLanguage(s.compiled, trackKey),
      ...locateBannedLanguage(s.questions, `${trackKey} (questions)`),
      ...locateMethodLeakage(
        {
          [trackKey]: projectFindingJsonForClient(s.compiled, trackKey),
          [`${trackKey} (questions)`]: projectQuestionsForClient(s.questions),
        },
        trackKey,
      ),
    ];
  };
  return repairFlaggedProse({ surface: `track:${trackKey}`, value: fields, scan, locate });
}

// ── THE SYNTHESIS SURFACE — M9 + M8, the client-bound columns. M7 is internal and never
// rewritten; its labels can appear in `residual` and belong to the publish gate. ──────────────

export async function repairSynthesisClientProse(synthesis: SynthesisOutput): Promise<ProseRepairOutcome<SynthesisOutput>> {
  type ClientPair = { decision_snapshot: unknown; vendor_questions: unknown };
  const pair: ClientPair = {
    decision_snapshot: synthesis.module_9_decision_snapshot,
    vendor_questions: synthesis.module_8_vendor_questions,
  };
  const scanPair = (p: ClientPair): string[] => [...new Set([
    ...scanFindingsForBannedLanguage(p),
    ...scanSynthesisAtDelivery({
      module_9_decision_snapshot: p.decision_snapshot,
      module_8_vendor_questions: p.vendor_questions,
      module_7_doubt_calibration: synthesis.module_7_doubt_calibration,
    }),
  ])];
  const locatePair = (p: ClientPair): BannedHit[] => [
    ...locateBannedLanguage(p, "synthesis"),
    ...locateSynthesisMethodLeakage({
      ...synthesis,
      module_9_decision_snapshot: p.decision_snapshot as SynthesisOutput["module_9_decision_snapshot"],
      module_8_vendor_questions: p.vendor_questions as SynthesisOutput["module_8_vendor_questions"],
    }),
  ];
  const r = await repairFlaggedProse({ surface: "synthesis", value: pair, scan: scanPair, locate: locatePair });
  if (!r.attempted || r.cleared.length === 0) {
    return { value: synthesis, attempted: r.attempted, cleared: r.cleared, residual: r.residual, refused: r.refused };
  }
  return {
    value: {
      ...synthesis,
      module_9_decision_snapshot: r.value.decision_snapshot as SynthesisOutput["module_9_decision_snapshot"],
      module_8_vendor_questions: r.value.vendor_questions as SynthesisOutput["module_8_vendor_questions"],
    },
    attempted: true,
    cleared: r.cleared,
    residual: r.residual,
    refused: r.refused,
  };
}
