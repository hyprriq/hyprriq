import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// ── Track 5 (sub-gate B, founder-ruled 2026-07-14) — the non-voting flag emitter. ──
// OQ-B3 (RULED): derived-only, zero new acquisition — runTrack5 reads ONLY the persisted attempt
// rows; it is fully deterministic (no LLM, no plugins). These tests lock every non-voting property
// AT-B2 names, plus the m4c-1.0.0 contract shape (AT-B3).
const { rowsResult } = vi.hoisted(() => ({ rowsResult: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: () => ({ select: () => ({ eq: () => ({ is: rowsResult }) }) }),
  },
}));

import { runTrack5 } from "./track5";
import { computeVerdict } from "./verdictEngine";
import { TRACK_WEIGHTS, weightKeysForTrack } from "./weights";
import { SOURCING_CONTRADICTION_CONTRACT_VERSION } from "./contracts";
import type { TrackContext, TrackSignal, SynthesisOutput, SourcingLogicOutput } from "./contracts";
import type { TrackKey } from "@/lib/constants/tracks";

const ctx: TrackContext = {
  case_id: "c1", vendor_name: "Acme", vendor_website: null,
  brands_submitted: ["Petzl"], marketplace: "amazon_us", plan_type: "growth_279",
  attempt_number: 2,
};

type Row = Record<string, unknown>;
const row = (n: number, key: string, signal: string | null, over: Row = {}): Row => ({
  track_number: n, track_key: key, track_verdict_signal: signal, attempt_number: 2,
  evidence_items: [], compiled_findings_json: {}, ...over,
});
const item = (id: string, key: string, brand = "") => ({ evidence_id: id, weight_key: key, brand, statement: `evidence ${id}` });

const healthyRows = () => [
  row(1, "supplier_identity", "pass", { evidence_items: [item("i1", "government_registration")] }),
  row(2, "supply_chain_relationship", "infer", { evidence_items: [item("i2", "invoice_matches_distributor")] }),
  row(3, "brand_risk_assessment", "infer", { evidence_items: [item("i3", "no_enforcement_found")] }),
  row(4, "documentation_review", "infer", { evidence_items: [item("i4", "invoice_full", "Petzl")] }),
];

beforeEach(() => {
  rowsResult.mockReset().mockResolvedValue({ data: healthyRows(), error: null });
});

const sl = async (c: TrackContext = ctx): Promise<SourcingLogicOutput> => {
  const out = await runTrack5(c);
  expect(out.sourcing_logic).toBeDefined();
  return out.sourcing_logic as SourcingLogicOutput;
};

describe("Track 5 — non-voting structure (AT-B2 locks)", () => {
  it("emits non_voting + sourcing_logic under the frozen contract version; NEVER evidence items, NEVER not_implemented", async () => {
    const out = await runTrack5(ctx);
    expect(out.track_key).toBe("sourcing_logic");
    expect(out.non_voting).toBe(true);
    expect(out.not_implemented).toBeUndefined();
    expect(out.evidence_items).toHaveLength(0);          // nothing vote-bearing can ever reach a consensus call site
    expect(out.weight_validation ?? []).toHaveLength(0); // never enters the firewall
    expect(out.suggested_signal).toBeUndefined();
    expect(out.sourcing_logic?.contract_version).toBe(SOURCING_CONTRADICTION_CONTRACT_VERSION);
  });

  it("sourcing_logic has NO weight table and NO verdict weight (structural non-voting, both ends)", () => {
    expect(weightKeysForTrack("sourcing_logic")).toEqual([]);
    expect(TRACK_WEIGHTS["sourcing_logic"]).toBeUndefined();
  });

  it("derived-only (OQ-B3 lock): track5.ts imports no model runner and no acquisition plugin", () => {
    const src = readFileSync(join(process.cwd(), "lib", "research", "track5.ts"), "utf8");
    for (const banned of ["runModel", "runAnthropic", "serper", "whois", "loadDocumentPack", "fetch("]) {
      expect(src.includes(banned), `track5.ts must not reference ${banned} (derived-only ruling)`).toBe(false);
    }
  });

  it("AT-B1 unit analog: the verdict is BYTE-IDENTICAL with and without a sourcing_logic signal present", () => {
    const EMPTY_SYNTH: SynthesisOutput = {
      module_1_normalized_evidence: [], module_2_claim_attributions: [], module_3_assertions: [],
      module_4_contradictions: [], module_5_hypotheses: { hypotheses: [], what_would_change_the_leader: "" },
      module_6_risk_gaps: [], module_7_doubt_calibration: { doubt_level: "minimal", doubt_focus: "", rationale: "t" },
      module_8_vendor_questions: [],
      module_9_decision_snapshot: { headline: "", leading_interpretation: "", the_real_risk: "", what_to_verify: [], what_to_monitor: [] },
    };
    const base: Partial<Record<TrackKey, TrackSignal>> = {
      supplier_identity: "pass", supply_chain_relationship: "infer",
      brand_risk_assessment: "infer", documentation_review: "infer",
    };
    const withT5: Partial<Record<TrackKey, TrackSignal>> = { ...base, sourcing_logic: "n_a" };
    // adversarial: even a (never-produced) scoring signal on sourcing_logic must change NOTHING
    const adversarial: Partial<Record<TrackKey, TrackSignal>> = { ...base, sourcing_logic: "pass" };
    const a = JSON.stringify(computeVerdict(base, EMPTY_SYNTH));
    expect(JSON.stringify(computeVerdict(withT5, EMPTY_SYNTH))).toBe(a);
    expect(JSON.stringify(computeVerdict(adversarial, EMPTY_SYNTH))).toBe(a);
  });

  it("is deterministic: identical rows → byte-identical output (rejudge property, AT-B4's unit half)", async () => {
    const one = JSON.stringify(await runTrack5(ctx));
    rowsResult.mockResolvedValue({ data: healthyRows(), error: null });
    expect(JSON.stringify(await runTrack5(ctx))).toBe(one);
  });
});

describe("Track 5 — flags (derived-only)", () => {
  it("b2b archetype: stored b2b_only advisory metadata → b2b_archetype_flag + brands", async () => {
    rowsResult.mockResolvedValue({ data: [
      ...healthyRows().slice(0, 2),
      row(3, "brand_risk_assessment", "flag", { compiled_findings_json: { b2b_only_detected: true, b2b_only_brands: ["Petzl"] } }),
    ], error: null });
    const s = await sl();
    expect(s.b2b_archetype_flag).toBe(true);
    expect(s.b2b_brands).toEqual(["Petzl"]);
    expect(s.flags).toContain("b2b_only_archetype");
  });

  it("no_relationship_dimension: brands submitted but the plan ran no Track 2 (the Amendment-2 facet made visible)", async () => {
    rowsResult.mockResolvedValue({ data: [
      row(1, "supplier_identity", "pass", { evidence_items: [item("i1", "government_registration")] }),
      row(3, "brand_risk_assessment", "infer", { evidence_items: [item("i3", "no_enforcement_found")] }),
    ], error: null });
    const s = await sl({ ...ctx, plan_type: "single_99" });
    expect(s.flags).toContain("no_relationship_dimension");
    expect(s.scenario_coherence.assessment).toBe("consistent");
  });

  it("no_documentation_provided: Track 4 nothing_to_review → flag (an absence made visible, never a score)", async () => {
    rowsResult.mockResolvedValue({ data: [
      ...healthyRows().slice(0, 3),
      row(4, "documentation_review", "n_a", { compiled_findings_json: { nothing_to_review: true } }),
    ], error: null });
    expect((await sl()).flags).toContain("no_documentation_provided");
  });

  it("identity_unconfirmed: the resolved identity's own flag rides through", async () => {
    const s = await sl({ ...ctx, supplier_identity: { identity_unconfirmed: true } as TrackContext["supplier_identity"] });
    expect(s.flags).toContain("identity_unconfirmed");
  });
});

describe("Track 5 — contradiction records (m4c-1.0.0, AT-B3 shape locks)", () => {
  const vetoScenario = () => [
    row(1, "supplier_identity", "pass", { evidence_items: [item("i1", "government_registration")] }),
    row(2, "supply_chain_relationship", "hard_fail", { evidence_items: [item("w1", "counterfeit_channel")] }),
    row(3, "brand_risk_assessment", "infer", { evidence_items: [item("i3", "no_enforcement_found")] }),
    row(4, "documentation_review", "infer", { evidence_items: [item("d1", "invoice_full", "Petzl")] }),
  ];

  it("documentation comfort vs web risk: Track 4 positive + Track 2 veto → one record citing BOTH sides' evidence ids", async () => {
    rowsResult.mockResolvedValue({ data: vetoScenario(), error: null });
    const s = await sl();
    const rec = s.coherence_conflicts.find((c) => c.contradiction_type === "documentation_comfort_vs_web_risk");
    expect(rec).toBeDefined();
    expect(rec?.assertion_a.track_key).toBe("documentation_review");
    expect(rec?.assertion_a.evidence_ids).toContain("d1");
    expect(rec?.assertion_b.track_key).toBe("supply_chain_relationship");
    expect(rec?.assertion_b.evidence_ids).toContain("w1");
    expect(rec?.risk_level).toBe("high");
    expect(rec?.is_load_bearing).toBe(false); // load-bearing is Module 4's judgment, never code's
    expect(s.coherence_conflict_count).toBe(s.coherence_conflicts.length);
    expect(s.scenario_coherence.assessment).toBe("tension");
  });

  it("cross-track signal divergence: pass on one dimension, hard_fail on another → medium-risk record", async () => {
    rowsResult.mockResolvedValue({ data: [
      row(1, "supplier_identity", "pass", { evidence_items: [item("i1", "government_registration")] }),
      row(3, "brand_risk_assessment", "hard_fail", { evidence_items: [item("v1", "active_ip_complaints")] }),
    ], error: null });
    const s = await sl();
    const rec = s.coherence_conflicts.find((c) => c.contradiction_type === "cross_track_signal_divergence");
    expect(rec).toBeDefined();
    expect(rec?.assertion_a.track_key).toBe("supplier_identity");
    expect(rec?.assertion_b.track_key).toBe("brand_risk_assessment");
    expect(rec?.assertion_b.evidence_ids).toContain("v1");
    expect(rec?.risk_level).toBe("medium");
  });

  it("risk_level is NEVER critical — Track 5 cannot arm computeVerdict's critical-contradiction lock", async () => {
    rowsResult.mockResolvedValue({ data: vetoScenario(), error: null });
    const s = await sl();
    expect(s.coherence_conflicts.length).toBeGreaterThan(0);
    for (const c of s.coherence_conflicts) expect(["low", "medium", "high"]).toContain(c.risk_level);
  });

  it("every record carries the full frozen contract shape", async () => {
    rowsResult.mockResolvedValue({ data: vetoScenario(), error: null });
    const s = await sl();
    for (const c of s.coherence_conflicts) {
      expect(typeof c.contradiction_type).toBe("string");
      expect(Array.isArray(c.assertion_a.evidence_ids)).toBe(true);
      expect(Array.isArray(c.assertion_b.evidence_ids)).toBe(true);
      expect(typeof c.assertion_a.statement).toBe("string");
      expect(typeof c.interpretation).toBe("string");
      expect(typeof c.is_load_bearing).toBe("boolean");
    }
  });
});

// ── Sweep F6 (founder-approved 2026-07-14) — detector fan-out + the negative sides. ──
describe("Track 5 — detector fan-out (F6 coverage locks)", () => {
  it("TWO vetoing tracks against Track 4 positives → one documentation_comfort record EACH", async () => {
    rowsResult.mockResolvedValue({ data: [
      row(1, "supplier_identity", "infer", { evidence_items: [item("i1", "government_registration")] }),
      row(2, "supply_chain_relationship", "hard_fail", { evidence_items: [item("w1", "counterfeit_channel")] }),
      row(3, "brand_risk_assessment", "hard_fail", { evidence_items: [item("v1", "active_ip_complaints")] }),
      row(4, "documentation_review", "infer", { evidence_items: [item("d1", "invoice_full", "Petzl")] }),
    ], error: null });
    const s = await sl();
    const docRecs = s.coherence_conflicts.filter((c) => c.contradiction_type === "documentation_comfort_vs_web_risk");
    expect(docRecs).toHaveLength(2);
    expect(docRecs.map((c) => c.assertion_b.track_key).sort()).toEqual(["brand_risk_assessment", "supply_chain_relationship"]);
  });

  it("divergence is a full pass×hard_fail cross-product with the self-skip guard (2 pass × 1 hard_fail → 2 records)", async () => {
    rowsResult.mockResolvedValue({ data: [
      row(1, "supplier_identity", "pass", { evidence_items: [item("i1", "government_registration")] }),
      row(2, "supply_chain_relationship", "pass", { evidence_items: [item("i2", "dealer_page_listed")] }),
      row(3, "brand_risk_assessment", "hard_fail", { evidence_items: [item("v1", "active_ip_complaints")] }),
    ], error: null });
    const s = await sl();
    const div = s.coherence_conflicts.filter((c) => c.contradiction_type === "cross_track_signal_divergence");
    expect(div).toHaveLength(2);
    expect(div.map((c) => c.assertion_a.track_key).sort()).toEqual(["supplier_identity", "supply_chain_relationship"]);
    for (const c of div) expect(c.assertion_a.track_key).not.toBe(c.assertion_b.track_key); // self-skip holds
  });

  it("negative sides: flags ABSENT when Track 2 ran / Track 4 had content (two-sided property)", async () => {
    rowsResult.mockResolvedValue({ data: healthyRows(), error: null }); // tracks 1-4 all present with content
    const s = await sl();
    expect(s.flags).not.toContain("no_relationship_dimension");
    expect(s.flags).not.toContain("no_documentation_provided");
    expect(s.flags).not.toContain("identity_unconfirmed");
    expect(s.b2b_archetype_flag).toBe(false);
  });

  it("b2b brands UNION across rows, duplicates collapsed", async () => {
    rowsResult.mockResolvedValue({ data: [
      row(2, "supply_chain_relationship", "infer", { compiled_findings_json: { b2b_only_detected: true, b2b_only_brands: ["Petzl", "Bosch"] } }),
      row(3, "brand_risk_assessment", "flag", { compiled_findings_json: { b2b_only_detected: true, b2b_only_brands: ["Petzl"] } }),
    ], error: null });
    const s = await sl();
    expect(s.b2b_brands.sort()).toEqual(["Bosch", "Petzl"]);
  });
});

describe("Track 5 — honest edges", () => {
  it("zero rows → insufficient_data, no flags manufactured, never a failure", async () => {
    rowsResult.mockResolvedValue({ data: [], error: null });
    const out = await runTrack5(ctx);
    expect(out.non_voting).toBe(true);
    expect(out.acquisition_failed).toBeUndefined();
    expect(out.llm_failed).toBeUndefined();
    const s = out.sourcing_logic as SourcingLogicOutput;
    expect(s.scenario_coherence.assessment).toBe("insufficient_data");
    expect(s.coherence_conflict_count).toBe(0);
  });

  it("a DB read failure THROWS (H2 — the durable step retries; never a silent empty arbitration)", async () => {
    rowsResult.mockResolvedValue({ data: null, error: { message: "db down" } });
    await expect(runTrack5(ctx)).rejects.toThrow(/db down/);
  });

  it("reads only THIS attempt's rows (H1 — arbitration over the record being judged, not history)", async () => {
    rowsResult.mockResolvedValue({ data: [
      ...healthyRows(),
      row(2, "supply_chain_relationship", "hard_fail", { attempt_number: 1, evidence_items: [item("old1", "counterfeit_channel")] }),
    ], error: null });
    const s = await sl(); // attempt 2 — the attempt-1 veto must not manufacture a contradiction
    expect(s.coherence_conflicts.find((c) => c.assertion_b.evidence_ids.includes("old1"))).toBeUndefined();
  });
});
