import { describe, it, expect, vi, beforeEach } from "vitest";

const { insert, upsert, from } = vi.hoisted(() => {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn(() => ({ insert, upsert }));
  return { insert, upsert, from };
});
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: { from } }));

import { persistEvidencePack, persistAcquisitionMetrics } from "./acquisition";

beforeEach(() => { insert.mockClear(); upsert.mockClear(); from.mockClear(); });

describe("acquisition persistence", () => {
  it("writes the evidence pack to case_evidence_packs under the caller's attempt (H1)", async () => {
    await persistEvidencePack({ schema_version: "1.0.0", case_id: "c1", track_key: "supplier_identity", sources: [], evidence_hash: "abc", collected_at: "2026-06-27T00:00:00.000Z" }, 1);
    expect(from).toHaveBeenCalledWith("case_evidence_packs");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ case_id: "c1", track_key: "supplier_identity", evidence_hash: "abc", schema_version: "1.0.0", attempt_number: 1 }),
      { onConflict: "case_id,track_key,attempt_number" },
    );
  });
  it("persistEvidencePack upserts on (case_id, track_key, attempt_number) — step retries never duplicate a pack", async () => {
    await persistEvidencePack({ schema_version: "1.0.0", case_id: "c1", track_key: "supplier_identity", sources: [], evidence_hash: "abc", collected_at: "2026-06-27T00:00:00.000Z" }, 2);
    const [row, opts] = upsert.mock.calls[0];
    expect(row.attempt_number).toBe(2);
    expect(opts).toEqual({ onConflict: "case_id,track_key,attempt_number" });
  });
  it("writes one metrics row per plugin", async () => {
    await persistAcquisitionMetrics("c1", "supplier_identity", [
      { plugin_id: "serper", latency_ms: 10, api_cost_usd: 0.0003, evidence_items_returned: 2, retry_count: 1, final_status: "ok" },
    ]);
    expect(from).toHaveBeenCalledWith("case_acquisition_metrics");
    expect(insert).toHaveBeenCalledWith([expect.objectContaining({ case_id: "c1", plugin_id: "serper", evidence_items_returned: 2, retry_count: 1, final_status: "ok" })]);
  });
});
