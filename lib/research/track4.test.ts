import { describe, it, expect, vi, beforeEach } from "vitest";

const { loadDocumentPack, runModel, persistEvidencePack, persistAcquisitionMetrics, getEvidencePack } = vi.hoisted(() => ({
  loadDocumentPack: vi.fn(), runModel: vi.fn(),
  persistEvidencePack: vi.fn().mockResolvedValue({ error: null }),
  persistAcquisitionMetrics: vi.fn().mockResolvedValue({ error: null }),
  getEvidencePack: vi.fn(),
}));
vi.mock("@/lib/research/acquisition/documentPack", () => ({ loadDocumentPack }));
vi.mock("@/lib/data/acquisition", () => ({ persistEvidencePack, persistAcquisitionMetrics, getEvidencePack }));
vi.mock("@/lib/ai/runModel", () => ({ runModel }));

import { runTrack4 } from "./track4";
import type { TrackContext } from "@/lib/research/contracts";

const ctx: TrackContext = { case_id: "c1", vendor_name: "TD Synnex", vendor_website: null, brands_submitted: ["Lenovo"], marketplace: "amazon_us", plan_type: "growth_279", attempt_number: 1 };

const docSrc = (path: string) => ({
  url: path, title: `${path.split("/").pop()} (invoice_pdf)`, snippet: "INVOICE #123 extracted text", raw: {},
  provenance: { provider: "ClientUpload", provider_version: "v1", plugin: "manual", acquisition_method: "manual", source_profile: "user_upload", source_type: "vendor_self_assertion", authority_score: "low", freshness_days: null, collected_at: "t", expires_at: "t", refresh_required: false },
});
const packOf = (sources: unknown[], unreadable: { file_name: string; reason: string }[] = []) => ({
  pack: { schema_version: "1.1.0", case_id: "c1", track_key: "documentation_review", sources, evidence_hash: "h", collected_at: "t" },
  metrics: [], unreadable,
});
const model = (json: unknown) => ({ json, model_provider: "anthropic", model_version: "claude-sonnet-4-6", tokens: 10, cost_usd: 0, latency_ms: 1 });
const item = (over: Record<string, unknown> = {}) => ({
  evidence_id: "t4_e1", brand: "", statement: "s", proposed_weight_key: "invoice_full",
  supporting_source_ids: ["src_0"], mapping_justification: "j", counter_evidence: "None found",
  certainty: "verified", confidence: "high", ...over,
});
const payload = (items: unknown[]) => ({
  evidence_items: items, documentation_finding: "part1. part2. part3.",
  analyst_reading: { most_likely: "ml", alternative: "alt", confidence: "medium", what_would_change_my_mind: "w" },
  questions_to_ask: [], reasoning_notes: "ok", unknowns: [],
});

beforeEach(() => { loadDocumentPack.mockReset(); runModel.mockReset(); getEvidencePack.mockReset(); });

describe("runTrack4 (LIVE — replaces the H3 stub)", () => {
  it("reviews an uploaded invoice: validated key, finding + quartet on the output", async () => {
    loadDocumentPack.mockResolvedValue(packOf([docSrc("cases/c1/invoice.pdf")]));
    runModel.mockResolvedValue(model(payload([item()])));
    const out = await runTrack4(ctx);
    expect(out.not_implemented).toBeUndefined();
    expect(out.track_key).toBe("documentation_review");
    expect(out.evidence_items[0]).toMatchObject({ weight_key: "invoice_full", supports: "documentation_review" });
    expect(out.documentation_finding).toBe("part1. part2. part3.");
    expect(out.analyst_reading?.most_likely).toBe("ml");
    expect(out.research_identity?.name).toBe("TD Synnex");
  });

  it("OQ-A4: a SINGLE-document veto survives the firewall AND two-pass consensus", async () => {
    loadDocumentPack.mockResolvedValue(packOf([docSrc("cases/c1/invoice.pdf")]));
    const veto = item({ proposed_weight_key: "document_alteration" });
    runModel.mockResolvedValueOnce(model(payload([veto]))).mockResolvedValueOnce(model(payload([veto])));
    const out = await runTrack4(ctx);
    expect(out.evidence_items.some((e) => e.weight_key === "document_alteration")).toBe(true);
    expect(out.hard_fail_consensus).toMatchObject({ checked: ["document_alteration"], dropped: [], second_call_failed: false });
  });

  it("a pass-1-only veto drops at consensus; a failed second call keeps it and escalates (OQ-A semantics)", async () => {
    loadDocumentPack.mockResolvedValue(packOf([docSrc("cases/c1/invoice.pdf")]));
    runModel
      .mockResolvedValueOnce(model(payload([item({ proposed_weight_key: "retail_receipt_as_wholesale" })])))
      .mockResolvedValueOnce(model(payload([item()])));
    const dropped = await runTrack4(ctx);
    expect(dropped.evidence_items.some((e) => e.weight_key === "retail_receipt_as_wholesale")).toBe(false);
    expect(dropped.weight_validation?.some((v) => v.gate === "consensus")).toBe(true);

    loadDocumentPack.mockResolvedValue(packOf([docSrc("cases/c1/invoice.pdf")]));
    runModel
      .mockResolvedValueOnce(model(payload([item({ proposed_weight_key: "retail_receipt_as_wholesale" })])))
      .mockRejectedValueOnce(new Error("boom"));
    const kept = await runTrack4(ctx);
    expect(kept.evidence_items.some((e) => e.weight_key === "retail_receipt_as_wholesale")).toBe(true);
    expect(kept.hard_fail_consensus?.second_call_failed).toBe(true);
  });

  // ── Sweep F6 (founder-approved 2026-07-14) — the MIXED path: readable + unreadable together.
  // Pre-F6 every unreadable test had sources.length === 0; the wiring that hands the unreadable
  // list to the prompt on the READABLE branch was unverified (a refactor dropping it would
  // silently lose the "request a text-bearing copy" flow for partially-unreadable uploads). ──
  it("F6: MIXED uploads (one readable + one unreadable) → prompt receives the unreadable list, review proceeds", async () => {
    loadDocumentPack.mockResolvedValue(packOf(
      [docSrc("cases/c1/invoice.pdf")],
      [{ file_name: "scan.jpg", reason: "image-only document — no text layer (v1)" }],
    ));
    runModel.mockResolvedValue(model(payload([item()])));
    const out = await runTrack4(ctx);
    expect(out.nothing_to_review).toBeUndefined();
    expect(out.acquisition_failed).toBeUndefined();
    expect(out.evidence_items).toHaveLength(1); // the readable document was reviewed
    // the unreadable file reached the prompt's user block (buildTrack4Prompt ctx.unreadable wiring)
    const call = runModel.mock.calls[0][0] as { system: string; user: string };
    expect(call.user).toContain("scan.jpg");
    expect(call.user).toContain("UNREADABLE");
  });

  it("OQ-A3: ZERO uploads → nothing_to_review (an absence, never a failure) — no model call", async () => {
    loadDocumentPack.mockResolvedValue(packOf([]));
    const out = await runTrack4(ctx);
    expect(out.nothing_to_review).toBe(true);
    expect(out.acquisition_failed).toBeUndefined();
    expect(out.reasoning_notes).toMatch(/no documents were provided/i);
    expect(runModel).not.toHaveBeenCalled();
  });

  it("uploaded-but-ALL-unreadable → acquisition_failed (a human can read what v1 cannot) — distinct from absence", async () => {
    loadDocumentPack.mockResolvedValue(packOf([], [{ file_name: "scan.jpg", reason: "image-only" }]));
    const out = await runTrack4(ctx);
    expect(out.acquisition_failed).toBe(true);
    expect(out.nothing_to_review).toBeUndefined();
    expect(out.reasoning_notes).toContain("scan.jpg");
    expect(runModel).not.toHaveBeenCalled();
  });

  it("H2: thrown model call and unparseable output both set llm_failed", async () => {
    loadDocumentPack.mockResolvedValue(packOf([docSrc("cases/c1/invoice.pdf")]));
    runModel.mockRejectedValueOnce(new Error("429"));
    expect((await runTrack4(ctx)).llm_failed).toBe(true);
    loadDocumentPack.mockResolvedValue(packOf([docSrc("cases/c1/invoice.pdf")]));
    runModel.mockResolvedValueOnce(model({ garbage: true }));
    expect((await runTrack4(ctx)).llm_failed).toBe(true);
  });

  // ── Pre-freeze fix (founder-ruled 2026-07-12, from A1/Mazel — the first live case). Signal-level
  // assertions close the test hole that let the A1 interaction ship untested. ──
  const derived = (out: { track_validation_report?: Record<string, unknown> }) => out.track_validation_report?.derived_signal;

  it("(a) single clean document → infer (invoice_full = 4; signal asserted, not just items)", async () => {
    loadDocumentPack.mockResolvedValue(packOf([docSrc("cases/c1/invoice.pdf")]));
    runModel.mockResolvedValue(model(payload([item()])));
    const out = await runTrack4(ctx);
    expect(derived(out)).toBe("infer");
  });

  it("(b) single document with a real, uncontested non-veto defect → flag", async () => {
    loadDocumentPack.mockResolvedValue(packOf([docSrc("cases/c1/invoice.pdf")]));
    runModel.mockResolvedValue(model(payload([item({ proposed_weight_key: "document_missing_fields" })])));
    const out = await runTrack4(ctx);
    expect(derived(out)).toBe("flag");
    expect(out.evidence_items).toHaveLength(1);
  });

  it("FIX 1 — the A1 path: a consensus-DROPPED veto must not leave its same-source suppression behind", async () => {
    loadDocumentPack.mockResolvedValue(packOf([docSrc("cases/c1/invoice.pdf")]));
    const three = [
      item({ evidence_id: "EV-001", proposed_weight_key: "invoice_full" }),
      item({ evidence_id: "EV-002", proposed_weight_key: "document_missing_fields" }),
      item({ evidence_id: "EV-004", proposed_weight_key: "document_alteration" }), // the corrupted-text-layer veto
    ];
    runModel
      .mockResolvedValueOnce(model(payload(three)))
      .mockResolvedValueOnce(model(payload(three.slice(0, 2)))); // pass 2: veto not re-proposed → consensus drops it
    const out = await runTrack4(ctx);
    // The suppressed evidence is RESTORED once the veto that killed it is revoked:
    const keys = out.evidence_items.map((e) => e.weight_key).sort();
    expect(keys).toEqual(["document_missing_fields", "invoice_full"]);
    // The signal reflects the REAL evidence (4 − 2 = 2 → flag), never the empty-set soft_fail:
    expect(derived(out)).toBe("flag");
    expect(derived(out)).not.toBe("soft_fail");
    // The audit trail keeps the truth: the veto's consensus rejection stays on the record.
    expect(out.weight_validation?.some((v) => v.rejection_reason === "consensus" && v.proposed_weight_key === "document_alteration")).toBe(true);
    expect(out.hard_fail_consensus).toMatchObject({ dropped: ["document_alteration"], second_call_failed: false });
  });

  it("a consensus-CONFIRMED veto still suppresses coexisting same-source findings (the rule is untouched)", async () => {
    loadDocumentPack.mockResolvedValue(packOf([docSrc("cases/c1/invoice.pdf")]));
    const three = [
      item({ evidence_id: "EV-001", proposed_weight_key: "invoice_full" }),
      item({ evidence_id: "EV-004", proposed_weight_key: "document_alteration" }),
    ];
    runModel.mockResolvedValueOnce(model(payload(three))).mockResolvedValueOnce(model(payload([three[1]])));
    const out = await runTrack4(ctx);
    expect(out.evidence_items.map((e) => e.weight_key)).toEqual(["document_alteration"]); // veto real → suppression stands
    expect(derived(out)).toBe("hard_fail");
  });

  it("(d) multi-document clean → infer; FIX 2 lock: distinct document sources count and lift the cap", async () => {
    loadDocumentPack.mockResolvedValue(packOf([docSrc("cases/c1/invoice.pdf"), docSrc("cases/c1/po.pdf")]));
    runModel.mockResolvedValue(model(payload([
      item({ evidence_id: "EV-001", proposed_weight_key: "invoice_full", supporting_source_ids: ["src_0"] }),
      item({ evidence_id: "EV-002", proposed_weight_key: "po_on_letterhead", supporting_source_ids: ["src_1"] }),
    ])));
    const out = await runTrack4(ctx);
    expect(derived(out)).toBe("infer"); // 4 + 3 = 7
    expect(out.evidence_items.map((e) => e.source_url).sort()).toEqual(["cases/c1/invoice.pdf", "cases/c1/po.pdf"]);
  });

  it("FIX 2 lock: a PASS shape caps on one document (distinct_sources 1) and stands on two (distinct_sources 2)", async () => {
    const { applySourceDiversityCap } = await import("./sourceDiversity");
    const one = applySourceDiversityCap("pass", [{ source_url: "user_a/c1/invoice.pdf" }, { source_url: "user_a/c1/invoice.pdf" }]);
    expect(one).toMatchObject({ signal: "infer", capped: true, distinct_sources: 1 });
    const two = applySourceDiversityCap("pass", [{ source_url: "user_a/c1/invoice.pdf" }, { source_url: "user_a/c1/loa.pdf" }]);
    expect(two).toMatchObject({ signal: "pass", capped: false, distinct_sources: 2 });
  });

  it("H7 replay: loads the stored pack; the document pack builder is never called", async () => {
    getEvidencePack.mockResolvedValue({ pack: packOf([docSrc("cases/c1/invoice.pdf")]).pack, error: null });
    runModel.mockResolvedValue(model(payload([item()])));
    const out = await runTrack4({ ...ctx, replay_from_attempt: 2 });
    expect(loadDocumentPack).not.toHaveBeenCalled();
    expect(getEvidencePack).toHaveBeenCalledWith("c1", "documentation_review", 2);
    expect(out.evidence_items).toHaveLength(1);
  });
});
