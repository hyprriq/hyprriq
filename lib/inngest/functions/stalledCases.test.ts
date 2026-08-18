import { describe, it, expect, vi, beforeEach } from "vitest";

// Chainable cases-select + windowed audit_log read + audit insert. sendAdminAlert mocked.
const { from, casesResult, auditSelectResult, auditInsert, sendAdminAlert } = vi.hoisted(() => {
  const casesResult = vi.fn().mockResolvedValue({ data: [] });
  const auditSelectResult = vi.fn().mockResolvedValue({ data: [] });
  const casesChain: Record<string, unknown> = {};
  Object.assign(casesChain, {
    select: vi.fn(() => casesChain),
    in: vi.fn(() => casesChain),
    is: vi.fn(() => casesChain),
    then: (res: (v: unknown) => void, rej: (e: unknown) => void) => casesResult().then(res, rej),
  });
  const auditChain: Record<string, unknown> = {};
  Object.assign(auditChain, {
    select: vi.fn(() => auditChain),
    eq: vi.fn(() => auditChain),
    gte: vi.fn(() => auditChain),
    limit: vi.fn(() => auditChain),
    then: (res: (v: unknown) => void, rej: (e: unknown) => void) => auditSelectResult().then(res, rej),
  });
  const auditInsert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn((table: string) =>
    table === "audit_log" ? { ...auditChain, insert: auditInsert } : casesChain,
  );
  return { from, casesResult, auditSelectResult, auditInsert, sendAdminAlert: vi.fn().mockResolvedValue({ sent: true }) };
});
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: { from } }));
vi.mock("@/lib/email/notify", () => ({ sendAdminAlert }));

import { selectStalled, sweepStalledCases, STALLED_STATUSES, type StalledCandidate } from "./stalledCases";

const NOW = new Date("2026-08-18T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

beforeEach(() => {
  from.mockClear(); auditInsert.mockClear(); sendAdminAlert.mockClear();
  casesResult.mockReset().mockResolvedValue({ data: [] });
  auditSelectResult.mockReset().mockResolvedValue({ data: [] });
});

describe("selectStalled — the age fallback is what makes this alarm real", () => {
  it("uses sla_deadline when it exists", () => {
    const rows: StalledCandidate[] = [
      { id: "a", case_number: "AWI-1", status: "awaiting_review", sla_deadline: hoursAgo(3), created_at: hoursAgo(4) },
    ];
    expect(selectStalled(rows, NOW)[0]).toMatchObject({ hoursOverdue: 3 });
  });

  // 37 of 39 live cases have a NULL sla_deadline (the column predates the 2026-08-12 ruling).
  // Without this branch the alarm would watch 2 cases and ignore 37.
  it("falls back to created_at + 24h when sla_deadline is NULL", () => {
    const rows: StalledCandidate[] = [
      { id: "b", case_number: "AWI-2", status: "manual_override_required", sla_deadline: null, created_at: hoursAgo(30) },
    ];
    const [got] = selectStalled(rows, NOW);
    expect(got.hoursOverdue).toBe(6);
    expect(got.effectiveDeadline).toBe(hoursAgo(6));
  });

  it("ignores a case still inside its window, by either clock", () => {
    const rows: StalledCandidate[] = [
      { id: "c", case_number: "AWI-3", status: "awaiting_review", sla_deadline: null, created_at: hoursAgo(2) },
      { id: "d", case_number: "AWI-4", status: "awaiting_review", sla_deadline: new Date(NOW.getTime() + 3_600_000).toISOString(), created_at: hoursAgo(50) },
    ];
    expect(selectStalled(rows, NOW)).toEqual([]);
  });

  it("sorts worst-first so the digest leads with the oldest", () => {
    const rows: StalledCandidate[] = [
      { id: "e", case_number: "NEW", status: "awaiting_review", sla_deadline: hoursAgo(1), created_at: hoursAgo(2) },
      { id: "f", case_number: "OLD", status: "awaiting_review", sla_deadline: hoursAgo(400), created_at: hoursAgo(401) },
    ];
    expect(selectStalled(rows, NOW).map((r) => r.case_number)).toEqual(["OLD", "NEW"]);
  });
});

describe("sweepStalledCases — alerts without ever touching a case", () => {
  const overdueRow = { id: "x1", case_number: "AWI-2608-034", status: "awaiting_review", sla_deadline: hoursAgo(5), created_at: hoursAgo(29) };

  it("watches the human-wait states the watchdog deliberately exempts", () => {
    expect([...STALLED_STATUSES]).toEqual(["awaiting_review", "manual_override_required"]);
  });

  it("pages once and writes NO case update — only audit rows", async () => {
    casesResult.mockResolvedValue({ data: [overdueRow] });
    expect(await sweepStalledCases(NOW)).toBe(1);
    expect(sendAdminAlert).toHaveBeenCalledTimes(1);
    // The mutation guard: `cases` is only ever read here. Any update would surface as an
    // `update` call on the cases chain, which this mock does not even provide.
    expect(from).not.toHaveBeenCalledWith("case_track_results");
    expect(auditInsert).toHaveBeenCalledTimes(1);
    expect(auditInsert.mock.calls[0][0].new_value).toMatchObject({ stalled_alert: true, status: "awaiting_review" });
  });

  it("records the PAGER's own outcome — a failed send must not read as a quiet system", async () => {
    casesResult.mockResolvedValue({ data: [overdueRow] });
    sendAdminAlert.mockResolvedValueOnce({ sent: false, reason: "no_admin_inbox" });
    await sweepStalledCases(NOW);
    expect(auditInsert.mock.calls[0][0].new_value).toMatchObject({ alert_sent: false, alert_reason: "no_admin_inbox" });
  });

  it("names which clock fired, so a NULL sla_deadline is visible in the record", async () => {
    casesResult.mockResolvedValue({ data: [{ ...overdueRow, sla_deadline: null, created_at: hoursAgo(40) }] });
    await sweepStalledCases(NOW);
    expect(auditInsert.mock.calls[0][0].new_value).toMatchObject({ deadline_source: "created_at+CASE_SLA_HOURS" });
  });

  it("does not re-page a case it already paged inside the window", async () => {
    casesResult.mockResolvedValue({ data: [overdueRow] });
    auditSelectResult.mockResolvedValue({ data: [{ record_id: "x1", new_value: { stalled_alert: true } }] });
    expect(await sweepStalledCases(NOW)).toBe(0);
    expect(sendAdminAlert).not.toHaveBeenCalled();
    expect(auditInsert).not.toHaveBeenCalled();
  });

  it("stays silent when nothing is overdue", async () => {
    casesResult.mockResolvedValue({ data: [{ ...overdueRow, sla_deadline: null, created_at: hoursAgo(1) }] });
    expect(await sweepStalledCases(NOW)).toBe(0);
    expect(sendAdminAlert).not.toHaveBeenCalled();
  });
});
