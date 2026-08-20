import { describe, it, expect, vi, beforeEach } from "vitest";

const { runModel } = vi.hoisted(() => ({ runModel: vi.fn() }));
vi.mock("@/lib/ai/runModel", () => ({ runModel }));

import { repairTrackClientProse, repairSynthesisClientProse, swapExactStrings } from "@/lib/research/proseRepairLoop";
import { scanFindingsForBannedLanguage } from "@/lib/utils/banned-language";
import type { SynthesisOutput } from "@/lib/research/contracts";

// ⚠ Braces are load-bearing: mockReset() RETURNS the mock, and a function returned from
// beforeEach is invoked by vitest as TEARDOWN — which called the mock itself after each test
// and detonated any throwing implementation as a phantom failure.
beforeEach(() => { runModel.mockReset(); });

const modelReturns = (replacements: unknown) =>
  runModel.mockResolvedValue({ json: { replacements }, model_provider: "anthropic", model_version: "x", tokens: 1, cost_usd: 0, latency_ms: 1 });

describe("the repair fires only when the gate's own scanners fire", () => {
  it("clean prose costs nothing — no model call at all", async () => {
    const r = await repairTrackClientProse("supplier_identity", {
      client_summary: "The state registry lists the company as active since 2019.",
      questions_to_ask: [{ question: "Can you provide the distributor agreement?", reason: "A written agreement shows the relationship's scope.", blocking_weight_key: "no_connection_found", priority: 1 } as never],
    });
    expect(r.attempted).toBe(false);
    expect(runModel).not.toHaveBeenCalled();
  });

  it("a dirty summary is repaired and the repaired value scans clean", async () => {
    const dirty = "Authorization is confirmed for the US market.";
    const clean = "Authorization is documented for the US market.";
    modelReturns([{ index: 0, text: clean }]);
    const r = await repairTrackClientProse("supply_chain_relationship", { client_summary: dirty });
    expect(r.attempted).toBe(true);
    expect(r.value.client_summary).toBe(clean);
    expect(r.residual).toEqual([]);
    expect(r.cleared.length).toBeGreaterThan(0);
  });

  it("question `reason` prose is a covered surface — the p001 class", async () => {
    const dirty = "This determines whether cease_and_desist_distributed is the correct classification.";
    modelReturns([{ index: 0, text: "A written answer shows whether the brand has restricted this channel." }]);
    const r = await repairTrackClientProse("brand_risk_assessment", {
      questions_to_ask: [{ question: "Has the brand issued any notices?", reason: dirty, blocking_weight_key: "cease_and_desist_distributed", priority: 1 } as never],
    });
    expect(r.attempted).toBe(true);
    expect((r.value.questions_to_ask?.[0] as { reason: string }).reason).not.toContain("cease_and_desist_distributed");
  });
});

describe("fail-open, always — a repair failure is never a pipeline failure", () => {
  const dirty = { client_summary: "Authorization is confirmed for the US market." };

  it("model throws → the ORIGINAL value returns untouched", async () => {
    runModel.mockImplementation(() => { throw new Error("api down"); });
    const r = await repairTrackClientProse("supply_chain_relationship", dirty);
    expect(r.value.client_summary).toBe(dirty.client_summary);
    expect(r.attempted).toBe(true);
    expect(r.residual.length).toBeGreaterThan(0);
  });

  it("model returns garbage → original untouched", async () => {
    runModel.mockResolvedValue({ json: "not an object", model_provider: "x", model_version: "x", tokens: 0, cost_usd: 0, latency_ms: 0 });
    const r = await repairTrackClientProse("supply_chain_relationship", dirty);
    expect(r.value.client_summary).toBe(dirty.client_summary);
  });

  it("a 'repair' that still trips the gate is DISCARDED — kept only if strictly cleaner", async () => {
    modelReturns([{ index: 0, text: "Authorization is confirmed and certified for the US market." }]);
    const r = await repairTrackClientProse("supply_chain_relationship", dirty);
    expect(r.value.client_summary).toBe(dirty.client_summary);
    expect(r.cleared).toEqual([]);
  });

  it("an out-of-range index or non-string text is ignored, never a crash", async () => {
    modelReturns([{ index: 99, text: "x" }, { index: 0, text: 42 }, "junk"]);
    const r = await repairTrackClientProse("supply_chain_relationship", dirty);
    expect(r.value.client_summary).toBe(dirty.client_summary);
  });
});

describe("structural safety — the model can only touch what the gate flagged", () => {
  it("non-flagged fields are byte-identical after a repair", async () => {
    const fields = {
      client_summary: "Authorization is confirmed for the US market.",
      brand_risk_finding: "The brand publishes a reseller application form.",
      questions_to_ask: [{ question: "Q", reason: "clean reason", blocking_weight_key: "map_policy_present", priority: 2 } as never],
    };
    modelReturns([{ index: 0, text: "Authorization is documented for the US market." }]);
    const r = await repairTrackClientProse("supply_chain_relationship", fields);
    expect(r.value.brand_risk_finding).toBe(fields.brand_risk_finding);
    expect((r.value.questions_to_ask?.[0] as { blocking_weight_key: string }).blocking_weight_key).toBe("map_policy_present");
    expect((r.value.questions_to_ask?.[0] as { reason: string }).reason).toBe("clean reason");
  });

  it("swapExactStrings replaces byte-identical strings ONLY", () => {
    const v = { a: "target", b: "target ", c: ["target", "other"], d: 7 };
    expect(swapExactStrings(v, "target", "new")).toEqual({ a: "new", b: "target ", c: ["new", "other"], d: 7 });
  });

  it("the inputs are never mutated", async () => {
    const fields = { client_summary: "Authorization is confirmed for the US market." };
    const before = JSON.stringify(fields);
    modelReturns([{ index: 0, text: "Authorization is documented for the US market." }]);
    await repairTrackClientProse("supply_chain_relationship", fields);
    expect(JSON.stringify(fields)).toBe(before);
  });
});

describe("Part A guards Part B — the founder's own softening example is REFUSED by the loop", () => {
  it("a 'repair' that softens an UNFLAGGED clause is refused and the original stands", async () => {
    // The exact risk Part A was ruled for: every word-level invariant survives, the claim weakens.
    // (Part A's ruled reach, pinned here: the sixth admits edits within editWindow (6 words) of a
    // flagged region — so the softened clause sits FARTHER than that, which is the guarantee the
    // ruling actually makes. The diff is also SINGLE-REGION: collateral edits inside the same
    // contiguous span as a legitimate fix are admitted. Multi-region diff is a possible upgrade.)
    const original = "The vendor is confirmed as an authorized distributor for the US (src_4). Shipment records list three warehouse locations across two states and name the receiving agent for each site. No positive confirmation of authorization exists for Belgium (src_3).";
    const softened = "The vendor is confirmed as an authorized distributor for the US (src_4). Shipment records list three warehouse locations across two states and name the receiving agent for each site. Authorization was not fully documented for Belgium (src_3).";
    modelReturns([{ index: 0, text: softened }]);
    const r = await repairTrackClientProse("supply_chain_relationship", { client_summary: original });
    expect(r.value.client_summary).toBe(original);
    expect(r.refused).toHaveLength(1);
    expect(r.refused[0].invariants).toContain("localized_edit");
  });

  it("the same fix WITHOUT the softening passes the invariants and lands", async () => {
    const original = "No positive confirmation of authorization exists for Belgium (src_3). The vendor is confirmed as an authorized distributor for the US (src_4).";
    const faithful = "No positive confirmation of authorization exists for Belgium (src_3). The vendor is documented as an authorized distributor for the US (src_4).";
    modelReturns([{ index: 0, text: faithful }]);
    const r = await repairTrackClientProse("supply_chain_relationship", { client_summary: original });
    expect(r.value.client_summary).toBe(faithful);
    expect(r.refused).toEqual([]);
    expect(r.residual).toEqual([]);
  });

  it("a repair that drops a citation is refused — invariant (1)", async () => {
    const original = "Authorization is confirmed for the US market (src_7).";
    modelReturns([{ index: 0, text: "Authorization is documented for the US market." }]);
    const r = await repairTrackClientProse("supply_chain_relationship", { client_summary: original });
    expect(r.value.client_summary).toBe(original);
    expect(r.refused[0]?.invariants).toContain("citations");
  });
});

describe("the synthesis surface — M9 + M8 only, reasoning modules untouched", () => {
  const synth = (m9partial: Record<string, unknown>): SynthesisOutput => ({
    module_1_normalized_evidence: [{ keep: "me" }] as never,
    module_2_claim_attributions: [],
    module_3_assertions: [],
    module_4_contradictions: [],
    module_5_hypotheses: { hypotheses: [], what_would_change_the_leader: "" },
    module_6_risk_gaps: [],
    module_7_doubt_calibration: { doubt_level: "minimal", doubt_focus: "", rationale: "internal — never repaired" },
    module_8_vendor_questions: ["Is the vendor amazon approved for these listings?"] as never,
    module_9_decision_snapshot: { headline: "h", the_real_risk: "", what_to_verify: [], what_to_monitor: [], leading_interpretation: "", ...m9partial } as never,
  });

  it("repairs an M8 question and reassembles the synthesis with every other module identical", async () => {
    modelReturns([{ index: 0, text: "Does the brand gate marketplace listings for these products?" }]);
    const s = synth({});
    const r = await repairSynthesisClientProse(s);
    expect(r.attempted).toBe(true);
    expect((r.value.module_8_vendor_questions as unknown as string[])[0]).toContain("gate marketplace listings");
    expect(r.value.module_1_normalized_evidence).toBe(s.module_1_normalized_evidence);
    expect(r.value.module_7_doubt_calibration).toBe(s.module_7_doubt_calibration);
    expect(scanFindingsForBannedLanguage({ q: r.value.module_8_vendor_questions })).toEqual([]);
  });

  it("clean synthesis → no call, same object back", async () => {
    const s = synth({});
    (s.module_8_vendor_questions as unknown as string[])[0] = "Can you provide the brand's written authorization document?";
    const r = await repairSynthesisClientProse(s);
    expect(r.attempted).toBe(false);
    expect(r.value).toBe(s);
    expect(runModel).not.toHaveBeenCalled();
  });
});
