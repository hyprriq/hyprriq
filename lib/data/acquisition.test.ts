import { describe, it, expect, vi, beforeEach } from "vitest";

const { insert, from } = vi.hoisted(() => {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn(() => ({ insert }));
  return { insert, from };
});
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: { from } }));

import { persistEvidencePack, persistAcquisitionMetrics } from "./acquisition";

beforeEach(() => { insert.mockClear(); from.mockClear(); });

describe("acquisition persistence", () => {
  it("writes the evidence pack to case_evidence_packs", async () => {
    await persistEvidencePack({ case_id: "c1", track_key: "supplier_identity", sources: [], collected_at: "2026-06-27T00:00:00.000Z" });
    expect(from).toHaveBeenCalledWith("case_evidence_packs");
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ case_id: "c1", track_key: "supplier_identity" }));
  });
  it("writes one metrics row per plugin", async () => {
    await persistAcquisitionMetrics("c1", "supplier_identity", [
      { plugin_id: "serper", latency_ms: 10, api_cost_usd: 0, evidence_items_returned: 2 },
    ]);
    expect(from).toHaveBeenCalledWith("case_acquisition_metrics");
    expect(insert).toHaveBeenCalledWith([expect.objectContaining({ case_id: "c1", plugin_id: "serper", evidence_items_returned: 2 })]);
  });
});
