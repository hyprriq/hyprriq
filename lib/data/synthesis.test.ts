import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SynthesisOutput, IosVersion } from "@/lib/research/contracts";

// Chainable query mock: every builder method returns the same object; maybeSingle resolves the
// queued result. Records calls so tests can assert attempt-awareness (order/limit/eq filters).
const { from, upsert, order, limit, eqCalls, maybeSingle } = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const eqCalls: [string, unknown][] = [];
  const chain: Record<string, unknown> = {};
  const order = vi.fn(() => chain);
  const limit = vi.fn(() => chain);
  Object.assign(chain, {
    select: vi.fn(() => chain),
    eq: vi.fn((col: string, v: unknown) => { eqCalls.push([col, v]); return chain; }),
    is: vi.fn(() => chain),
    order, limit, maybeSingle,
  });
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn(() => ({ ...chain, upsert }));
  return { from, upsert, order, limit, eqCalls, maybeSingle };
});
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: { from } }));

import { upsertCaseSynthesis, getCaseIntelligence, getClientDecisionSnapshot } from "./synthesis";

const stubSynthesis: SynthesisOutput = {
  module_1_normalized_evidence: [], module_2_claim_attributions: [], module_3_assertions: [],
  module_4_contradictions: [], module_5_hypotheses: { hypotheses: [], what_would_change_the_leader: "" },
  module_6_risk_gaps: [], module_7_doubt_calibration: { doubt_level: "minimal", doubt_focus: "", rationale: "stub" },
  module_8_vendor_questions: [],
  module_9_decision_snapshot: { headline: "stub", leading_interpretation: "", the_real_risk: "", what_to_verify: [], what_to_monitor: [] },
};
const ios: IosVersion = {
  prompt_version: "0.0.0", rubric_version: "0.0.0", synthesis_version: "0.0.0", corpus_version: "0.0.0",
  configuration_version: "0.0.0", ios_version: "HyprrIQ IOS v0.1-skeleton",
  evidence_hash: "abc", model_provider: "anthropic", model_version: "claude-sonnet-4-6",
};

beforeEach(() => {
  from.mockClear(); upsert.mockClear(); order.mockClear(); limit.mockClear();
  maybeSingle.mockReset().mockResolvedValue({ data: null });
  eqCalls.length = 0;
});

describe("H1 — case_synthesis per attempt", () => {
  it("upsertCaseSynthesis writes attempt_number and conflicts on (case_id, attempt_number)", async () => {
    await upsertCaseSynthesis("c1", stubSynthesis, ios, 2);
    const [row, opts] = upsert.mock.calls[0];
    expect(row.attempt_number).toBe(2);
    expect(row.case_id).toBe("c1");
    expect(opts).toEqual({ onConflict: "case_id,attempt_number" });
  });

  // A6 (S-1f Step 3) — the storage claim, locked: watch conditions ride the EXISTING
  // `hypotheses` jsonb because the whole HypothesisSet is upserted. This is the test that makes
  // "no migration needed" a checked fact rather than an assumption — if anyone ever column-maps
  // the hypothesis set field-by-field, the A6 record vanishes silently and this fails by name.
  it("A6 — the watch-condition record reaches the hypotheses jsonb whole (no migration; nothing strips it)", async () => {
    await upsertCaseSynthesis("c1", {
      ...stubSynthesis,
      module_5_hypotheses: {
        hypotheses: [], what_would_change_the_leader: "",
        watch_conditions: [{
          watch_id: "wc-1", hypothesis_label: "genuine-wholesaler", likelihood: "leading",
          rests_on: ["e1"], disconfirmed_by: [], what_would_change_the_leader: "an invoice",
          prediction_correct: null, scored_at: null,
        }],
      },
    }, ios, 1);
    const [row] = upsert.mock.calls[0];
    expect(row.hypotheses.watch_conditions).toHaveLength(1);
    expect(row.hypotheses.watch_conditions[0]).toMatchObject({ watch_id: "wc-1", prediction_correct: null });
  });

  it("getCaseIntelligence reads the LATEST attempt (order desc + limit 1) — case_id alone is no longer unique", async () => {
    await getCaseIntelligence("c1");
    expect(order).toHaveBeenCalledWith("attempt_number", { ascending: false });
    expect(limit).toHaveBeenCalledWith(1);
  });

  it("getClientDecisionSnapshot pins the DELIVERED attempt when the case has one", async () => {
    maybeSingle
      .mockResolvedValueOnce({ data: { delivered_attempt: 1 } })                    // cases lookup
      .mockResolvedValueOnce({ data: { decision_snapshot: {}, vendor_questions: [] } }); // synthesis row
    await getClientDecisionSnapshot("c1");
    expect(eqCalls).toEqual(expect.arrayContaining([["attempt_number", 1]]));
  });

  it("getClientDecisionSnapshot falls back to latest attempt pre-delivery", async () => {
    maybeSingle
      .mockResolvedValueOnce({ data: { delivered_attempt: null } })
      .mockResolvedValueOnce({ data: null });
    await getClientDecisionSnapshot("c1");
    expect(order).toHaveBeenCalledWith("attempt_number", { ascending: false });
    expect(limit).toHaveBeenCalledWith(1);
  });
});
