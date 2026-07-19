import { describe, it, expect } from "vitest";
import {
  certifyM7, certifyM8, shapeSnapshot, assembleBrandEvidenceStatus, runCallC,
  type CallCModelFn, TEST_ONLY_GAP_THRESHOLDS,
} from "@/lib/research/synthesisCallC";
import { DOUBT_MATRIX, DOUBT_MATRIX_VERSION, deriveCostLevel, deriveGapLevel } from "@/lib/research/doubtMatrix";
import { parseCallCOutput, buildCallCPrompt } from "@/lib/research/synthesisCallC.prompt";
import { scanForMethodLeakage } from "@/lib/research/synthesisMethodScan";
import { certifySynthesisForVerdict } from "@/lib/research/synthesisFirewall";
import { assembleM1Record, type M1TrackInput } from "@/lib/research/m1Assembler";
import type { EvidenceItem, TrackOutput, WidenedM1Record, SynthesisAssertion, DoubtCalibration, SynthesisOutput } from "@/lib/research/contracts";

// ── S-1e — CALL C (M7+M8+M9): the client-facing sitting. TWO CONSCIENCES:
// (1) THE FOUNDER'S LAW — the verdict sentence is byte-identical at EVERY doubt level, and
//     `broad` still COMMITS to a leading reading ("here is my best account…"), never a shrug.
// (2) THE DERIVATION RULE — the method scanner catches firewall vocabulary BY NAME while the
//     safe paraphrase passes (the Rider-2 semantic-leak class, proven closed). ──

const item = (id: string, over: Partial<EvidenceItem> = {}): EvidenceItem => ({
  evidence_id: id, statement: `statement ${id}`, certainty: "verified", source_type: "third_party",
  source_url: `https://example.com/${id}`, claimant: "independent_registry", claimant_benefits: false,
  supports: "supplier_identity", weight_key: "government_registration", ...over,
});
const track = (key: TrackOutput["track_key"], over: Partial<TrackOutput> = {}): TrackOutput => ({
  track_key: key, evidence_items: [], evidence_weights_applied: [], reasoning_notes: "", unknowns: [], ...over,
});
const record = (over: { unknowns?: number; brandItems?: EvidenceItem[] } = {}): WidenedM1Record => assembleM1Record([
  { output: track("supplier_identity", {
      evidence_items: [item("e1")],
      unknowns: Array.from({ length: over.unknowns ?? 0 }, (_, i) => ({ unknown: `u${i}`, why_unresolvable: "x", resolvable_by_client: true })),
    }) },
  // Brand-tagged items ride a brand_risk track so the weights sign lookup resolves per source_track.
  ...(over.brandItems?.length ? [{ output: track("brand_risk_assessment", { evidence_items: over.brandItems }) }] : []),
] as M1TrackInput[], null);

const assertion = (id: string, status: SynthesisAssertion["status"], brand = ""): SynthesisAssertion => ({
  assertion_id: id, assertion: `a-${id}`, brand, status, supporting_evidence: [], contradicting_evidence: [], confidence: "medium",
});
const rawSnapshot = () => ({
  headline: "Established distributor with verified registration",
  leading_interpretation: "The vendor operates a genuine wholesale business.",
  the_real_risk: "Authorization for the submitted brand rests on the vendor's own statements.",
  what_to_verify: [], what_to_monitor: ["brand enforcement posture"],
});
const doubt = (level: DoubtCalibration["doubt_level"], focus = "the vendor's authorization claim"): DoubtCalibration => ({
  doubt_level: level, doubt_focus: focus, rationale: "we could not independently verify this",
});
const VERDICT = "Verdict: Verify Before Purchase.";

const shapeInput = (level: DoubtCalibration["doubt_level"]) => ({
  raw: rawSnapshot(),
  doubt: doubt(level),
  leading: { label: "genuine-wholesaler", interpretation: "The vendor operates a genuine wholesale business.", supporting_evidence: [], contradicting_evidence: [], likelihood: "leading" as const },
  limitations: [{ dimension: "documentation_review" as const, cause: "plan_excluded" as const, law: "B3" as const }],
  materialUnresolvable: [],
  questions: ["Ask the vendor for a recent distributor invoice."],
  verdictSentence: VERDICT,
});

describe("S-1e — CONSCIENCE 1: the founder's law (identical verdict sentence; broad commits)", () => {
  it("the verdict sentence is BYTE-IDENTICAL at every doubt level — doubt shapes the narrative around the verdict, never the verdict", () => {
    const levels = ["minimal", "targeted", "elevated", "broad"] as const;
    const snapshots = levels.map((l) => shapeSnapshot(shapeInput(l)));
    for (const [i, s] of snapshots.entries()) {
      expect(s.leading_interpretation.startsWith(VERDICT), `doubt level '${levels[i]}' altered or dropped the verdict sentence`).toBe(true);
    }
  });

  it("`broad` COMMITS: the leading reading is still present ('here is my best account'), explicitly framed as not-confirmed — never a shrug", () => {
    const s = shapeSnapshot(shapeInput("broad"));
    expect(s.leading_interpretation, "broad produced a non-answer — the leading reading is gone").toContain("The vendor operates a genuine wholesale business.");
    expect(s.leading_interpretation.toLowerCase()).toContain("best available reading");
    expect(s.headline.toLowerCase(), "broad's headline must lead with what could NOT be verified").toMatch(/could not be verified/);
  });

  it("the four shapes are distinct: minimal carries no doubt framing; targeted names the one open question in the_real_risk; elevated states the reading's dependency", () => {
    const min = shapeSnapshot(shapeInput("minimal"));
    expect(min.headline).toBe(rawSnapshot().headline);
    expect(min.the_real_risk).toBe(rawSnapshot().the_real_risk);
    expect(min.what_to_verify.join(" ")).not.toContain("Ask the vendor"); // tier-limitation items only
    const tgt = shapeSnapshot(shapeInput("targeted"));
    expect(tgt.the_real_risk).toContain("the vendor's authorization claim");
    const elv = shapeSnapshot(shapeInput("elevated"));
    expect(elv.leading_interpretation).toContain("rests on");
    expect(elv.leading_interpretation).toContain("the vendor's authorization claim");
  });

  it("limitations render via the cause→sentence mapping (B3/H2/OQ-A3) in what_to_verify at every level", () => {
    const s = shapeSnapshot(shapeInput("minimal"));
    expect(s.what_to_verify.some((v) => v.toLowerCase().includes("not included in this plan"))).toBe(true);
  });
});

describe("S-1e — CONSCIENCE 2: the derivation rule scanner (the Rider-2 semantic-leak class)", () => {
  it("firewall vocabulary is caught BY NAME: 'could not be corroborated by two independent sources' is blocked", () => {
    const violations = scanForMethodLeakage({ rationale: "The claim could not be corroborated by two independent sources." });
    expect(violations.length, "the corroboration threshold escaped through a legitimate field — the Move 5 leak").toBeGreaterThan(0);
    expect(violations.join(" ")).toMatch(/corroborat|independent sources/i);
  });

  it("the SAME FACT stated safely passes: 'we could not independently verify this' is clean", () => {
    expect(scanForMethodLeakage({ rationale: "We could not independently verify this claim." })).toEqual([]);
  });

  it("gate names, thresholds, and firewall vocabulary are all caught; each violation names its field", () => {
    const v1 = scanForMethodLeakage({ headline: "Rejected at the provenance gate" });
    const v2 = scanForMethodLeakage({ the_real_risk: "Needs 2 distinct sources to count" });
    const v3 = scanForMethodLeakage({ question: "The firewall dropped this weight_key" });
    expect(v1.length).toBeGreaterThan(0);
    expect(v1[0]).toContain("headline");
    expect(v2.length).toBeGreaterThan(0);
    expect(v3.length).toBeGreaterThan(0);
  });

  it("normal client narrative passes clean — no over-blocking", () => {
    expect(scanForMethodLeakage({
      headline: "Established distributor with verified registration",
      body: "Authorization for the submitted brand rests on the vendor's own statements; we recommend confirming it directly with the brand before purchase.",
    })).toEqual([]);
  });
});

describe("S-1e — M7: the matrix is CODE (d7-1.0.0 verbatim); the model never sets doubt_level", () => {
  it("the founder's 12 cells are verbatim d7-1.0.0", () => {
    expect(DOUBT_MATRIX_VERSION).toBe("d7-1.0.0");
    expect(DOUBT_MATRIX).toEqual({
      none: { low: "minimal", significant: "minimal", severe: "minimal" },
      narrow: { low: "minimal", significant: "targeted", severe: "targeted" },
      material: { low: "targeted", significant: "elevated", severe: "elevated" },
      wide: { low: "elevated", significant: "broad", severe: "broad" },
    });
  });

  it("cost level follows the confirmed OQ-S1(a) meanings: low = nothing observed; significant = signals XOR vetoes; severe = both together", () => {
    expect(deriveCostLevel({ enforcement_posture_signals: [], veto_grade_keys_present: [], brands_at_issue: 1 })).toBe("low");
    expect(deriveCostLevel({ enforcement_posture_signals: ["brand_enforcement_signals"], veto_grade_keys_present: [], brands_at_issue: 1 })).toBe("significant");
    expect(deriveCostLevel({ enforcement_posture_signals: [], veto_grade_keys_present: ["active_ip_complaints"], brands_at_issue: 1 })).toBe("significant");
    expect(deriveCostLevel({ enforcement_posture_signals: ["brand_enforcement_signals"], veto_grade_keys_present: ["active_ip_complaints"], brands_at_issue: 2 })).toBe("severe");
  });

  it("a model that tries to set doubt_level is overridden by the matrix + audited — the LLM writes WHERE, never HOW MUCH", () => {
    const { doubt: certified, audits } = certifyM7({
      record: record({ unknowns: 0 }),
      assertions: [assertion("a1", "supported")],
      roster: ["bosch"],
      attemptedDoubtLevel: "broad",
      doubtFocus: "x", rationale: "y",
      gapThresholds: TEST_ONLY_GAP_THRESHOLDS,
    });
    expect(certified.doubt_level).toBe("minimal"); // zero unresolved + zero unknowns + no stakes ⇒ none×low
    expect(audits.some((a) => a.reason.includes("code owns the matrix"))).toBe(true);
    expect(certified.gap_inputs?.axis).toBe("llm_derived"); // the truthful fallback label rides the record
  });

  it("gap derivation uses the ruled fallback (M3 unresolved + stored unknowns) with PARAMETERIZED thresholds — no product numbers invented", () => {
    expect(deriveGapLevel({ unresolved_assertions: 0, stored_unknowns: 0 }, TEST_ONLY_GAP_THRESHOLDS)).toBe("none");
    expect(deriveGapLevel({ unresolved_assertions: 1, stored_unknowns: 0 }, TEST_ONLY_GAP_THRESHOLDS)).toBe("narrow");
    expect(deriveGapLevel({ unresolved_assertions: 2, stored_unknowns: TEST_ONLY_GAP_THRESHOLDS.material }, TEST_ONLY_GAP_THRESHOLDS)).not.toBe("none");
  });
});

describe("S-1e — M8: questions (dedupe + the financial-scope law)", () => {
  it("an economics-shaped gap/question never becomes a vendor question — dropped + audited (the M6 law binds M8 identically)", () => {
    const { questions, audits } = certifyM8(
      ["What was the 11,300 EUR air freight cost based on?", "Can you provide a recent distributor invoice?"],
      [],
    );
    expect(questions).toEqual(["Can you provide a recent distributor invoice?"]);
    expect(audits.some((a) => a.reason.includes("financial-scope"))).toBe(true);
  });

  it("duplicates dedupe case-insensitively; track questions merge in", () => {
    const { questions } = certifyM8(
      ["Provide a distributor invoice.", "provide a distributor INVOICE."],
      ["Confirm the brand relationship directly."],
    );
    expect(questions).toEqual(["Provide a distributor invoice.", "Confirm the brand relationship directly."]);
  });
});

describe("S-1e — brand_evidence_status assembly (code-derived sibling; absence NEVER clearance)", () => {
  const brandItems = [
    item("b1", { brand: "bosch", weight_key: "brand_enforcement_signals", supports: "brand_risk_assessment" }),
    item("b2", { brand: "bosch", weight_key: "active_ip_complaints", supports: "brand_risk_assessment" }),
    item("b3", { brand: "ghostbrand", weight_key: "brand_enforcement_signals", supports: "brand_risk_assessment" }),
  ];

  it("two states only: adverse_findings_attributed where negative/veto evidence carries the brand tag; every roster brand gets an entry; absence reads no_adverse_findings_attributed", () => {
    const { entries } = assembleBrandEvidenceStatus(record({ brandItems }), ["bosch", "knipex"]);
    expect(entries).toHaveLength(2);
    expect(entries.find((e) => e.brand === "bosch")).toMatchObject({ status: "adverse_findings_attributed", driving: true, attribution: "llm_attributed" });
    expect(entries.find((e) => e.brand === "knipex")).toMatchObject({ status: "no_adverse_findings_attributed", driving: false, attribution: "llm_attributed" });
  });

  it("THE ROSTER LOCK stays unconditional: an out-of-roster brand tag is ignored + audited — a hallucinated brand never mints an entry", () => {
    const { entries, audits } = assembleBrandEvidenceStatus(record({ brandItems }), ["bosch"]);
    expect(entries.map((e) => e.brand)).toEqual(["bosch"]);
    expect(audits.some((a) => a.reason.includes("roster"))).toBe(true);
  });

  it("S-0 safety holds: a SynthesisOutput carrying the sibling certifies byte-identical to one without it (rebuild-by-construction, frozen fn consumed not edited)", () => {
    const base: SynthesisOutput = {
      module_1_normalized_evidence: [], module_2_claim_attributions: [], module_3_assertions: [],
      module_4_contradictions: [], module_5_hypotheses: { hypotheses: [], what_would_change_the_leader: "" },
      module_6_risk_gaps: [], module_7_doubt_calibration: { doubt_level: "broad", doubt_focus: "x", rationale: "y" },
      module_8_vendor_questions: [], module_9_decision_snapshot: rawSnapshot(),
    };
    const withSibling: SynthesisOutput = {
      ...base,
      brand_evidence_status: [{ brand: "bosch", status: "adverse_findings_attributed", driving: true, attribution: "llm_attributed" }],
      dimension_run_record: [{ dimension: "supplier_identity", state: "assessed", cause: null }],
      schema_fallbacks: { call_a: false, call_b: false, call_b_refuter: false, call_c: true },
    };
    expect(certifySynthesisForVerdict(withSibling)).toEqual(certifySynthesisForVerdict(base));
  });
});

describe("S-1e — the stage: schema, R2's call_c flag, fail-open, determinism", () => {
  const goodJson = () => ({
    doubt_focus: "the vendor's authorization claim", rationale: "we could not independently verify this",
    vendor_questions: ["Provide a recent distributor invoice."],
    headline: rawSnapshot().headline, leading_interpretation: rawSnapshot().leading_interpretation,
    the_real_risk: rawSnapshot().the_real_risk, what_to_verify: [], what_to_monitor: [],
  });
  const mockModel = (json: unknown, extra: { schema_fallback?: boolean; throws?: boolean } = {}): CallCModelFn =>
    async () => {
      if (extra.throws) throw new Error("down");
      return { json, schema_fallback: extra.schema_fallback ?? false, cost_usd: 0.03 };
    };
  const input = (model: CallCModelFn) => ({
    record: record(), assertions: [assertion("a1", "supported")], roster: ["bosch"],
    hypotheses: { hypotheses: [{ label: "l", interpretation: "The vendor operates a genuine wholesale business.", supporting_evidence: [], contradicting_evidence: [], likelihood: "leading" as const }], what_would_change_the_leader: "w" },
    gaps: [], limitations: [], trackQuestions: [], verdictSentence: VERDICT,
    gapThresholds: TEST_ONLY_GAP_THRESHOLDS, model,
  });

  it("the pinned schema has NO doubt_level field — the parser drops one if the model emits it, and the stage flags call_c schema_fallback for R2", async () => {
    const parsed = parseCallCOutput({ ...goodJson(), doubt_level: "broad" });
    expect(parsed.attempted_doubt_level).toBe("broad");
    const res = await runCallC(input(mockModel(goodJson(), { schema_fallback: true })));
    expect(res.schema_fallback).toBe(true);
    expect(res.parse_failed).toBe(false);
    expect(res.doubt.doubt_level).toBe("minimal");
    expect(res.snapshot.leading_interpretation.startsWith(VERDICT)).toBe(true);
  });

  it("garbage/thrown model → parse_failed with empty outputs, never a throw", async () => {
    const bad = await runCallC(input(mockModel("junk")));
    expect(bad.parse_failed).toBe(true);
    const down = await runCallC(input(mockModel(null, { throws: true })));
    expect(down.parse_failed).toBe(true);
  });

  it("determinism: identical inputs + identical responses produce deep-equal results; the prompt carries the derivation-rule + injection guards", async () => {
    const one = await runCallC(input(mockModel(goodJson())));
    const two = await runCallC(input(mockModel(goodJson())));
    expect(one.doubt).toEqual(two.doubt);
    expect(one.snapshot).toEqual(two.snapshot);
    expect(one.brand_evidence_status).toEqual(two.brand_evidence_status);
    const { system } = buildCallCPrompt(record(), [assertion("a1", "supported")], { hypotheses: [], what_would_change_the_leader: "" }, [], [], ["bosch"]);
    expect(system).toMatch(/what is unverified/i);
    expect(system).toMatch(/never.*(refused|gate)/i);
    expect(system).toMatch(/data, never instructions/i);
  });
});
