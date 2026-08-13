import { describe, it, expect } from "vitest";
import { buildWeeklyCaseSeries } from "./dashboard-charts";

// Chart truth locks (design ruling 2026-08-13): the dashboard charts draw ONLY these computed
// series — created-per-week and median hours-to-deliver per delivery week. No estimation.

const MON = Date.UTC(2026, 7, 10); // Mon 10 Aug 2026 00:00 UTC
const now = MON + 2 * 24 * 3_600_000; // a Wednesday inside that week

const iso = (t: number) => new Date(t).toISOString();

describe("buildWeeklyCaseSeries", () => {
  it("returns the requested number of week buckets ending at the current week, labeled by Monday", () => {
    const series = buildWeeklyCaseSeries([], now, 8);
    expect(series).toHaveLength(8);
    expect(series[7].label).toBe("10 Aug"); // current week
    expect(series[6].label).toBe("3 Aug");
    expect(series[0].label).toBe("22 Jun"); // 7 weeks back
  });

  it("counts created cases in their creation week and ignores cases outside the window", () => {
    const series = buildWeeklyCaseSeries(
      [
        { created_at: iso(MON + 3_600_000), delivered_at: null }, // current week
        { created_at: iso(MON - 3 * 24 * 3_600_000), delivered_at: null }, // previous week
        { created_at: iso(MON - 60 * 24 * 3_600_000), delivered_at: null }, // before window
      ],
      now,
      8,
    );
    expect(series[7].created).toBe(1);
    expect(series[6].created).toBe(1);
    expect(series.reduce((s, w) => s + w.created, 0)).toBe(2);
  });

  it("medians hours-to-deliver by DELIVERY week; weeks without deliveries stay null (no fabrication)", () => {
    const created = MON - 10 * 24 * 3_600_000; // created before the window is fine — delivery week counts
    const series = buildWeeklyCaseSeries(
      [
        { created_at: iso(created), delivered_at: iso(created + 20 * 3_600_000) }, // 20h — lands 2 weeks back? (created Fri 31 Jul + 20h = same week)
        { created_at: iso(MON), delivered_at: iso(MON + 18 * 3_600_000) }, // 18h, current week
        { created_at: iso(MON), delivered_at: iso(MON + 30 * 3_600_000) }, // 30h, current week
      ],
      now,
      8,
    );
    expect(series[7].medianHours).toBe(24); // median of 18 and 30
    expect(series[7].deliveredCount).toBe(2);
    expect(series[5].medianHours).toBe(20);
    expect(series[6].medianHours).toBeNull();
    expect(series[6].deliveredCount).toBe(0);
  });

  it("rejects unparsable dates and negative durations instead of charting them", () => {
    const series = buildWeeklyCaseSeries(
      [
        { created_at: "not-a-date", delivered_at: iso(MON) },
        { created_at: iso(MON + 3_600_000), delivered_at: iso(MON) }, // delivered before created
      ],
      now,
      8,
    );
    expect(series[7].medianHours).toBeNull();
    expect(series[7].created).toBe(1); // the bad-delivery row still has a real created_at
  });
});
