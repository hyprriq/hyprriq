import { describe, it, expect, vi, beforeEach } from "vitest";

// House pattern (see intelligence.test.ts): hoisted fns + vi.mock of the supabase admin client.
// getNextAttemptNumber chain: from(t).select().eq().order().limit().maybeSingle()
// upsertTrackResult chain:    from(t).upsert(row, opts)
const { maybeSingle, from, upsert, fromCalls } = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const limit = vi.fn(() => ({ maybeSingle }));
  const order = vi.fn(() => ({ limit }));
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const fromCalls: string[] = [];
  const from = vi.fn((table: string) => {
    fromCalls.push(table);
    return { select, upsert };
  });
  return { maybeSingle, from, upsert, fromCalls };
});
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: { from } }));

import { getNextAttemptNumber, upsertTrackResult } from "./track-results";

beforeEach(() => {
  from.mockClear(); upsert.mockClear(); maybeSingle.mockReset();
  fromCalls.length = 0;
});

describe("upsertTrackResult — Phase 5.1b columns", () => {
  it("passes weight_validation + classification metrics + report through to the row", async () => {
    await upsertTrackResult({
      case_id: "c1", track: "track_1", track_key: "supplier_identity", track_number: 1, attempt_number: 1,
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

describe("getNextAttemptNumber (H1 Case Investigation Ledger)", () => {
  it("returns 1 for a case with no prior rows or packs", async () => {
    maybeSingle.mockResolvedValue({ data: null });
    expect(await getNextAttemptNumber("c1")).toBe(1);
    // consults BOTH history tables
    expect(fromCalls).toEqual(expect.arrayContaining(["case_track_results", "case_evidence_packs"]));
  });

  it("returns max(track rows, packs)+1 — packs count even where track rows were overwritten pre-H1", async () => {
    maybeSingle
      .mockResolvedValueOnce({ data: { attempt_number: 1 } })   // case_track_results max
      .mockResolvedValueOnce({ data: { attempt_number: 4 } });  // case_evidence_packs max (July-4 history)
    expect(await getNextAttemptNumber("c1")).toBe(5);
  });
});

describe("upsertTrackResult (H1)", () => {
  it("writes the caller's attempt_number — no hardcoded 1", async () => {
    await upsertTrackResult({ case_id: "c1", track: "track_1", track_key: "supplier_identity", track_number: 1, attempt_number: 2 });
    expect(upsert.mock.calls[0][0].attempt_number).toBe(2);
    expect(upsert.mock.calls[0][1]).toEqual({ onConflict: "case_id,track,attempt_number" });
  });
});
