import { describe, it, expect } from "vitest";
import golden from "./__fixtures__/goldenCases.json";
import { stageVerdict } from "./pipeline.steps";
import type { TrackKey } from "@/lib/constants/tracks";
import type { TrackSignal, SynthesisOutput } from "./contracts";

// ══ THE GOLDEN-CASE REGRESSION SUITE (founder-locked 2026-08-22, item 3) ══════════════════════
//
// WHY IT EXISTS, in the founder's words: display honesty can refuse what is ABSENT but cannot
// audit what was COMPUTED, and until now the only detector for a silently-wrong verdict was a
// human reading every report. This is the control that replaces that human — for the part of the
// problem a machine can actually hold.
//
// WHAT IT DOES: replays the REAL verdict chain — stageVerdict(), the same exported function the
// pipeline calls at lib/research/pipeline.steps.ts, which runs certifySynthesisForVerdict →
// computeVerdict → applyDocumentationNoOverride → applyVerdictCeiling — over 40 real cases'
// frozen inputs. Pure: no LLM, no network, no cost, no engine change (item 3d: the engine was
// ALREADY replayable; nothing was refactored to make this fit).
//
// WHAT IT CANNOT DO — read goldenCases.md before trusting it. It pins the DECISION LAYER only.
// A prompt change, a model change, or an evidence-collection change moves what the signals ARE,
// upstream of everything frozen here, and this suite will pass while the product changes.
//
// ⛔ A FAILURE HERE IS NEVER FIXED BY REGENERATING THE FIXTURE. It means a known case now decides
// differently. Either the change was intended (a founder ruling — then regenerate deliberately,
// via scripts/golden-cases-freeze.ts, and say so in the commit) or it is a regression to fix.

interface GoldenCase {
  case_number: string;
  status: string;
  plan_type: string | null;
  expected_verdict: string;
  stored_verdict: string;
  diverges_from_stored: boolean;
  attempt: number;
  contradiction_count: number;
  module_4_contradictions: unknown[];
  signals: Record<string, string>;
}
const CASES = (golden as { cases: GoldenCase[] }).cases;

const EMPTY = {
  module_1_normalized_evidence: [], module_2_claim_attributions: [], module_3_assertions: [],
  module_5_coverage: [], module_6_conflicts: [], module_7_doubt_focus: null,
  module_8_vendor_questions: [], module_9_headline: null,
};

function replay(c: GoldenCase): string {
  const synthesis = { ...EMPTY, module_4_contradictions: c.module_4_contradictions } as unknown as SynthesisOutput;
  return stageVerdict(c.signals as Partial<Record<TrackKey, TrackSignal>>, synthesis as never).verdict;
}

describe("GOLDEN CASES — a known case may never change verdict silently", () => {
  it("the corpus is present and spans more than one verdict band", () => {
    expect(CASES.length).toBeGreaterThanOrEqual(35);
    expect(new Set(CASES.map((c) => c.expected_verdict)).size).toBeGreaterThanOrEqual(3);
  });

  // One test PER CASE so the runner names the case that moved (item 3c: "a golden case moved" is
  // useless; the case, the direction, and the inputs are the whole point).
  for (const c of CASES) {
    it(`${c.case_number} [${c.plan_type ?? "no-plan"}] stays ${c.expected_verdict}`, () => {
      const actual = replay(c);
      if (actual !== c.expected_verdict) {
        const signals = Object.entries(c.signals).map(([k, v]) => `      ${k}: ${v}`).join("\n");
        throw new Error(
          `GOLDEN CASE MOVED\n` +
          `  case:        ${c.case_number} (attempt ${c.attempt}, plan ${c.plan_type ?? "none"}, status ${c.status})\n` +
          `  verdict:     ${c.expected_verdict}  ->  ${actual}\n` +
          `  frozen inputs that produced the baseline:\n${signals}\n` +
          `      contradictions: ${c.contradiction_count}\n` +
          `  The decision layer changed for a case whose inputs did not. Something in the weights,\n` +
          `  thresholds, veto rules, documentation no-override, or the verdict ceiling moved.\n` +
          `  If that was a deliberate ruling, regenerate via scripts/golden-cases-freeze.ts and say\n` +
          `  so in the commit. Do NOT regenerate to make this pass.`,
        );
      }
    });
  }
});

describe("verdict-band boundaries — pinned synthetically because the corpus cannot cover them", () => {
  // ⚠ HONEST GAP, NOT A CONVENIENCE. The corpus contains exactly ONE source_clear case
  // (AWI-2606-001) and it CANNOT be frozen: its delivered attempt has no synthesis row, and
  // pairing its attempt-1 signals with attempt-2 contradictions would be a fabricated input.
  // So the strongest verdict — the one that tells a client to go ahead — has ZERO real anchors.
  // These synthetic cases guard the band by construction instead. They are clearly marked as
  // synthetic and must never be presented as corpus evidence.
  const synth = (signals: Record<string, string>) =>
    stageVerdict(signals as Partial<Record<TrackKey, TrackSignal>>, { ...EMPTY, module_4_contradictions: [] } as unknown as never).verdict;

  it("all four scoring tracks passing yields source_clear — the band with no real anchor", () => {
    expect(synth({
      supplier_identity: "pass", supply_chain_relationship: "pass",
      brand_risk_assessment: "pass", documentation_review: "pass",
    })).toBe("source_clear");
  });

  it("a hard-fail on identity can never present as source_clear", () => {
    expect(synth({
      supplier_identity: "hard_fail", supply_chain_relationship: "pass",
      brand_risk_assessment: "pass", documentation_review: "pass",
    })).not.toBe("source_clear");
  });

  it("no-signal-at-all does not fall through to a reassuring verdict", () => {
    const v = synth({
      supplier_identity: "n_a", supply_chain_relationship: "n_a",
      brand_risk_assessment: "n_a", documentation_review: "n_a",
    });
    expect(["source_clear", "usable_with_conditions"]).not.toContain(v);
  });
});

describe("cases where TODAY'S engine disagrees with the delivered record", () => {
  it("records them explicitly rather than letting them look identical to the rest", () => {
    const diverged = CASES.filter((c) => c.diverges_from_stored);
    // Two, both decided under older pipelines (see goldenCases.md). If this GROWS, an engine
    // change has silently re-decided historical cases and the founder must be told.
    expect(diverged.map((c) => c.case_number).sort()).toEqual(["AWI-2606-003", "AWI-2607-022"]);
  });
});
