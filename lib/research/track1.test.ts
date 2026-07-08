import { describe, it, expect, vi, beforeEach } from "vitest";

const { gather, runModel } = vi.hoisted(() => ({
  gather: vi.fn(),
  runModel: vi.fn(),
}));

vi.mock("@/lib/research/acquisition/orchestrator", () => ({ Orchestrator: class { gather = gather } }));
vi.mock("@/lib/data/acquisition", () => ({ persistEvidencePack: vi.fn().mockResolvedValue({ error: null }), persistAcquisitionMetrics: vi.fn().mockResolvedValue({ error: null }) }));
vi.mock("@/lib/ai/runModel", () => ({ runModel }));

import { runTrack1 } from "./track1";

import type { TrackContext } from "@/lib/research/contracts";
const ctx: TrackContext = { case_id: "c1", vendor_name: "Meridian Wholesale Co.", vendor_website: "https://meridian.example", brands_submitted: [], marketplace: "amazon_us", plan_type: "growth_279" };
const prov = (source_profile: string, source_type: string, authority_score: string) => ({ provider: "Serper", provider_version: "v1", plugin: "serper", acquisition_method: "serper", source_profile, source_type, authority_score, freshness_days: null, collected_at: "t", expires_at: "t", refresh_required: false });
const pack = (source_profile: string, source_type: string, authority: string) => ({ schema_version: "1.0.0", case_id: "c1", track_key: "supplier_identity", evidence_hash: "h", collected_at: "t", sources: [{ url: "https://sos.state.tx.us/x", title: "TX SOS", snippet: "active registration", raw: {}, provenance: prov(source_profile, source_type, authority) }] });
const item = (proposed_weight_key: string) => ({ evidence_items: [{ evidence_id: "t1_e1", statement: "registered", proposed_weight_key, supporting_source_ids: ["src_0"], mapping_justification: "SOS confirms", counter_evidence: "None found", certainty: "verified", confidence: "high" }], reasoning_notes: "ok", unknowns: [] });

beforeEach(() => { gather.mockReset(); runModel.mockReset(); });

describe("runTrack1", () => {
  it("validates a well-sourced government_registration proposal into an evidence_item with provenance + report", async () => {
    gather.mockResolvedValue({ pack: pack("government_record", "government_record", "high"), metrics: [{ plugin_id: "serper", latency_ms: 5, api_cost_usd: 0.0015, evidence_items_returned: 1 }] });
    runModel.mockResolvedValue({ json: item("government_registration"), model_provider: "a", model_version: "m", tokens: 10, cost_usd: 0.01, latency_ms: 1 });

    const out = await runTrack1(ctx);
    expect(out.track_key).toBe("supplier_identity");
    expect(out.evidence_items).toHaveLength(1);
    expect(out.evidence_items[0].weight_key).toBe("government_registration");
    expect(out.evidence_items[0].provenance?.source_profile).toBe("government_record");
    expect(out.weight_validation?.[0].validated_weight_key).toBe("government_registration");
    const report = out.track_validation_report as { artifact_type?: string; derived_signal?: string } | undefined;
    expect(report?.artifact_type).toBe("track_validation_report");
    expect(report?.derived_signal).toBeDefined();
  });

  it("drops a forum-sourced government key (provenance gate): no evidence_item, audit records rejection", async () => {
    gather.mockResolvedValue({ pack: pack("forum", "third_party", "low"), metrics: [] });
    runModel.mockResolvedValue({ json: item("government_registration"), model_provider: "a", model_version: "m", tokens: 1, cost_usd: 0, latency_ms: 1 });

    const out = await runTrack1(ctx);
    expect(out.evidence_items).toHaveLength(0);
    expect(out.weight_validation?.[0].rejection_reason).toBe("provenance");
  });

  it("acquisition-failure guard: an EMPTY pack flags acquisition_failed and never calls the model", async () => {
    gather.mockResolvedValue({ pack: { schema_version: "1.0.0", case_id: "c1", track_key: "supplier_identity", evidence_hash: "h", collected_at: "t", sources: [] }, metrics: [{ plugin_id: "serper", latency_ms: 1, api_cost_usd: 0, evidence_items_returned: 0 }] });
    const out = await runTrack1(ctx);
    expect(out.acquisition_failed).toBe(true);
    expect(out.evidence_items).toHaveLength(0);
    expect(out.weight_validation).toEqual([]);
    expect(runModel).not.toHaveBeenCalled(); // short-circuit: no doomed model call
    expect((out.track_validation_report as Record<string, unknown>)?.derived_signal).toBe("n_a");
  });
});

describe("H2 — llm_failed (model failure is a state, never a soft_fail)", () => {
  it("an unparseable model response sets llm_failed (nothing scored)", async () => {
    gather.mockResolvedValue({ pack: pack("government_record", "government_record", "high"), metrics: [] });
    runModel.mockResolvedValue({ json: { _parse_error: true, _raw: "garbled" }, model_provider: "a", model_version: "m", tokens: 1, cost_usd: 0.01, latency_ms: 1 });
    const out = await runTrack1(ctx);
    expect(out.llm_failed).toBe(true);
    expect(out.evidence_items).toHaveLength(0);
  });
  it("a thrown model call (API error / 429) sets llm_failed", async () => {
    gather.mockResolvedValue({ pack: pack("government_record", "government_record", "high"), metrics: [] });
    runModel.mockRejectedValue(new Error("429 rate limited"));
    const out = await runTrack1(ctx);
    expect(out.llm_failed).toBe(true);
  });
  it("a successful run does not set llm_failed", async () => {
    gather.mockResolvedValue({ pack: pack("government_record", "government_record", "high"), metrics: [] });
    runModel.mockResolvedValue({ json: item("government_registration"), model_provider: "a", model_version: "m", tokens: 1, cost_usd: 0.01, latency_ms: 1 });
    const out = await runTrack1(ctx);
    expect(out.llm_failed).toBe(false);
  });
});

describe("H7 (SO-4) — hard-fail consensus: veto keys must survive two extraction passes", () => {
  // registration_fabricated validates from ONE gov source (fixed-trust, no corroboration entry) —
  // the cleanest deterministic path to a VALIDATED hard-fail in a unit test.
  it("a hard-fail proposed in BOTH passes survives; consensus record rides on the output", async () => {
    gather.mockResolvedValue({ pack: pack("government_record", "government_record", "high"), metrics: [] });
    runModel
      .mockResolvedValueOnce({ json: item("registration_fabricated"), model_provider: "a", model_version: "m", tokens: 1, cost_usd: 0.01, latency_ms: 1 })
      .mockResolvedValueOnce({ json: item("registration_fabricated"), model_provider: "a", model_version: "m", tokens: 1, cost_usd: 0.01, latency_ms: 1 });
    const out = await runTrack1(ctx);
    expect(runModel).toHaveBeenCalledTimes(2);
    expect(out.evidence_items.map((e) => e.weight_key)).toEqual(["registration_fabricated"]);
    expect(out.hard_fail_consensus).toEqual({ checked: ["registration_fabricated"], dropped: [], second_call_failed: false });
  });
  it("a pass-1-only hard-fail is DROPPED and audited with gate 'consensus'", async () => {
    gather.mockResolvedValue({ pack: pack("government_record", "government_record", "high"), metrics: [] });
    runModel
      .mockResolvedValueOnce({ json: item("registration_fabricated"), model_provider: "a", model_version: "m", tokens: 1, cost_usd: 0.01, latency_ms: 1 })
      .mockResolvedValueOnce({ json: item("government_registration"), model_provider: "a", model_version: "m", tokens: 1, cost_usd: 0.01, latency_ms: 1 });
    const out = await runTrack1(ctx);
    expect(out.evidence_items).toHaveLength(0); // the veto never reaches the scorer
    expect(out.weight_validation?.[0]).toMatchObject({ validated_weight_key: null, gate: "consensus", rejection_reason: "consensus" });
    expect(out.hard_fail_consensus?.dropped).toEqual(["registration_fabricated"]);
  });
  it("OQ-A: a failed confirmation call KEEPS the veto and flags second_call_failed", async () => {
    gather.mockResolvedValue({ pack: pack("government_record", "government_record", "high"), metrics: [] });
    runModel
      .mockResolvedValueOnce({ json: item("registration_fabricated"), model_provider: "a", model_version: "m", tokens: 1, cost_usd: 0.01, latency_ms: 1 })
      .mockRejectedValueOnce(new Error("429 rate limited"));
    const out = await runTrack1(ctx);
    expect(out.evidence_items.map((e) => e.weight_key)).toEqual(["registration_fabricated"]);
    expect(out.hard_fail_consensus).toEqual({ checked: ["registration_fabricated"], dropped: [], second_call_failed: true });
    expect(out.llm_failed).toBe(false); // the FIRST pass succeeded — this is a consensus escalation, not an llm failure
  });
  it("no validated hard-fail → exactly ONE model call (the gate costs nothing on clean runs)", async () => {
    gather.mockResolvedValue({ pack: pack("government_record", "government_record", "high"), metrics: [] });
    runModel.mockResolvedValue({ json: item("government_registration"), model_provider: "a", model_version: "m", tokens: 1, cost_usd: 0.01, latency_ms: 1 });
    const out = await runTrack1(ctx);
    expect(runModel).toHaveBeenCalledTimes(1);
    expect(out.hard_fail_consensus).toBeUndefined();
  });
});

describe("H4 — Track 1 investigates the resolved entity and records it", () => {
  it("output carries research_identity { name, alias } from the resolved identity", async () => {
    gather.mockResolvedValue({ pack: pack("government_record", "government_record", "high"), metrics: [] });
    runModel.mockResolvedValue({ json: item("government_registration"), model_provider: "a", model_version: "m", tokens: 1, cost_usd: 0.01, latency_ms: 1 });
    const out = await runTrack1({
      ...ctx, vendor_name: "Bosch",
      supplier_identity: {
        original_input: { name: "Bosch", website: "https://globaldist.com" },
        resolved_name: "Global Distribution LLC", resolved_domain: "globaldist.com",
        candidate_domains: [], registration_signals: [], identity_confidence: "high",
        identity_unconfirmed: false, resolution_method: "resolved_from_website", resolution_notes: "",
        resolution_audit: { winner: "globaldist.com", score: 0, runner_up: null, runner_up_score: 0, matched_by: [], warnings: [] },
      },
    });
    expect(out.research_identity).toEqual({ name: "Global Distribution LLC", alias: "Bosch" });
    // and the prompt actually named the resolved entity
    const promptUser = runModel.mock.calls[0][0].user as string;
    expect(promptUser).toContain("Vendor: Global Distribution LLC");
    expect(promptUser).toContain('The client entered this supplier as "Bosch"');
  });
});
