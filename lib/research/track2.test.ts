import { describe, it, expect, vi, beforeEach } from "vitest";

const { gather, runModel, persistEvidencePack, persistAcquisitionMetrics } = vi.hoisted(() => ({
  gather: vi.fn(), runModel: vi.fn(),
  persistEvidencePack: vi.fn().mockResolvedValue({ error: null }),
  persistAcquisitionMetrics: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock("@/lib/research/acquisition/orchestrator", () => ({ Orchestrator: class { gather = gather } }));
vi.mock("@/lib/data/acquisition", () => ({ persistEvidencePack, persistAcquisitionMetrics }));
vi.mock("@/lib/ai/runModel", () => ({ runModel }));

import { runTrack2 } from "./track2";
import type { TrackContext } from "@/lib/research/contracts";

const ctx: TrackContext = { case_id: "c1", vendor_name: "TD Synnex", vendor_website: null, brands_submitted: ["Lenovo", "Bosch"], marketplace: "amazon_us", plan_type: "growth_279" };

const brandSrc = (i: number) => ({
  url: `https://brand${i}.example/dealers`, title: "Authorized Dealers", snippet: "listed", raw: {},
  provenance: { provider: "Serper", provider_version: "v1", plugin: "serper", acquisition_method: "serper", source_profile: "official_brand", source_type: "third_party", authority_score: "high", freshness_days: null, collected_at: "t", expires_at: "t", refresh_required: false },
});
const pack = (sources: unknown[]) => ({ pack: { schema_version: "1.0.0", case_id: "c1", track_key: "supply_chain_relationship", sources, evidence_hash: "h", collected_at: "t" }, metrics: [] });
const model = (json: unknown) => ({ json, model_provider: "anthropic", model_version: "claude-sonnet-4-6", tokens: 10, cost_usd: 0, latency_ms: 1 });

beforeEach(() => { gather.mockReset(); runModel.mockReset(); });

describe("runTrack2", () => {
  it("validates an official_brand dealer_page_listed into a brand-isolated evidence_item", async () => {
    gather.mockResolvedValue(pack([brandSrc(0)]));
    runModel.mockResolvedValue(model({ evidence_items: [
      { evidence_id: "t2_e1", brand: "Lenovo", statement: "on dealer page", proposed_weight_key: "dealer_page_listed", supporting_source_ids: ["src_0"], mapping_justification: "j", counter_evidence: "None found", certainty: "verified", confidence: "high" },
    ], auth_level: "A", auth_level_reasoning: "r", b2b_only_detected: false, b2b_only_brands: [], questions_to_ask: [], reasoning_notes: "ok", unknowns: [] }));
    const out = await runTrack2(ctx);
    expect(out.track_key).toBe("supply_chain_relationship");
    expect(out.evidence_items).toHaveLength(1);
    expect(out.evidence_items[0].weight_key).toBe("dealer_page_listed");
    expect(out.evidence_items[0].brand).toBe("Lenovo");
    expect(out.evidence_items[0].provenance?.source_profile).toBe("official_brand");
    expect(out.auth_level).toBe("A");
  });

  it("isolates evidence per brand (two brands, same key, different sources)", async () => {
    gather.mockResolvedValue(pack([brandSrc(0), brandSrc(1)]));
    runModel.mockResolvedValue(model({ evidence_items: [
      { evidence_id: "t2_e1", brand: "Lenovo", statement: "x", proposed_weight_key: "dealer_page_listed", supporting_source_ids: ["src_0"], mapping_justification: "j", counter_evidence: "None", certainty: "verified", confidence: "high" },
      { evidence_id: "t2_e2", brand: "Bosch", statement: "y", proposed_weight_key: "dealer_page_listed", supporting_source_ids: ["src_1"], mapping_justification: "j", counter_evidence: "None", certainty: "verified", confidence: "high" },
    ], reasoning_notes: "", unknowns: [] }));
    const out = await runTrack2(ctx);
    expect(out.evidence_items.map((e) => e.brand).sort()).toEqual(["Bosch", "Lenovo"]);
  });

  it("LOA backstop: a proposed loa_legitimate never appears in scored evidence_items", async () => {
    gather.mockResolvedValue(pack([brandSrc(0)]));
    runModel.mockResolvedValue(model({ evidence_items: [
      { evidence_id: "t2_e1", brand: "Lenovo", statement: "LOA uploaded", proposed_weight_key: "loa_legitimate", supporting_source_ids: ["src_0"], mapping_justification: "j", counter_evidence: "None", certainty: "verified", confidence: "high" },
    ], reasoning_notes: "", unknowns: [] }));
    const out = await runTrack2(ctx);
    expect(out.evidence_items.some((e) => e.weight_key === "loa_legitimate")).toBe(false);
    expect(out.evidence_items).toHaveLength(0);
  });

  it("empty pack → acquisition_failed, no model call", async () => {
    gather.mockResolvedValue(pack([]));
    const out = await runTrack2(ctx);
    expect(out.acquisition_failed).toBe(true);
    expect(runModel).not.toHaveBeenCalled();
  });

  it("passes questions_to_ask through", async () => {
    gather.mockResolvedValue(pack([brandSrc(0)]));
    runModel.mockResolvedValue(model({ evidence_items: [], questions_to_ask: [{ question: "Confirm Lenovo distribution?", reason: "no direct confirmation", blocking_weight_key: "dealer_page_listed" }], reasoning_notes: "", unknowns: [] }));
    const out = await runTrack2(ctx);
    expect(out.questions_to_ask?.[0].question).toContain("Lenovo");
  });
});
