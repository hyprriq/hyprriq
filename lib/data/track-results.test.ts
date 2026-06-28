import { describe, it, expect, vi, beforeEach } from "vitest";

const { upsert, from } = vi.hoisted(() => {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn(() => ({ upsert }));
  return { upsert, from };
});
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: { from } }));

import { upsertTrackResult } from "./track-results";

beforeEach(() => { upsert.mockClear(); from.mockClear(); });

describe("upsertTrackResult — Phase 5.1b columns", () => {
  it("passes weight_validation + classification metrics + report through to the row", async () => {
    await upsertTrackResult({
      case_id: "c1", track: "track_1", track_key: "supplier_identity", track_number: 1,
      weight_validation: [{ evidence_id: "e1", proposed_weight_key: "k", validated_weight_key: "k", gate: null, rejection_reason: null, validation_version: "1.0.0" }],
      classifications_total: 1, classifications_accepted: 1, classifications_rejected: 0,
      classifications_unknown: 0, acceptance_rate: 1, track_validation_report: { artifact_type: "track_validation_report" },
    });
    expect(from).toHaveBeenCalledWith("case_track_results");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        weight_validation: expect.any(Array),
        classifications_total: 1, classifications_accepted: 1, acceptance_rate: 1,
        track_validation_report: expect.objectContaining({ artifact_type: "track_validation_report" }),
      }),
      expect.anything(),
    );
  });
});
