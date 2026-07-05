import { describe, it, expect, vi, beforeEach } from "vitest";

// Chainable cases-select mock + per-case update mock + audit insert. sendAdminAlert mocked.
const { from, wedgedResult, casesUpdateEq, auditInsert, sendAdminAlert } = vi.hoisted(() => {
  const wedgedResult = vi.fn().mockResolvedValue({ data: [] });
  const chain: Record<string, unknown> = {};
  Object.assign(chain, {
    select: vi.fn(() => chain),
    in: vi.fn(() => chain),
    lt: vi.fn(() => chain),
    is: vi.fn(() => chain),
    then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) => wedgedResult().then(resolve, reject),
  });
  const casesUpdateEq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq: casesUpdateEq }));
  const auditInsert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn((table: string) =>
    table === "audit_log" ? { insert: auditInsert } : { ...chain, update },
  );
  return { from, wedgedResult, casesUpdateEq, auditInsert, sendAdminAlert: vi.fn().mockResolvedValue({ sent: true }) };
});
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: { from } }));
vi.mock("@/lib/email/notify", () => ({ sendAdminAlert }));

import { sweepWedgedCases, WEDGE_STATUSES, WEDGE_MAX_AGE_MINUTES } from "./watchdog";

beforeEach(() => {
  from.mockClear(); casesUpdateEq.mockClear(); auditInsert.mockClear(); sendAdminAlert.mockClear();
  wedgedResult.mockReset().mockResolvedValue({ data: [] });
});

describe("H2 watchdog — sweepWedgedCases", () => {
  it("sweeps the three wedge statuses only, older than the cutoff", () => {
    expect(WEDGE_STATUSES).toEqual(["pending_intake", "queued", "research_running"]);
    expect(WEDGE_MAX_AGE_MINUTES).toBe(30);
  });

  it("flips each wedged case to research_failed with an audit row, and alerts once", async () => {
    wedgedResult.mockResolvedValueOnce({ data: [
      { id: "c1", case_number: "AWI-1", status: "research_running", updated_at: "2026-06-28T00:00:00Z" },
      { id: "c2", case_number: "AWI-2", status: "pending_intake", updated_at: "2026-06-23T00:00:00Z" },
    ]});
    const swept = await sweepWedgedCases();
    expect(swept).toBe(2);
    expect(casesUpdateEq).toHaveBeenCalledTimes(2);
    expect(auditInsert).toHaveBeenCalledTimes(2);
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      record_id: "c1",
      new_value: expect.objectContaining({ watchdog: "stuck_case", prior_status: "research_running" }),
    }));
    expect(sendAdminAlert).toHaveBeenCalledTimes(1);
  });

  it("no wedged cases → no updates, no alert", async () => {
    const swept = await sweepWedgedCases();
    expect(swept).toBe(0);
    expect(casesUpdateEq).not.toHaveBeenCalled();
    expect(sendAdminAlert).not.toHaveBeenCalled();
  });
});
