import { describe, it, expect, vi, beforeEach } from "vitest";

const { gather, runModel, persistEvidencePack, persistAcquisitionMetrics, getEvidencePack } = vi.hoisted(() => ({
  gather: vi.fn(), runModel: vi.fn(),
  persistEvidencePack: vi.fn().mockResolvedValue({ error: null }),
  persistAcquisitionMetrics: vi.fn().mockResolvedValue({ error: null }),
  getEvidencePack: vi.fn(), // H7 (OQ-D) — replay pack loader
}));
vi.mock("@/lib/research/acquisition/orchestrator", () => ({ Orchestrator: class { gather = gather } }));
vi.mock("@/lib/data/acquisition", () => ({ persistEvidencePack, persistAcquisitionMetrics, getEvidencePack }));
vi.mock("@/lib/ai/runModel", () => ({ runModel }));

import { runTrack2 } from "./track2";
import type { TrackContext } from "@/lib/research/contracts";
import { IDENTITY_SCOPE_NOTE, AUTHORIZATION_SCOPE_NOTE, MARKETPLACE_ELIGIBILITY_DISCLAIMER } from "@/lib/research/track2.disclaimers";
import { containsProcurementLanguage } from "@/lib/research/procurementLanguage";

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

  // Track 4 gate (2026-07-11) — loa_legitimate gained an ALLOWED_PROFILES entry (["user_upload"])
  // for documentation_review, which REOPENS the provenance gate for Track 2 whenever a user_upload
  // source is cited (the key IS in Track 2's weight table, so the track gate passes). ADR-T2-001
  // now rests on the code backstop ALONE — load-bearing for the first time. This lock proves it holds.
  it("LOA backstop is LOAD-BEARING: a user_upload-cited loa_legitimate passes the firewall but STILL never scores in Track 2", async () => {
    const uploadSrc = { ...brandSrc(0), provenance: { ...brandSrc(0).provenance, source_profile: "user_upload", authority_score: "low" } };
    gather.mockResolvedValue(pack([uploadSrc]));
    runModel.mockResolvedValue(model({ evidence_items: [
      { evidence_id: "t2_e1", brand: "Lenovo", statement: "LOA uploaded", proposed_weight_key: "loa_legitimate", supporting_source_ids: ["src_0"], mapping_justification: "j", counter_evidence: "None", certainty: "verified", confidence: "high" },
    ], reasoning_notes: "", unknowns: [] }));
    const out = await runTrack2(ctx);
    expect(out.evidence_items.some((e) => e.weight_key === "loa_legitimate")).toBe(false);
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

  // ── ADR-T2-002 ─────────────────────────────────────────────────────────────────────────────────
  it("appends the three code-templated boundary notes verbatim, IDENTICAL regardless of evidence", async () => {
    gather.mockResolvedValue(pack([brandSrc(0)]));
    runModel.mockResolvedValue(model({ evidence_items: [
      { evidence_id: "t2_e1", brand: "Lenovo", statement: "strong", proposed_weight_key: "dealer_page_listed", supporting_source_ids: ["src_0"], mapping_justification: "j", counter_evidence: "None", certainty: "verified", confidence: "high" },
    ], brand_relationship_finding: "Lenovo: confirmed authorized distributor.", reasoning_notes: "", unknowns: [] }));
    const strong = await runTrack2(ctx);

    gather.mockResolvedValue(pack([brandSrc(1)]));
    runModel.mockResolvedValue(model({ evidence_items: [], brand_relationship_finding: "Bosch: no verified relationship — additional verification required.", reasoning_notes: "", unknowns: [] }));
    const weak = await runTrack2(ctx);

    expect(strong.identity_scope_note).toBe(IDENTITY_SCOPE_NOTE);
    expect(strong.authorization_scope_note).toBe(AUTHORIZATION_SCOPE_NOTE);
    expect(strong.marketplace_eligibility_disclaimer).toBe(MARKETPLACE_ELIGIBILITY_DISCLAIMER);
    // identical boilerplate on the strong AND the weak case (not conditional on evidence)
    expect(weak.identity_scope_note).toBe(strong.identity_scope_note);
    expect(weak.marketplace_eligibility_disclaimer).toBe(strong.marketplace_eligibility_disclaimer);
    // the finding itself flows from the model, and carries no procurement language
    expect(strong.brand_relationship_finding).toContain("Lenovo");
    expect(containsProcurementLanguage(strong.brand_relationship_finding ?? "")).toBe(false);
  });

  it("D2: feeds the resolved identity into the prompt when confidence is not low (no re-litigation)", async () => {
    gather.mockResolvedValue(pack([brandSrc(0)]));
    runModel.mockResolvedValue(model({ evidence_items: [], brand_relationship_finding: "", reasoning_notes: "", unknowns: [] }));
    const si = { original_input: { name: "TD Synexx", website: null }, resolved_name: "TD SYNNEX Corporation", resolved_domain: "tdsynnex.com", candidate_domains: [], registration_signals: [], identity_confidence: "high" as const, identity_unconfirmed: false, resolution_method: "normalized" as const, resolution_notes: "", resolution_audit: { winner: "tdsynnex.com", score: 0, runner_up: null, runner_up_score: 0, matched_by: ["provided"], warnings: [] } };
    await runTrack2({ ...ctx, vendor_name: "TD Synexx", supplier_identity: si });
    const promptUser = runModel.mock.calls[0][0].user as string;
    expect(promptUser).toMatch(/identity.*(resolved|settled)/i);
    expect(promptUser).toContain("TD SYNNEX Corporation");
  });

  it("consistency guard: unknowns present but zero questions_to_ask raises a non-blocking advisory", async () => {
    gather.mockResolvedValue(pack([brandSrc(0)]));
    runModel.mockResolvedValue(model({
      evidence_items: [], brand_relationship_finding: "Bosch: relationship unverified.",
      questions_to_ask: [], unknowns: [{ unknown: "SupplyOn portal listing", why_unresolvable: "not public", resolvable_by_client: true }],
      reasoning_notes: "base",
    }));
    const out = await runTrack2(ctx);
    expect(out.reasoning_notes).toMatch(/ADVISORY: unknowns present but/i);
  });
  it("no consistency advisory when questions_to_ask covers the unknowns", async () => {
    gather.mockResolvedValue(pack([brandSrc(0)]));
    runModel.mockResolvedValue(model({
      evidence_items: [], brand_relationship_finding: "Bosch: relationship unverified.",
      questions_to_ask: [{ question: "Confirm SupplyOn listing?", reason: "r", blocking_weight_key: "k", priority: "high", brand: "Bosch" }],
      unknowns: [{ unknown: "SupplyOn portal listing", why_unresolvable: "not public", resolvable_by_client: true }],
      reasoning_notes: "base",
    }));
    const out = await runTrack2(ctx);
    expect(out.reasoning_notes).not.toMatch(/ADVISORY: unknowns present but/i);
  });

  it("procurement guard: procurement language in brand_relationship_finding raises a non-blocking advisory", async () => {
    gather.mockResolvedValue(pack([brandSrc(0)]));
    runModel.mockResolvedValue(model({ evidence_items: [], brand_relationship_finding: "This vendor is safe to purchase from.", reasoning_notes: "base", unknowns: [] }));
    const out = await runTrack2(ctx);
    expect(out.reasoning_notes).toMatch(/ADVISORY: procurement language/i);
    // the finding itself is NOT rewritten/blocked — it still flows through for the reviewer to see
    expect(out.brand_relationship_finding).toContain("safe to purchase");
  });
});

describe("H2 — llm_failed (Track 2)", () => {
  const h2ctx: TrackContext = { case_id: "c1", vendor_name: "TD Synnex", vendor_website: "https://tdsynnex.com", brands_submitted: ["Lenovo"], marketplace: "amazon_us", plan_type: "growth_279" };
  const h2pack = { schema_version: "1.0.0", case_id: "c1", track_key: "supply_chain_relationship", evidence_hash: "h", collected_at: "t", sources: [{ url: "https://example.com/x", title: "t", snippet: "s", raw: {}, provenance: { provider: "Serper", provider_version: "v1", plugin: "serper", acquisition_method: "serper", source_profile: "news", source_type: "third_party", authority_score: "low", freshness_days: null, collected_at: "t", expires_at: "t", refresh_required: false } }] };
  it("unparseable model response sets llm_failed; thrown call sets llm_failed", async () => {
    gather.mockResolvedValue({ pack: h2pack, metrics: [] });
    runModel.mockResolvedValue({ json: { _parse_error: true }, model_provider: "a", model_version: "m", tokens: 1, cost_usd: 0.01, latency_ms: 1 });
    expect((await runTrack2(h2ctx)).llm_failed).toBe(true);
    gather.mockResolvedValue({ pack: h2pack, metrics: [] });
    runModel.mockRejectedValue(new Error("500"));
    expect((await runTrack2(h2ctx)).llm_failed).toBe(true);
  });
});
