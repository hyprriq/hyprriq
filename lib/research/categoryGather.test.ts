import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TrackContext } from "@/lib/research/contracts";

// ── Track 6 — DECISION A (founder-ruled): the LIVE category gather, REUSING the
// marketplace_signals question type. Ruling basis, on the record: the question label is
// ROUTING-ONLY — the serper plugin ignores it and searches `input`; the label is never persisted
// (not in the pack, not in provenance, not in metrics) — so reuse stores nothing misleading and
// touches no union. The pack keys under track_key "category_compliance" (DECISION B's widen), so
// the frozen replay/audit record is HONEST about whose research this is. ──

const { gatherMock, persistMock } = vi.hoisted(() => ({
  gatherMock: vi.fn(),
  persistMock: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock("@/lib/research/acquisition/orchestrator", () => ({
  Orchestrator: class { gather = gatherMock; },
}));
vi.mock("@/lib/data/acquisition", () => ({ persistEvidencePack: persistMock }));

import { buildCategoryRequests, liveCategoryGather } from "@/lib/research/categoryGather";

const ctx = (over: Partial<TrackContext> = {}): TrackContext => ({
  case_id: "case-1", vendor_name: "Acme", vendor_website: null, marketplace: "amazon_us",
  brands_submitted: ["Optimum Nutrition", "Lenovo"], plan_type: "scale_499", attempt_number: 3, ...over,
});

beforeEach(() => {
  gatherMock.mockReset().mockResolvedValue({
    pack: { schema_version: "1.1.0", case_id: "case-1", track_key: "category_compliance", sources: [], evidence_hash: "h", collected_at: "t" },
    metrics: [],
  });
  persistMock.mockClear().mockResolvedValue({ error: null });
});

describe("Decision A — buildCategoryRequests (per brand, marketplace_signals, Hop-1 category questions)", () => {
  it("emits requests for EVERY submitted brand, ALL routed via marketplace_signals (reuse ruling — no union widen for the question)", () => {
    const reqs = buildCategoryRequests(["Optimum Nutrition", "Lenovo"]);
    expect(reqs.length).toBeGreaterThanOrEqual(2);
    expect(reqs.every((r) => r.question === "marketplace_signals")).toBe(true);
    for (const brand of ["Optimum Nutrition", "Lenovo"]) {
      expect(reqs.some((r) => r.input.includes(brand)), `a request must research ${brand}`).toBe(true);
    }
  });

  it("the inputs are CATEGORY-DISCOVERY searches (what does the brand sell), never gating/eligibility searches", () => {
    for (const r of buildCategoryRequests(["Bosch"])) {
      expect(/categor|sell|product/i.test(r.input)).toBe(true);
      expect(/ungat|gated|restricted|eligib/i.test(r.input), `query must not seek gating status: ${r.input}`).toBe(false);
    }
  });

  it("no brands ⇒ no requests (never a manufactured search)", () => {
    expect(buildCategoryRequests([])).toEqual([]);
  });
});

describe("Decision A — liveCategoryGather (the Track6Deps.gather implementation)", () => {
  it("gathers via the Orchestrator under track_key category_compliance (DECISION B's widened key — the pack record is honest about whose research this is)", async () => {
    await liveCategoryGather(ctx());
    expect(gatherMock).toHaveBeenCalledTimes(1);
    const req = gatherMock.mock.calls[0][0];
    expect(req.case_id).toBe("case-1");
    expect(req.track_key).toBe("category_compliance");
    expect(req.requests.every((r: { question: string }) => r.question === "marketplace_signals")).toBe(true);
  });

  it("persists the evidence pack for THIS attempt (replay/audit — the H2 input-of-record discipline)", async () => {
    await liveCategoryGather(ctx());
    expect(persistMock).toHaveBeenCalledTimes(1);
    const [pack, attempt] = persistMock.mock.calls[0];
    expect(pack.track_key).toBe("category_compliance");
    expect(attempt).toBe(3);
  });

  it("a pack-persist failure THROWS (H2 — the frozen input-of-record either persists or the run does not count; categoryStep contains it non-fatally)", async () => {
    persistMock.mockResolvedValue({ error: "boom" });
    await expect(liveCategoryGather(ctx())).rejects.toThrow(/persist/i);
  });

  it("returns the pack + metrics in the Track6Deps.gather shape", async () => {
    const r = await liveCategoryGather(ctx());
    expect(r.pack.sources).toEqual([]);
    expect(Array.isArray(r.metrics)).toBe(true);
  });
});
