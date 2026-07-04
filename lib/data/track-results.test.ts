import { describe, it, expect, vi, beforeEach } from "vitest";

// House pattern (see intelligence.test.ts): hoisted fns + vi.mock of the supabase admin client.
// One flexible chain serves all three query shapes:
//   getNextAttemptNumber: from(t).select().eq().order().limit().maybeSingle()
//   getCaseTrackResults:  from(t).select().eq().is().order()            ← awaited directly (thenable)
//   upsertTrackResult:    from(t).upsert(row, opts)
const { maybeSingle, from, upsert, fromCalls, rowsResult } = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const rowsResult = vi.fn().mockResolvedValue({ data: [] });
  const chain: Record<string, unknown> = {};
  Object.assign(chain, {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    maybeSingle,
    then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) => rowsResult().then(resolve, reject),
  });
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const fromCalls: string[] = [];
  const from = vi.fn((table: string) => {
    fromCalls.push(table);
    return { ...chain, upsert };
  });
  return { maybeSingle, from, upsert, fromCalls, rowsResult };
});
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: { from } }));

import { getNextAttemptNumber, getCaseTrackResults, upsertTrackResult } from "./track-results";

beforeEach(() => {
  from.mockClear(); upsert.mockClear(); maybeSingle.mockReset();
  rowsResult.mockReset().mockResolvedValue({ data: [] });
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

describe("getCaseTrackResults (H1 attempt-aware read)", () => {
  it("returns only the LATEST attempt's rows by default", async () => {
    rowsResult.mockResolvedValueOnce({ data: [
      { track: "track_1", attempt_number: 1, track_verdict_signal: "hard_fail" },
      { track: "track_1", attempt_number: 2, track_verdict_signal: "pass" },
    ]});
    const rows = await getCaseTrackResults("c1");
    expect(rows).toHaveLength(1);
    expect(rows[0].attempt_number).toBe(2);
    expect(rows[0].track_verdict_signal).toBe("pass");
  });

  it("returns a pinned attempt when requested explicitly", async () => {
    rowsResult.mockResolvedValueOnce({ data: [
      { track: "track_1", attempt_number: 1, track_verdict_signal: "hard_fail" },
      { track: "track_1", attempt_number: 2, track_verdict_signal: "pass" },
    ]});
    const rows = await getCaseTrackResults("c1", 1);
    expect(rows).toHaveLength(1);
    expect(rows[0].track_verdict_signal).toBe("hard_fail");
  });

  it("treats legacy NULL attempt_number as attempt 1", async () => {
    rowsResult.mockResolvedValueOnce({ data: [
      { track: "track_0", attempt_number: null, track_verdict_signal: "n_a" },
      { track: "track_1", attempt_number: 1, track_verdict_signal: "infer" },
    ]});
    const rows = await getCaseTrackResults("c1");
    expect(rows).toHaveLength(2);
  });
});
