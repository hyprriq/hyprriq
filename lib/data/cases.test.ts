import { describe, it, expect, vi, beforeEach } from "vitest";

// H5 — the findings data gate. Mock Clerk auth + the server supabase client (house pattern).
const { auth, maybeSingle, rowsResult, selectCalls } = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const rowsResult = vi.fn().mockResolvedValue({ data: [] });
  const selectCalls: string[] = [];
  return { auth: vi.fn().mockResolvedValue({ userId: "user_1" }), maybeSingle, rowsResult, selectCalls };
});
vi.mock("@clerk/nextjs/server", () => ({ auth }));
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({
    from: () => ({
      select: (cols: string) => {
        selectCalls.push(cols);
        const chain: Record<string, unknown> = {};
        Object.assign(chain, {
          eq: () => chain, gte: () => chain, is: () => chain, neq: () => chain,
          order: () => ({ then: (r: (v: unknown) => void, j: (e: unknown) => void) => rowsResult().then(r, j) }),
          maybeSingle,
        });
        return chain;
      },
    }),
  }),
}));

import { getCaseFindings } from "./cases";

beforeEach(() => {
  maybeSingle.mockReset();
  rowsResult.mockReset().mockResolvedValue({ data: [] });
  selectCalls.length = 0;
});

describe("H5 — getCaseFindings is server-gated by status (the N4 payload leak)", () => {
  it("returns [] for a NON-delivered case without even querying the findings table", async () => {
    maybeSingle.mockResolvedValue({ data: { id: "c1", status: "awaiting_review", delivered_attempt: null } });
    const rows = await getCaseFindings("c1");
    expect(rows).toEqual([]);
    // only the ownership/status query ran — findings never left the DB
    expect(selectCalls).toHaveLength(1);
  });

  it("returns findings for a delivered case, pinned to delivered_attempt, WITHOUT ai_output_json or manual_notes", async () => {
    maybeSingle.mockResolvedValue({ data: { id: "c1", status: "delivered", delivered_attempt: 1 } });
    rowsResult.mockResolvedValueOnce({ data: [
      { track: "track_1", attempt_number: 1, compiled_findings_json: { signal: "pass" } },
      { track: "track_1", attempt_number: 2, compiled_findings_json: { signal: "flag" } },
    ]});
    const rows = await getCaseFindings("c1");
    expect(rows).toHaveLength(1);
    expect((rows[0] as { attempt_number?: number }).attempt_number).toBe(1); // delivered pin (H1)
    const findingsSelect = selectCalls[1];
    expect(findingsSelect).not.toContain("ai_output_json");
    expect(findingsSelect).not.toContain("manual_notes");
    expect(findingsSelect).toContain("compiled_findings_json");
    expect(findingsSelect).toContain("questions_to_ask");
  });

  it("returns [] when the case is not owned by the caller", async () => {
    maybeSingle.mockResolvedValue({ data: null });
    expect(await getCaseFindings("c1")).toEqual([]);
  });
});
