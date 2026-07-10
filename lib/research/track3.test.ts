import { describe, it, expect, vi, beforeEach } from "vitest";

const { gather, runModel, persistEvidencePack, persistAcquisitionMetrics, getEvidencePack } = vi.hoisted(() => ({
  gather: vi.fn(), runModel: vi.fn(),
  persistEvidencePack: vi.fn().mockResolvedValue({ error: null }),
  persistAcquisitionMetrics: vi.fn().mockResolvedValue({ error: null }),
  getEvidencePack: vi.fn(),
}));
vi.mock("@/lib/research/acquisition/orchestrator", () => ({ Orchestrator: class { gather = gather } }));
vi.mock("@/lib/data/acquisition", () => ({ persistEvidencePack, persistAcquisitionMetrics, getEvidencePack }));
vi.mock("@/lib/ai/runModel", () => ({ runModel }));

import { runTrack3 } from "./track3";
import type { TrackContext } from "@/lib/research/contracts";

const ctx: TrackContext = { case_id: "c1", vendor_name: "TD Synnex", vendor_website: null, brands_submitted: ["Lenovo", "Bosch"], marketplace: "amazon_us", plan_type: "growth_279", attempt_number: 1 };

const srcOf = (i: number, profile: string, host = `s${i}.example`) => ({
  url: `https://${host}/p${i}`, title: "t", snippet: "s", raw: {},
  provenance: { provider: "Serper", provider_version: "v1", plugin: "serper", acquisition_method: "serper", source_profile: profile, source_type: "third_party", authority_score: "high", freshness_days: null, collected_at: "t", expires_at: "t", refresh_required: false },
});
const pack = (sources: unknown[]) => ({ pack: { schema_version: "1.1.0", case_id: "c1", track_key: "brand_risk_assessment", sources, evidence_hash: "h", collected_at: "t" }, metrics: [] });
const model = (json: unknown) => ({ json, model_provider: "anthropic", model_version: "claude-sonnet-4-6", tokens: 10, cost_usd: 0, latency_ms: 1 });
const item = (over: Record<string, unknown> = {}) => ({
  evidence_id: "t3_e1", brand: "Lenovo", statement: "s", proposed_weight_key: "reseller_friendly",
  supporting_source_ids: ["src_0"], mapping_justification: "j", counter_evidence: "None found",
  certainty: "verified", confidence: "high", ...over,
});
const payload = (items: unknown[], over: Record<string, unknown> = {}) => ({
  evidence_items: items, brand_risk_finding: "part1. part2. part3.",
  analyst_reading: { most_likely: "ml", alternative: "alt", confidence: "medium", what_would_change_my_mind: "w" },
  questions_to_ask: [], reasoning_notes: "ok", unknowns: [], ...over,
});

beforeEach(() => { gather.mockReset(); runModel.mockReset(); getEvidencePack.mockReset(); });

describe("runTrack3 (LIVE — replaces the H3 stub)", () => {
  it("is no longer a stub, and carries the finding + analyst quartet on the output", async () => {
    gather.mockResolvedValue(pack([srcOf(0, "official_brand")]));
    runModel.mockResolvedValue(model(payload([item()])));
    const out = await runTrack3(ctx);
    expect(out.not_implemented).toBeUndefined();
    expect(out.track_key).toBe("brand_risk_assessment");
    expect(out.evidence_items[0]).toMatchObject({ weight_key: "reseller_friendly", brand: "Lenovo", supports: "brand_risk_assessment" });
    expect(out.brand_risk_finding).toBe("part1. part2. part3.");
    expect(out.analyst_reading?.most_likely).toBe("ml");
    expect(out.research_identity?.name).toBe("TD Synnex");
  });

  it("a veto with TWO distinct sources survives the firewall AND two-pass consensus", async () => {
    gather.mockResolvedValue(pack([srcOf(0, "news", "a.example"), srcOf(1, "government_record", "b.example")]));
    const veto = item({ proposed_weight_key: "active_ip_complaints", supporting_source_ids: ["src_0", "src_1"] });
    runModel
      .mockResolvedValueOnce(model(payload([veto])))
      .mockResolvedValueOnce(model(payload([veto]))); // consensus pass agrees
    const out = await runTrack3(ctx);
    expect(out.evidence_items.some((e) => e.weight_key === "active_ip_complaints")).toBe(true);
    expect(out.hard_fail_consensus).toMatchObject({ checked: ["active_ip_complaints"], dropped: [], second_call_failed: false });
  });

  it("a veto proposed in pass 1 only is DROPPED with gate: consensus", async () => {
    gather.mockResolvedValue(pack([srcOf(0, "news", "a.example"), srcOf(1, "government_record", "b.example")]));
    runModel
      .mockResolvedValueOnce(model(payload([item({ proposed_weight_key: "active_ip_complaints", supporting_source_ids: ["src_0", "src_1"] })])))
      .mockResolvedValueOnce(model(payload([item({ proposed_weight_key: "brand_enforcement_signals" })])));
    const out = await runTrack3(ctx);
    expect(out.evidence_items.some((e) => e.weight_key === "active_ip_complaints")).toBe(false);
    expect(out.weight_validation?.some((v) => v.gate === "consensus")).toBe(true);
  });

  it("a failed consensus second call KEEPS the veto and flags for escalation (OQ-A)", async () => {
    gather.mockResolvedValue(pack([srcOf(0, "news", "a.example"), srcOf(1, "government_record", "b.example")]));
    runModel
      .mockResolvedValueOnce(model(payload([item({ proposed_weight_key: "active_ip_complaints", supporting_source_ids: ["src_0", "src_1"] })])))
      .mockRejectedValueOnce(new Error("boom"));
    const out = await runTrack3(ctx);
    expect(out.evidence_items.some((e) => e.weight_key === "active_ip_complaints")).toBe(true);
    expect(out.hard_fail_consensus?.second_call_failed).toBe(true);
    expect(out.llm_failed).toBe(false); // first pass succeeded — consensus escalation, not llm failure
  });

  it("a SINGLE-source veto is corroboration-rejected (SO-2, all four keys)", async () => {
    gather.mockResolvedValue(pack([srcOf(0, "news")]));
    runModel.mockResolvedValue(model(payload([item({ proposed_weight_key: "confirmed_amazon_restrictions", supporting_source_ids: ["src_0"] })])));
    const out = await runTrack3(ctx);
    expect(out.evidence_items).toHaveLength(0);
    expect(out.weight_validation?.[0]).toMatchObject({ gate: "corroboration" });
  });

  it("unknown ≠ negative: UNKNOWN proposals score nothing and are recorded as llm_returned_unknown", async () => {
    gather.mockResolvedValue(pack([srcOf(0, "news")]));
    runModel.mockResolvedValue(model(payload([item({ proposed_weight_key: "UNKNOWN" })])));
    const out = await runTrack3(ctx);
    expect(out.evidence_items).toHaveLength(0);
    expect(out.weight_validation?.[0].rejection_reason).toBe("llm_returned_unknown");
    expect(out.llm_failed).toBe(false);
  });

  it("empty pack → acquisition_failed, no model call", async () => {
    gather.mockResolvedValue(pack([]));
    const out = await runTrack3(ctx);
    expect(out.acquisition_failed).toBe(true);
    expect(runModel).not.toHaveBeenCalled();
  });

  it("H2: thrown model call and unparseable output both set llm_failed", async () => {
    gather.mockResolvedValue(pack([srcOf(0, "news")]));
    runModel.mockRejectedValueOnce(new Error("429"));
    expect((await runTrack3(ctx)).llm_failed).toBe(true);
    gather.mockResolvedValue(pack([srcOf(0, "news")]));
    runModel.mockResolvedValueOnce(model({ garbage: true }));
    expect((await runTrack3(ctx)).llm_failed).toBe(true);
  });

  it("H7 replay: loads the stored pack instead of live acquisition", async () => {
    getEvidencePack.mockResolvedValue({ pack: pack([srcOf(0, "official_brand")]).pack, error: null });
    runModel.mockResolvedValue(model(payload([item()])));
    const out = await runTrack3({ ...ctx, replay_from_attempt: 2 });
    expect(gather).not.toHaveBeenCalled();
    expect(getEvidencePack).toHaveBeenCalledWith("c1", "brand_risk_assessment", 2);
    expect(out.evidence_items).toHaveLength(1);
  });

  it("procurement language in brand_risk_finding raises the advisory (never blocks)", async () => {
    gather.mockResolvedValue(pack([srcOf(0, "official_brand")]));
    runModel.mockResolvedValue(model(payload([item()], { brand_risk_finding: "Safe to purchase from this brand." })));
    const out = await runTrack3(ctx);
    expect(out.reasoning_notes).toContain("ADVISORY");
    expect(out.brand_risk_finding).toContain("Safe to purchase"); // preserved, not rewritten (H5: prevent, don't launder)
  });
});
