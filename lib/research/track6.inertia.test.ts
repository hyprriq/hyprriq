import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, vi } from "vitest";
import { runSynthesis, type SynthesisModels } from "@/lib/research/synthesisEngine";
import { certifySynthesisForVerdict } from "@/lib/research/synthesisFirewall";
import { computeVerdict } from "@/lib/research/verdictEngine";
import { applyDocumentationNoOverride } from "@/lib/research/verdictNoOverride";
import { applyVerdictCeiling } from "@/lib/research/verdictCeiling";
import { runTrack6, type Track6Deps } from "@/lib/research/track6";
import type { EvidenceItem, TrackOutput, TrackSignal, SynthesisOutput } from "@/lib/research/contracts";
import type { TrackKey } from "@/lib/constants/tracks";

// ── Category Compliance — THE VERDICT-INERTIA PROOF (AT-B1's shape, mandated by the build
// approval: "it is what makes verdict-inertia provable, not claimed"). TWO-SIDED:
//
//   SIDE 1 — THE TRAP IS REAL (the ruling-grade §5 finding, as a permanent test): a NAIVE build
//   that feeds category evidence into M1 lets Call B mint load-bearing contradictions citing it,
//   and the ≥2 floor MOVES THE VERDICT — the A5 flip mechanism, reproduced on purpose. This side
//   is why the design exists; if it ever stops flipping, the floor changed and the design's
//   premise needs re-examination.
//
//   SIDE 2 — THE BUILT DESIGN IS INERT: runTrack6 executed alongside the engine changes NOTHING —
//   synthesis and composed verdict byte-identical with the track on vs off (AT-B1's on/off form).
//   Structural guarantees locked by source scan: category_compliance is NOT a TrackKey (the union
//   is exhaustively consumed by FROZEN synthesisCallB), and NOT in FROZEN verdictEngine's
//   SCORING_TRACKS. ──

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
];
const SIGNALS: Partial<Record<TrackKey, TrackSignal>> = { supplier_identity: "pass", brand_risk_assessment: "pass" };

const cleanModels = (callBContradictions: unknown[] = []): SynthesisModels => ({
  callA: async () => ({ json: {
    claim_attributions: [], assertions: [{ assertion_id: "a1", assertion: "operational business", brand: "", status: "supported", supporting_evidence: ["e1"], contradicting_evidence: [], confidence: "high" }],
  }, schema_fallback: false, cost_usd: 0 }),
  callB: async () => ({ json: {
    contradictions: callBContradictions, risk_gaps: [], what_would_change_the_leader: "w",
    hypotheses: [{ label: "genuine-wholesaler", interpretation: "x", supporting_evidence: ["e1"], contradicting_evidence: [], likelihood: "leading" }],
  }, schema_fallback: false, cost_usd: 0 }),
  callBRefuter: async () => ({ json: {
    contradictions: [], risk_gaps: [], what_would_change_the_leader: "w",
    hypotheses: [{ label: "genuine-wholesaler", interpretation: "x", supporting_evidence: [], contradicting_evidence: [], likelihood: "leading" }],
  }, schema_fallback: false, cost_usd: 0 }),
  callC: async () => ({ json: {
    doubt_focus: "f", rationale: "r", vendor_questions: [],
    headline: "h", leading_interpretation: "x", the_real_risk: "r", what_to_verify: [], what_to_monitor: [],
  }, schema_fallback: false, cost_usd: 0 }),
});

const compose = (signals: typeof SIGNALS, synthesis: SynthesisOutput) => {
  const certified = certifySynthesisForVerdict(synthesis);
  const raw = computeVerdict(signals, certified.synthesis);
  const noOv = applyDocumentationNoOverride(raw, signals, certified.synthesis);
  return applyVerdictCeiling({ verdict: noOv.verdict }, signals).verdict;
};

const track6Deps = (): Track6Deps => ({
  gather: vi.fn().mockResolvedValue({ pack: { sources: [{ url: "https://x.example" }] }, metrics: [] }),
  model: vi.fn().mockResolvedValue({ json: { per_brand: [{ brand: "bosch", categories_found: [{ category: "power tools", evidence_ids: [], confidence: "high", subcategory: null }], brand_category_note: null }] }, cost_usd: 0.01 }),
});

describe("SIDE 1 — the trap is REAL: naive M1 wiring lets category evidence move the verdict (the A5 flip mechanism, on purpose)", () => {
  it("category evidence in M1 + two load-bearing synthesis-born contradictions citing it ⇒ the composed verdict MOVES", async () => {
    // Baseline: clean run, no category evidence, no contradictions.
    const clean = await runSynthesis({ trackOutputs: outputs(), identity: null, roster: ["bosch"], planType: "scale_499", signals: SIGNALS, models: cleanModels() });
    const baseline = compose(SIGNALS, clean.synthesis);

    // The NAIVE build: category evidence rides a TrackOutput into M1…
    const naiveOutputs = [...outputs(), track("brand_risk_assessment", {
      evidence_items: [item("cat1", { supports: "brand_risk_assessment", weight_key: "no_enforcement_found", brand: "bosch", statement: "brand sells in a flagged category" })],
    })];
    // …and Call B mints load-bearing contradictions citing it (M1-resolvable, so certification keeps them):
    const mint = (n: number) => ({
      contradiction_type: "cross_track_signal_divergence",
      assertion_a: { track_key: "brand_risk_assessment", statement: `claimed ${n}`, evidence_ids: ["cat1"] },
      assertion_b: { track_key: "supplier_identity", statement: `observed ${n}`, evidence_ids: ["e1"] },
      interpretation: "category-driven divergence", risk_level: "high", is_load_bearing: true,
    });
    const trapped = await runSynthesis({ trackOutputs: naiveOutputs, identity: null, roster: ["bosch"], planType: "scale_499", signals: SIGNALS, models: cleanModels([mint(1), mint(2)]) });
    const trappedVerdict = compose(SIGNALS, trapped.synthesis);

    expect(trapped.synthesis.module_4_contradictions.filter((c) => c.is_load_bearing).length).toBeGreaterThanOrEqual(2);
    expect(trappedVerdict, "the ≥2 load-bearing floor must move the verdict — if this stops flipping, the design's premise changed").not.toBe(baseline);
    expect(baseline).toBe("source_clear");
    expect(trappedVerdict).toBe("verify_before_purchase");
  });
});

describe("SIDE 2 — the built design is INERT: track 6 on vs off, byte-identical (AT-B1's form)", () => {
  it("running runTrack6 alongside the engine changes NOTHING — synthesis deep-equal, composed verdict identical", async () => {
    const off = await runSynthesis({ trackOutputs: outputs(), identity: null, roster: ["bosch"], planType: "scale_499", signals: SIGNALS, models: cleanModels() });
    const offVerdict = compose(SIGNALS, off.synthesis);

    const t6 = await runTrack6({ case_id: "case-1", vendor_name: "Acme", vendor_website: null, brands_submitted: ["bosch"] } as never, track6Deps());
    const on = await runSynthesis({ trackOutputs: outputs(), identity: null, roster: ["bosch"], planType: "scale_499", signals: SIGNALS, models: cleanModels() });
    const onVerdict = compose(SIGNALS, on.synthesis);

    expect(t6.category_compliance.per_brand).toHaveLength(1); // the track genuinely ran
    expect(on.synthesis).toEqual(off.synthesis);
    expect(onVerdict).toBe(offVerdict);
  });

  it("STRUCTURAL LOCKS: category_compliance is NOT a TrackKey (frozen synthesisCallB consumes the union exhaustively) and NOT in frozen verdictEngine's SCORING_TRACKS", () => {
    const tracksSrc = readFileSync(join(process.cwd(), "lib/constants/tracks.ts"), "utf8");
    expect(tracksSrc.includes("category_compliance"), "category_compliance must NOT join the TrackKey union — DIMENSION_TOKENS in FROZEN synthesisCallB.ts is Record<TrackKey,…>, so growing the union edits frozen code").toBe(false);
    const verdictSrc = readFileSync(join(process.cwd(), "lib/research/verdictEngine.ts"), "utf8");
    expect(verdictSrc.includes("category_compliance"), "category_compliance must never appear in the frozen verdict engine").toBe(false);
    const engineSrc = readFileSync(join(process.cwd(), "lib/research/synthesisEngine.ts"), "utf8");
    expect(engineSrc.includes("category_compliance"), "the frozen synthesis engine must never read category output (zero engine entry — the §5/§6 ruling)").toBe(false);
  });
});
