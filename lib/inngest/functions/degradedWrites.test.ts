import { describe, it, expect, vi, beforeEach } from "vitest";

// ── ADR-G006 ITEM-4 TRIPWIRE (founder-ruled 2026-07-28, with the loud-but-non-fatal RATIFICATION):
// non-fatal is correct; non-fatal and UNNOTICED is not. The degraded-write audit rows
// (memory_write_failed · synthesis_extension_dropped · category_compliance_dropped) were the only
// record of corpus/extension erosion, and nothing surfaced them — this sweep is the pager. ──

const { selectResult, sendAdminAlert } = vi.hoisted(() => ({
  selectResult: vi.fn().mockResolvedValue({ data: [] }),
  sendAdminAlert: vi.fn().mockResolvedValue({ sent: true }),
}));
vi.mock("@/lib/supabase/admin", () => {
  const chain: Record<string, unknown> = {};
  Object.assign(chain, {
    select: vi.fn(() => chain), gte: vi.fn(() => chain), eq: vi.fn(() => chain),
    order: vi.fn(() => chain), limit: vi.fn(() => chain),
    then: (res: (v: unknown) => void, rej: (e: unknown) => void) => selectResult().then(res, rej),
  });
  return { supabaseAdmin: { from: vi.fn(() => chain) } };
});
vi.mock("@/lib/email/notify", () => ({ sendAdminAlert }));

import { pickDegradedWrites, sweepDegradedWrites, DEGRADED_WRITE_KEYS } from "./degradedWrites";

beforeEach(() => { selectResult.mockReset().mockResolvedValue({ data: [] }); sendAdminAlert.mockClear(); });

describe("G006 item-4 tripwire — degraded-write sweep", () => {
  it("watches the three degraded-write audit families", () => {
    expect(DEGRADED_WRITE_KEYS).toEqual(["memory_write_failed", "synthesis_extension_dropped", "category_compliance_dropped"]);
  });

  it("pickDegradedWrites keeps only rows whose new_value carries a degraded key (the pure brain)", () => {
    const rows = [
      { record_id: "c1", created_at: "t1", new_value: { memory_write_failed: "vendor(x): boom" } },
      { record_id: "c2", created_at: "t2", new_value: { watchdog: "stuck_case" } },
      { record_id: "c3", created_at: "t3", new_value: { synthesis_extension_dropped: true, reason: "no column" } },
      { record_id: "c4", created_at: "t4", new_value: null },
      { record_id: "c5", created_at: "t5", new_value: { category_compliance_dropped: true, reason: "CHECK" } },
    ];
    expect(pickDegradedWrites(rows).map((r) => r.record_id)).toEqual(["c1", "c3", "c5"]);
  });

  it("a sweep with hits sends ONE admin digest naming each case + failure family", async () => {
    selectResult.mockResolvedValue({ data: [
      { record_id: "case-9", created_at: "2026-07-28T01:00:00Z", new_value: { memory_write_failed: "vendor(acme): timeout" } },
    ] });
    const n = await sweepDegradedWrites();
    expect(n).toBe(1);
    expect(sendAdminAlert).toHaveBeenCalledTimes(1);
    const [subject, html] = sendAdminAlert.mock.calls[0];
    expect(subject).toMatch(/degraded write/i);
    expect(html).toContain("case-9");
    expect(html).toContain("memory_write_failed");
  });

  it("a clean sweep sends nothing (a daily empty email trains the founder to ignore the pager)", async () => {
    const n = await sweepDegradedWrites();
    expect(n).toBe(0);
    expect(sendAdminAlert).not.toHaveBeenCalled();
  });
});
