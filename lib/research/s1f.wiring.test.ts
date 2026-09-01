import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { runSynthesis, deriveDimensionRunRecord, VERDICT_SENTENCES, type SynthesisModels } from "@/lib/research/synthesisEngine";
import { certifySynthesisForVerdict } from "@/lib/research/synthesisFirewall";
import type { EvidenceItem, TrackOutput, TrackSignal } from "@/lib/research/contracts";
import type { TrackKey } from "@/lib/constants/tracks";

// ── S-1f STEP 1 — THE WIRING: the four frozen calls behind runSynthesis. LLM proposes (mocked
// here), code decides; the stub is retired; memoization is DISABLED (Q4(b)); the financial-scope
// regex duplication is resolved by a CROSS-FILE IDENTITY LOCK (consolidation would require editing
// frozen synthesisCallB.ts — the lock achieves divergence-safety without touching frozen code). ──

const item = (id: string, over: Partial<EvidenceItem> = {}): EvidenceItem => ({
  evidence_id: id, statement: `statement ${id}`, certainty: "verified", source_type: "third_party",
  source_url: `https://example.com/${id}`, claimant: "independent_registry", claimant_benefits: false,
  supports: "supplier_identity", weight_key: "government_registration", ...over,
});
const track = (key: TrackOutput["track_key"], over: Partial<TrackOutput> = {}): TrackOutput => ({
  track_key: key, evidence_items: [], evidence_weights_applied: [], reasoning_notes: "", unknowns: [], ...over,
});

const outputs = (): TrackOutput[] => [
  track("supplier_identity", { evidence_items: [item("e1"), item("e2", { source_url: "https://gov.example/e2" })] }),
  track("brand_risk_assessment", { evidence_items: [item("e3", { supports: "brand_risk_assessment", weight_key: "no_enforcement_found", brand: "bosch" })] }),
  track("sourcing_logic", { non_voting: true, sourcing_logic: {
    contract_version: "m4c-1.0.0", flags: [], b2b_archetype_flag: false, b2b_brands: [],
    scenario_coherence: { assessment: "consistent", basis: "x" }, coherence_conflict_count: 1,
    coherence_conflicts: [{ contradiction_type: "cross_track_signal_divergence", assertion_a: { track_key: "supplier_identity", statement: "a", evidence_ids: [] }, assertion_b: { track_key: "brand_risk_assessment", statement: "b", evidence_ids: [] }, interpretation: "i", risk_level: "high", is_load_bearing: false }],
  } }),
];

const SIGNALS: Partial<Record<TrackKey, TrackSignal>> = { supplier_identity: "pass", brand_risk_assessment: "flag" };

const models = (over: Partial<Record<keyof SynthesisModels, unknown>> = {}): SynthesisModels => ({
  callA: async () => ({ json: over.callA ?? {
    claim_attributions: [{ evidence_id: "e1", claim: "c", claim_attributed_to: "registry", attributed_party_benefits: false, corroboration: "independent", weight: "standalone" }],
    assertions: [{ assertion_id: "a1", assertion: "the vendor operates a real business", brand: "", status: "supported", supporting_evidence: ["e1"], contradicting_evidence: [], confidence: "high" }],
  }, schema_fallback: false, cost_usd: 0.01 }),
  callB: async () => ({ json: over.callB ?? {
    coherence_conflicts: [], risk_gaps: [], what_would_change_the_leader: "w",
    hypotheses: [{ label: "genuine-wholesaler", interpretation: "A genuine wholesale operation.", supporting_evidence: ["e1"], contradicting_evidence: [], likelihood: "leading" }],
  }, schema_fallback: false, cost_usd: 0.02 }),
  callBRefuter: async () => ({ json: over.callBRefuter ?? {
    coherence_conflicts: [], risk_gaps: [], what_would_change_the_leader: "w",
    hypotheses: [{ label: "genuine-wholesaler", interpretation: "Survives the attack.", supporting_evidence: [], contradicting_evidence: [], likelihood: "leading" }],
  }, schema_fallback: false, cost_usd: 0.02 }),
  callC: async () => ({ json: over.callC ?? {
    doubt_focus: "the vendor's authorization claim", rationale: "we could not independently verify this",
    vendor_questions: ["Provide a recent distributor invoice."],
    headline: "Established distributor", leading_interpretation: "A genuine wholesale operation.",
    the_real_risk: "Authorization rests on the vendor's statements.", what_to_verify: [], what_to_monitor: [],
  }, schema_fallback: true, cost_usd: 0.03 }),
});

const runInput = (m: SynthesisModels = models()) => ({
  trackOutputs: outputs(), identity: null, roster: ["bosch"], planType: "scale_499" as const,
  signals: SIGNALS, models: m,
});

describe("S-1f Step 1 — runSynthesis wires the four frozen calls end to end", () => {
  it("produces the full SynthesisOutput: modules 2–9 from the calls, the m4c merge, all four R2 flags, both siblings, and the verdict-preview sentence injected into M9", async () => {
    const { synthesis, artifacts } = await runSynthesis(runInput());
    expect(synthesis.module_2_claim_attributions).toHaveLength(1);
    expect(synthesis.module_3_assertions).toHaveLength(1);
    // Track 5's m4c record merged with origin; no synthesis-born records in this fixture.
    expect(synthesis.module_4_contradictions).toHaveLength(1);
    expect(synthesis.module_4_contradictions[0].origin).toBe("track5_m4c");
    expect((synthesis.module_5_hypotheses.hypotheses[0] as { likelihood: string }).likelihood).toBe("leading");
    expect(synthesis.module_8_vendor_questions).toContain("Provide a recent distributor invoice.");
    expect(synthesis.schema_fallbacks).toEqual({ call_a: false, call_b: false, call_b_refuter: false, call_c: true });
    expect(synthesis.brand_evidence_status?.map((b) => b.brand)).toEqual(["bosch"]);
    expect(synthesis.dimension_run_record?.length).toBeGreaterThan(0);
    expect(synthesis.module_1_extension).toBeTruthy();
    // The verdict-preview sentence: computed via the FROZEN composition over signals + certified
    // module_4, injected byte-identically by the M9 shaper (the founder's law, live).
    const lead = synthesis.module_9_decision_snapshot.leading_interpretation;
    expect(Object.values(VERDICT_SENTENCES).some((s) => lead.startsWith(s))).toBe(true);
    expect(artifacts.refuter.conviction).toBe("high");
    expect(artifacts.cost_usd).toBeCloseTo(0.08, 5);
  });

  it("a disagreeing refuter degrades the conviction artifact + admin flag (advisory only — the verdict path is untouched)", async () => {
    const m = models({ callBRefuter: {
      coherence_conflicts: [], risk_gaps: [], what_would_change_the_leader: "w",
      hypotheses: [{ label: "grey-market-reseller", interpretation: "x", supporting_evidence: [], contradicting_evidence: [], likelihood: "leading" }],
    } });
    const { artifacts } = await runSynthesis(runInput(m));
    expect(artifacts.refuter.conviction).toBe("degraded");
    expect(artifacts.refuter.admin_flag).toBe(true);
  });

  it("determinism: identical inputs + identical mocked responses produce a deep-equal SynthesisOutput", async () => {
    const one = await runSynthesis(runInput());
    const two = await runSynthesis(runInput());
    expect(one.synthesis).toEqual(two.synthesis);
  });
});

describe("S-1f Step 1 — dimension_run_record derivation (code, cause-preserving)", () => {
  it("plan-excluded dimensions come from the registry (single_99 excludes tracks 2/4); failed/absent causes come from the H3 flags, verbatim", () => {
    const record = deriveDimensionRunRecord("single_99", [
      track("supplier_identity", { evidence_items: [item("e1")] }),
      track("brand_risk_assessment", { llm_failed: true }),
      track("sourcing_logic", { non_voting: true }),
    ]);
    const by = Object.fromEntries(record.map((d) => [d.dimension, d]));
    expect(by.supply_chain_relationship).toMatchObject({ state: "not_assessed", cause: "plan_excluded" });
    expect(by.documentation_review).toMatchObject({ state: "not_assessed", cause: "plan_excluded" });
    expect(by.supplier_identity).toMatchObject({ state: "assessed", cause: null });
    expect(by.brand_risk_assessment).toMatchObject({ state: "not_assessed", cause: "llm_failed" });
    expect(by.sourcing_logic).toMatchObject({ state: "assessed", cause: null });
  });

  it("nothing_to_review and not_implemented preserve their verbatim causes (the third-sentence status, OQ-A3)", () => {
    const record = deriveDimensionRunRecord("scale_499", [
      track("documentation_review", { nothing_to_review: true }),
      track("supply_chain_relationship", { not_implemented: true }),
    ]);
    const by = Object.fromEntries(record.map((d) => [d.dimension, d]));
    expect(by.documentation_review).toMatchObject({ state: "not_assessed", cause: "nothing_to_review" });
    expect(by.supply_chain_relationship).toMatchObject({ state: "not_assessed", cause: "not_implemented" });
  });
});

describe("S-1f Step 3 — A6 watch conditions ride the wired engine (write-side, unbackfillable)", () => {
  it("module_5_hypotheses carries one watch condition per hypothesis, with the M5 label verbatim and the scoring slot unscored", async () => {
    const { synthesis } = await runSynthesis(runInput());
    const w = synthesis.module_5_hypotheses.watch_conditions;
    expect(w, "A6: the wired engine must write watch conditions").toBeTruthy();
    expect(w).toHaveLength(synthesis.module_5_hypotheses.hypotheses.length);
    expect(w![0].hypothesis_label).toBe("genuine-wholesaler");
    expect(w![0].likelihood).toBe("leading");
    expect(w![0].what_would_change_the_leader).toBe("w");
    expect(w![0].prediction_correct).toBeNull();
    expect(w![0].scored_at).toBeNull();
  });

  it("S-0 SAFETY: watch conditions can never reach the verdict — certification rebuilds M5 from the empty input, so the new field is structurally unreachable", async () => {
    const { synthesis } = await runSynthesis(runInput());
    expect(synthesis.module_5_hypotheses.watch_conditions).toBeTruthy();
    const certified = certifySynthesisForVerdict(synthesis);
    expect(certified.synthesis.module_5_hypotheses).toEqual({ hypotheses: [], what_would_change_the_leader: "" });
    expect((certified.synthesis.module_5_hypotheses as { watch_conditions?: unknown }).watch_conditions).toBeUndefined();
  });
});

describe("S-1f Step 1 — the wiring's structural locks", () => {
  it("MEMOIZATION IS DISABLED (Q4(b)): stageSynthesis no longer reads the evidence-hash memo — source-scan lock", () => {
    const src = readFileSync(join(__dirname, "pipeline.steps.ts"), "utf8");
    expect(src).not.toContain("getSynthesisByEvidenceHash");
    expect(src).toMatch(/Q4\s?\(b\)/);
  });

  it("THE FINANCIAL-SCOPE REGEX IDENTITY LOCK: the S-1d (frozen) and S-1e copies are byte-identical — divergence fails here by name", () => {
    const extract = (file: string): string => {
      const src = readFileSync(join(__dirname, file), "utf8");
      const m = /const FINANCIAL_SCOPE = (\/.*\/i);/.exec(src);
      expect(m, `FINANCIAL_SCOPE literal not found in ${file}`).toBeTruthy();
      return m![1];
    };
    expect(extract("synthesisCallC.ts"), "the two FINANCIAL_SCOPE safety filters have diverged — synchronize them (synthesisCallB.ts is frozen; the S-1e copy must match it)").toBe(extract("synthesisCallB.ts"));
  });
});
