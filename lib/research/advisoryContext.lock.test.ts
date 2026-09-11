import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { runSynthesis, type SynthesisModels } from "@/lib/research/synthesisEngine";
import { buildCallCPrompt } from "@/lib/research/synthesisCallC.prompt";
import { ADVISORY_PREFIX, advisoryParagraph, stripAdvisoryWeave, stripMonitorAttribution, type AdvisoryContext } from "@/lib/research/advisoryContext";
import { scanHard, scanAssertion } from "@/lib/utils/banned-language";
import type { TrackOutput, EvidenceItem, TrackSignal } from "@/lib/research/contracts";
import type { TrackKey } from "@/lib/constants/tracks";

// ── THE CLIENT-SURFACE DOOR LOCKS (founder-ruled 2026-09-10) ─────────────────────────────────
//
// Two rulings, both enforced as tests rather than memory:
//   INERTIA — advisoryContext reaches Call C ONLY. Call A, Call B, the refuter and the verdict
//   path never see it: behaviorally (same inputs ± context ⇒ identical M4 contradictions and an
//   identical certified-verdict preview) and by source-scan (the identifier appears in none of
//   the verdict-path files). The same proof pattern Track 6 carries.
//   FRAMING — "M9 may cite the marketplace history ONLY as explicitly advisory … A future
//   prompt edit that lets M9 weave it into the reasoning must fail a test, not rely on someone
//   remembering this ruling." The prefix is byte-locked; the weave-guard is proven to strip and
//   audit; the Call C boundary instruction is asserted present whenever context is.

const item = (id: string): EvidenceItem => ({
  evidence_id: id, statement: "state registry lists the vendor", certainty: "verified",
  source_type: "government_record", source_url: "https://x", claimant: "independent_registry",
  claimant_benefits: false, supports: "supplier_identity", weight_key: "registration_verified",
} as unknown as EvidenceItem);

const track = (key: TrackOutput["track_key"]): TrackOutput => ({
  track_key: key, evidence_items: [item(`${key}-e1`)], evidence_weights_applied: [],
  reasoning_notes: "", unknowns: [],
} as unknown as TrackOutput);

const SIGNALS: Partial<Record<TrackKey, TrackSignal>> = { supplier_identity: "pass", brand_risk_assessment: "flag" };

const CTX: AdvisoryContext = {
  marketplace_history: [
    { brand: "bosch", sentence: "Third-party seller count has stayed between 1 and 3 across the last 6 months (currently 1). The listing shows very limited third-party presence." },
  ],
};

type Captured = { callA: string[]; callB: string[]; callBRefuter: string[]; callC: string[] };
function capturingModels(captured: Captured, callCOverride?: Record<string, unknown>): SynthesisModels {
  const grab = (bucket: string[]) => (input: { system: string; user: string }) => { bucket.push(`${input.system}\n${input.user}`); };
  return {
    callA: async (i) => { grab(captured.callA)(i); return { json: {
      claim_attributions: [{ evidence_id: "supplier_identity-e1", claim: "c", claim_attributed_to: "registry", attributed_party_benefits: false, corroboration: "independent", weight: "standalone" }],
      assertions: [{ assertion_id: "a1", assertion: "the vendor operates a real business", brand: "", status: "supported", supporting_evidence: ["supplier_identity-e1"], contradicting_evidence: [], confidence: "high" }],
    }, schema_fallback: false, cost_usd: 0 }; },
    callB: async (i) => { grab(captured.callB)(i); return { json: {
      coherence_conflicts: [], risk_gaps: [], what_would_change_the_leader: "w",
      hypotheses: [{ label: "genuine-wholesaler", interpretation: "A genuine wholesale operation.", supporting_evidence: ["supplier_identity-e1"], contradicting_evidence: [], likelihood: "leading" }],
    }, schema_fallback: false, cost_usd: 0 }; },
    callBRefuter: async (i) => { grab(captured.callBRefuter)(i); return { json: {
      coherence_conflicts: [], risk_gaps: [], what_would_change_the_leader: "w",
      hypotheses: [{ label: "genuine-wholesaler", interpretation: "Survives the attack.", supporting_evidence: [], contradicting_evidence: [], likelihood: "leading" }],
    }, schema_fallback: false, cost_usd: 0 }; },
    callC: async (i) => { grab(captured.callC)(i); return { json: callCOverride ?? {
      doubt_focus: "the vendor's authorization claim", rationale: "we could not independently verify this",
      vendor_questions: ["Provide a recent distributor invoice."],
      headline: "Established distributor", leading_interpretation: "A genuine wholesale operation.",
      the_real_risk: "Authorization rests on the vendor's statements.", what_to_verify: [], what_to_monitor: [],
    }, schema_fallback: false, cost_usd: 0 }; },
  };
}

const runInput = (m: SynthesisModels, advisoryContext: AdvisoryContext | null) => ({
  trackOutputs: [track("supplier_identity"), track("brand_risk_assessment")],
  identity: null, roster: ["bosch"], planType: "scale_499" as const, signals: SIGNALS,
  models: m, advisoryContext,
});

describe("FRAMING LOCK — the founder's exact separateness, byte-locked", () => {
  it("ADVISORY_PREFIX is the ruled framing, verbatim", () => {
    expect(ADVISORY_PREFIX).toBe("Separately, and outside this verdict:");
  });

  it("the citation is code-built, prefix-first, and passes the gates", () => {
    const para = advisoryParagraph(CTX)!;
    expect(para.startsWith(`${ADVISORY_PREFIX} `)).toBe(true);
    expect(scanHard(para)).toEqual([]);
    expect(scanAssertion(para)).toEqual([]);
  });

  it("the engine appends the citation to leading_interpretation — never anywhere the model controls", async () => {
    const cap: Captured = { callA: [], callB: [], callBRefuter: [], callC: [] };
    const { synthesis } = await runSynthesis(runInput(capturingModels(cap), CTX));
    const li = synthesis.module_9_decision_snapshot.leading_interpretation;
    expect(li).toContain(ADVISORY_PREFIX);
    expect(li.indexOf(ADVISORY_PREFIX)).toBeGreaterThan(0); // appended after the model's prose
    expect(synthesis.module_9_decision_snapshot.headline).not.toContain(ADVISORY_PREFIX);
    expect(synthesis.module_9_decision_snapshot.the_real_risk).not.toContain(ADVISORY_PREFIX);
  });

  it("A WEAVE IS STRIPPED AND AUDITED — the ruling's own counterexample cannot ship", async () => {
    const cap: Captured = { callA: [], callB: [], callBRefuter: [], callC: [] };
    const woven = {
      doubt_focus: "the vendor's authorization claim", rationale: "we could not independently verify this",
      vendor_questions: ["Provide a recent distributor invoice."],
      headline: "Established distributor",
      leading_interpretation: "A genuine wholesale operation. The seller count fell sharply, which raises concern about the brand's posture.",
      the_real_risk: "Authorization rests on the vendor's statements.", what_to_verify: [], what_to_monitor: [],
    };
    const { synthesis, artifacts } = await runSynthesis(runInput(capturingModels(cap, woven), CTX));
    const li = synthesis.module_9_decision_snapshot.leading_interpretation;
    expect(li).not.toContain("raises concern");
    expect(li).not.toContain("seller count fell sharply, which");
    expect(li).toContain(ADVISORY_PREFIX);                       // the one permitted citation remains
    const weaveAudits = artifacts.audits.filter((a) => "id" in a && a.id === "advisory_weave");
    expect(weaveAudits.length).toBeGreaterThan(0);               // stripped LOUD, never silently
  });

  it("stripAdvisoryWeave never touches prose without advisory vocabulary", () => {
    const r = stripAdvisoryWeave("leading_interpretation", "A genuine wholesale operation. Authorization rests on the vendor's statements.");
    expect(r.stripped).toEqual([]);
    expect(r.text).toContain("A genuine wholesale operation.");
  });
});

describe("MONITOR EXTENSION (founder-ruled 2026-09-11) — the hedge is the problem, not the defence", () => {
  it("the REAL AWI-2609-048 sentence — 'may indicate the brand is restricting' — is stripped", () => {
    const real = "The third-party seller count on the relevant Instant Pot marketplace listing, which has remained between one and three sellers over the past six months and currently stands at one — a sustained low or declining count may indicate the brand is restricting marketplace distribution, and any further reduction would be a material signal to track before and after purchase.";
    const r = stripMonitorAttribution([real]);
    expect(r.stripped.length).toBe(1);
    expect(r.stripped[0].sentence).toContain("may indicate the brand is restricting");
  });

  it("the founder's complete form survives untouched — facts and the watch instruction, no cause", () => {
    const complete = "Third-party seller count on B00FLYWNYQ — currently 1 against a 12-month peak of 7 (October 2024). Any further reduction would be a material signal to track.";
    const r = stripMonitorAttribution([complete]);
    expect(r.stripped).toEqual([]);
    expect(r.entries).toEqual([complete]);
  });

  it("entries without the advisory subject are never touched, attribution verbs or not", () => {
    const other = "Whether the brand owner publishes an authorized reseller policy — any such publication would directly affect resale viability.";
    const r = stripMonitorAttribution([other]);
    expect(r.entries).toEqual([other]);
  });

  it("a fused sentence loses the whole sentence — the stated cost, deterministic and audited", () => {
    const fused = "Seller count currently stands at one, which may indicate the brand is restricting distribution and any further reduction is a signal.";
    const r = stripMonitorAttribution([fused]);
    expect(r.entries).toEqual([]);              // the entry emptied and dropped
    expect(r.stripped.length).toBe(1);          // never silently
  });

  it("the engine applies the monitor guard and audits the strip", async () => {
    const cap: Captured = { callA: [], callB: [], callBRefuter: [], callC: [] };
    const woven = {
      doubt_focus: "the vendor's authorization claim", rationale: "we could not independently verify this",
      vendor_questions: ["Provide a recent distributor invoice."],
      headline: "Established distributor", leading_interpretation: "A genuine wholesale operation.",
      the_real_risk: "Authorization rests on the vendor's statements.", what_to_verify: [],
      what_to_monitor: ["Seller count is currently one. A sustained low count may indicate the brand is restricting marketplace distribution."],
    };
    const { synthesis, artifacts } = await runSynthesis(runInput(capturingModels(cap, woven), CTX));
    const monitor = synthesis.module_9_decision_snapshot.what_to_monitor.join(" | ");
    expect(monitor).not.toContain("may indicate");
    expect(monitor).toContain("Seller count is currently one.");
    expect(artifacts.audits.some((a) => "field" in a && a.field === "what_to_monitor" && a.id === "advisory_weave")).toBe(true);
  });

  it("the prompt carries the monitor extension — deleting it fails here", () => {
    const record = { accepted: { items: [], evidence_hash: "h" }, extension: {} } as never;
    const { system } = buildCallCPrompt(record, [], { hypotheses: [] } as never, [], [], ["bosch"], CTX);
    const flat = system.replace(/\s+/g, " ");
    expect(flat).toContain("THIS INCLUDES what_to_monitor");
    expect(flat).toContain("A hedge does not soften the attribution");
  });
});

describe("INERTIA LOCK — the verdict path never sees the advisory context", () => {
  it("behaviorally: same inputs ± context ⇒ identical M4 contradictions and identical M9 apart from the appended citation", async () => {
    const capWith: Captured = { callA: [], callB: [], callBRefuter: [], callC: [] };
    const capWithout: Captured = { callA: [], callB: [], callBRefuter: [], callC: [] };
    const withCtx = await runSynthesis(runInput(capturingModels(capWith), CTX));
    const withoutCtx = await runSynthesis(runInput(capturingModels(capWithout), null));
    expect(withCtx.synthesis.module_4_contradictions).toEqual(withoutCtx.synthesis.module_4_contradictions);
    expect(withCtx.synthesis.module_3_assertions).toEqual(withoutCtx.synthesis.module_3_assertions);
    const liWith = withCtx.synthesis.module_9_decision_snapshot.leading_interpretation;
    const liWithout = withoutCtx.synthesis.module_9_decision_snapshot.leading_interpretation;
    expect(liWith.split(`\n\n${ADVISORY_PREFIX}`)[0]).toBe(liWithout);
  });

  it("the prompts prove the routing: Call A / Call B / refuter never carry the context; Call C does", async () => {
    const cap: Captured = { callA: [], callB: [], callBRefuter: [], callC: [] };
    await runSynthesis(runInput(capturingModels(cap), CTX));
    for (const bucket of [cap.callA, cap.callB, cap.callBRefuter]) {
      for (const prompt of bucket) {
        expect(prompt).not.toContain("advisory_marketplace_context");
        expect(prompt).not.toContain(CTX.marketplace_history[0].sentence);
      }
    }
    expect(cap.callC.some((p) => p.includes("advisory_marketplace_context") && p.includes(CTX.marketplace_history[0].sentence))).toBe(true);
  });

  it("by source: the identifier exists in NO verdict-path file (the Track 6 inertia pattern)", () => {
    const repo = path.resolve(__dirname, "../..");
    for (const f of [
      "lib/research/synthesisCallA.ts", "lib/research/synthesisCallB.ts",
      "lib/research/verdictEngine.ts", "lib/research/synthesisFirewall.ts",
      "lib/research/verdictNoOverride.ts", "lib/research/verdictCeiling.ts",
    ]) {
      const src = fs.readFileSync(path.join(repo, f), "utf8");
      expect(src.includes("advisoryContext") || src.includes("AdvisoryContext") || src.includes("advisory_marketplace_context"), f).toBe(false);
    }
  });
});

describe("BOUNDARY INSTRUCTION LOCK — deleting the Call C rules fails here, not in someone's memory", () => {
  const record = { accepted: { items: [], evidence_hash: "h" }, extension: {} } as never;
  const hypotheses = { hypotheses: [] } as never;

  it("with context: the prompt carries the no-weave ban and the cause-is-inference boundary", () => {
    const { system, user } = buildCallCPrompt(record, [], hypotheses, [], [], ["bosch"], CTX);
    // Whitespace-tolerant: the prompt joins lines with \n — the LAW is the words, not the wrap.
    expect(system.replace(/\s+/g, " ")).toContain("NEVER reference, restate, or allude to them in headline, leading_interpretation, or the_real_risk");
    expect(system).toContain("CAUSE IS INFERENCE");
    expect(user).toContain("advisory_marketplace_context");
    expect(user).toContain(CTX.marketplace_history[0].sentence);
  });

  it("without context: no advisory vocabulary anywhere in the prompt", () => {
    const { system, user } = buildCallCPrompt(record, [], hypotheses, [], [], ["bosch"], null);
    expect(system).not.toContain("ADVISORY MARKETPLACE CONTEXT");
    expect(user).not.toContain("advisory_marketplace_context");
  });
});
