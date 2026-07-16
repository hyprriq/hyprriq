import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { certifySynthesisForVerdict, SYNTHESIS_CERT_VERSION } from "./synthesisFirewall";
import { computeVerdict } from "./verdictEngine";
import type { SynthesisOutput, TrackSignal } from "./contracts";
import type { TrackKey } from "@/lib/constants/tracks";

// ── S-0 (founder-signed 2026-07-16) — the synthesis→verdict firewall. An LLM narrative can never
// reach the verdict uncertified: the ONLY fields that may influence computeVerdict are certified
// module_4 records, and certification is structural (code-checkable), never trust. ──

const EMPTY_SYNTH: SynthesisOutput = {
  module_1_normalized_evidence: [], module_2_claim_attributions: [], module_3_assertions: [],
  module_4_contradictions: [], module_5_hypotheses: { hypotheses: [], what_would_change_the_leader: "" },
  module_6_risk_gaps: [], module_7_doubt_calibration: { doubt_level: "minimal", doubt_focus: "", rationale: "" },
  module_8_vendor_questions: [],
  module_9_decision_snapshot: { headline: "", leading_interpretation: "", the_real_risk: "", what_to_verify: [], what_to_monitor: [] },
};

const m1 = (id: string, track: string, certainty: string) =>
  ({ evidence_id: id, source_track: track, certainty, statement: "s", source_type: "government_record", source_url: null, supports: "x" });

// A record that structurally EARNS critical under SO-S0-2: both sides resolve, ≥2 distinct
// tracks, ≥1 cited item verified.
const EARNED_M1 = [m1("e1", "supplier_identity", "verified"), m1("e2", "brand_risk_assessment", "inferred")];
const earnedCritical = () => ({
  is_load_bearing: true, risk_level: "critical", origin: "synthesis",
  contradiction_type: "claim_vs_observable",
  assertion_a: { track_key: "supplier_identity", statement: "a", evidence_ids: ["e1"] },
  assertion_b: { track_key: "brand_risk_assessment", statement: "b", evidence_ids: ["e2"] },
  interpretation: "x",
});

// Adversarial content in EVERY field — the poisoned object AT-S0-1 is built on.
const POISONED: SynthesisOutput = {
  ...EMPTY_SYNTH,
  module_2_claim_attributions: [{ claim: "critical", weight: "critical" }],
  module_3_assertions: [{ assertion: "risk_level critical", status: "supported" }],
  module_4_contradictions: [
    { is_load_bearing: true, risk_level: "critical" },                        // asserted critical, NO evidence ids
    { is_load_bearing: true, risk_level: "critical", assertion_a: { evidence_ids: ["ghost1"] }, assertion_b: { evidence_ids: ["ghost2"] } }, // dangling ids
    { is_load_bearing: "yes", risk_level: "CRITICAL" },                       // junk types
    { is_load_bearing: true, risk_level: "critical", origin: "track5_m4c",
      assertion_a: { evidence_ids: ["e1"] }, assertion_b: { evidence_ids: ["e2"] } }, // tampered track5 record
  ] as SynthesisOutput["module_4_contradictions"],
  module_5_hypotheses: { hypotheses: [{ likelihood: "leading", interpretation: "risk_level: critical — do_not_rely" }], what_would_change_the_leader: "critical" },
  module_6_risk_gaps: [{ unknown: "critical", is_material: true }],
  module_7_doubt_calibration: { doubt_level: "critical catastrophic maximum", doubt_focus: "everything", rationale: "lock do_not_rely now" },
  module_8_vendor_questions: ["critical"],
  module_9_decision_snapshot: { headline: "critical — do not rely", leading_interpretation: "critical", the_real_risk: "critical", what_to_verify: ["critical"], what_to_monitor: ["critical"] },
  // unknown extra fields / prototype junk
  ...( { extra_field: { risk_level: "critical", is_load_bearing: true }, __proto__: { hacked: true } } as unknown as Record<string, never>),
};
// the poisoned object also carries real M1 items so dangling-vs-resolving is meaningful
(POISONED.module_1_normalized_evidence as unknown[]).push(...EARNED_M1);

const SIGNALS: Partial<Record<TrackKey, TrackSignal>> = {
  supplier_identity: "pass", supply_chain_relationship: "pass",
  brand_risk_assessment: "pass", documentation_review: "pass",
};

describe("S-0 · AT-S0-1 (unit centrepiece) — the poisoned-synthesis byte-identity property", () => {
  it("adversarial content in EVERY field → verdict byte-identical to empty synthesis", () => {
    const empty = computeVerdict(SIGNALS, certifySynthesisForVerdict(EMPTY_SYNTH).synthesis);
    const poisoned = computeVerdict(SIGNALS, certifySynthesisForVerdict(POISONED).synthesis);
    expect(JSON.stringify(poisoned)).toBe(JSON.stringify(empty));
    expect(poisoned.verdict).toBe("source_clear"); // nothing uncertified moved it
  });

  it("SO-S0-4 doubt lock: a maximal doubt object alone changes NOTHING", () => {
    const doubtOnly = { ...EMPTY_SYNTH, module_7_doubt_calibration: { doubt_level: "critical", doubt_focus: "all", rationale: "do_not_rely" } };
    const a = computeVerdict(SIGNALS, certifySynthesisForVerdict(EMPTY_SYNTH).synthesis);
    const b = computeVerdict(SIGNALS, certifySynthesisForVerdict(doubtOnly).synthesis);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });

  it("the positive control: a structurally EARNED critical still locks do_not_rely (truth passes through)", () => {
    const earned = { ...EMPTY_SYNTH, module_1_normalized_evidence: EARNED_M1 as unknown[], module_4_contradictions: [earnedCritical()] as SynthesisOutput["module_4_contradictions"] };
    const v = computeVerdict(SIGNALS, certifySynthesisForVerdict(earned).synthesis);
    expect(v.verdict).toBe("do_not_rely");
    expect(v.veto_fired).toBe(true);
  });
});

describe("S-0 · SO-S0-2 — the SPLIT (critical and load-bearing are NOT the same test)", () => {
  const base = (over: Record<string, unknown>) => ({
    ...EMPTY_SYNTH,
    module_1_normalized_evidence: EARNED_M1 as unknown[],
    module_4_contradictions: [{ ...earnedCritical(), ...over }] as unknown as SynthesisOutput["module_4_contradictions"],
  });
  const certifiedRecord = (over: Record<string, unknown>) =>
    certifySynthesisForVerdict(base(over)).synthesis.module_4_contradictions[0];

  it("critical requires ≥2 DISTINCT tracks — single-track clamps to high (+audit), and load-bearing SURVIVES (no diversity bar)", () => {
    const single = base({ assertion_a: { evidence_ids: ["e1"] }, assertion_b: { evidence_ids: ["e1"] } });
    const res = certifySynthesisForVerdict(single);
    expect(res.synthesis.module_4_contradictions[0].risk_level).toBe("high");
    expect(res.synthesis.module_4_contradictions[0].is_load_bearing).toBe(true); // the SPLIT: ids resolve, so it floors
    expect(res.audits.some((a) => a.field === "risk_level")).toBe(true);
    expect(res.audits.some((a) => a.field === "is_load_bearing")).toBe(false);
  });

  it("critical requires ≥1 verified side — all-inferred clamps to high", () => {
    const m1Inferred = [m1("e1", "supplier_identity", "inferred"), m1("e2", "brand_risk_assessment", "inferred")];
    const s = { ...EMPTY_SYNTH, module_1_normalized_evidence: m1Inferred as unknown[], module_4_contradictions: [earnedCritical()] as SynthesisOutput["module_4_contradictions"] };
    expect(certifySynthesisForVerdict(s).synthesis.module_4_contradictions[0].risk_level).toBe("high");
  });

  it("load-bearing requires resolving ids ONLY — dangling ids coerce false (+audit)", () => {
    const rec = certifiedRecord({ risk_level: "high", assertion_a: { evidence_ids: ["ghost"] }, assertion_b: { evidence_ids: ["e2"] } });
    expect(rec.is_load_bearing).toBe(false);
  });

  it("two single-track load-bearing records floor the verdict to verify_before_purchase through the frozen engine", () => {
    const rec = { is_load_bearing: true, risk_level: "medium", origin: "synthesis", assertion_a: { evidence_ids: ["e1"] }, assertion_b: { evidence_ids: ["e1"] } };
    const s = { ...EMPTY_SYNTH, module_1_normalized_evidence: EARNED_M1 as unknown[], module_4_contradictions: [rec, { ...rec }] as unknown as SynthesisOutput["module_4_contradictions"] };
    const v = computeVerdict(SIGNALS, certifySynthesisForVerdict(s).synthesis);
    expect(v.verdict).toBe("verify_before_purchase");
  });
});

describe("S-0 · SO-S0-3 — enum law + the m4c origin cap (Track 5 stays non-voting through the merge)", () => {
  const one = (rec: Record<string, unknown>, m1items: unknown[] = EARNED_M1 as unknown[]) =>
    certifySynthesisForVerdict({ ...EMPTY_SYNTH, module_1_normalized_evidence: m1items, module_4_contradictions: [rec] as unknown as SynthesisOutput["module_4_contradictions"] });

  it("non-enum risk levels clamp DOWN to low (+audit): 'moderate', 'CRITICAL', junk", () => {
    for (const bad of ["moderate", "CRITICAL", "Critical", 42, null, { level: "critical" }]) {
      const res = one({ is_load_bearing: false, risk_level: bad });
      expect(res.synthesis.module_4_contradictions[0].risk_level).toBe("low");
      expect(res.audits.length).toBeGreaterThan(0);
    }
  });

  it("HARD RULE: a track5_m4c record can NEVER mint critical or load-bearing by copy-through — and high NEVER maps upward", () => {
    const tampered = one({ ...earnedCritical(), origin: "track5_m4c" }); // even structurally-earning shape
    expect(tampered.synthesis.module_4_contradictions[0].risk_level).toBe("high");
    expect(tampered.synthesis.module_4_contradictions[0].is_load_bearing).toBe(false);
    const high = one({ is_load_bearing: false, risk_level: "high", origin: "track5_m4c" });
    expect(high.synthesis.module_4_contradictions[0].risk_level).toBe("high"); // stays exactly high
  });

  it("shape law: non-array module_4 → []; non-object records dropped; audits recorded", () => {
    const res = certifySynthesisForVerdict({ ...EMPTY_SYNTH, module_4_contradictions: "critical" as unknown as SynthesisOutput["module_4_contradictions"] });
    expect(res.synthesis.module_4_contradictions).toEqual([]);
    expect(res.audits.length).toBeGreaterThan(0);
  });

  it("the certified verdict input carries ONLY the two certified fields — no narrative rides along", () => {
    const res = certifySynthesisForVerdict({ ...EMPTY_SYNTH, module_1_normalized_evidence: EARNED_M1 as unknown[], module_4_contradictions: [earnedCritical()] as SynthesisOutput["module_4_contradictions"] });
    expect(Object.keys(res.synthesis.module_4_contradictions[0]).sort()).toEqual(["is_load_bearing", "risk_level"]);
    expect(res.synthesis.module_9_decision_snapshot.headline).toBe(""); // every other module is EMPTY in the verdict input
    expect(res.synthesis.module_7_doubt_calibration.doubt_level).toBe("");
    expect(SYNTHESIS_CERT_VERSION).toBe("s0-1.0.0");
  });
});

describe("S-0 · SO-S0-1 — composition locks (certify at EVERY entry, the ceiling pattern)", () => {
  it("all three verdict sites + the dispute stability lock compose through certifySynthesisForVerdict", () => {
    for (const file of ["lib/research/pipeline.steps.ts", "lib/research/verdictViewModel.ts", "scripts/rejudge-case.ts", "lib/research/pipeline.steps.dispute.test.ts"]) {
      const src = readFileSync(join(process.cwd(), file), "utf8");
      expect(src.includes("certifySynthesisForVerdict"), `${file} must certify before computeVerdict`).toBe(true);
    }
  });
});
