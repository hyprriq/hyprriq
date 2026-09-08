import { describe, it, expect } from "vitest";
import {
  parseKeepaCountCsv, readSellerCounts, readBrandLevel, priceHeldDuring,
  type CountPoint,
} from "./sellerCountReading";

// Fixtures are the GUIDE'S OWN EXAMPLES (docs/KEEPA_READING_GUIDE_recovered.md §P4.2/P4.3),
// so the classifier is tested against the founder's method, not against itself.

const DAY = 86_400_000;
const T0 = new Date("2026-01-01T00:00:00Z").getTime();
const series = (counts: (number | null)[], stepDays = 14): CountPoint[] =>
  counts.flatMap((c, i) => (c == null ? [] : [{ date: new Date(T0 + i * stepDays * DAY), count: c }]));

describe("parseKeepaCountCsv — keepa minutes and gaps", () => {
  it("converts keepa minutes and drops -1 gaps (a gap is not a zero-seller observation)", () => {
    // keepaMinutes = unixMs/60000 - 21564000
    const t = (ms: number) => ms / 60_000 - 21_564_000;
    const pts = parseKeepaCountCsv([t(T0), 12, t(T0 + DAY), -1, t(T0 + 2 * DAY), 9]);
    expect(pts.map((p) => p.count)).toEqual([12, 9]);
    expect(pts[0].date.getTime()).toBe(T0);
  });
});

describe("readSellerCounts — the seven patterns, from the guide's examples", () => {
  it("§P4.2 row 1 — flat ~38 over a year reads open_market_stable_high", () => {
    const r = readSellerCounts(series([38, 37, 39, 38, 36, 40, 38, 39, 37, 38, 39, 38, 37, 38, 39, 38, 37, 38, 39, 38, 37, 38, 39, 38, 40, 38]));
    expect(r.pattern).toBe("open_market_stable_high");
    expect(r.trendDirection).toBe("stable");
  });

  it("§P4.2 row 2 — 30 Jan → 22 Mar → 18 Jun reads gradual_decline", () => {
    const r = readSellerCounts(series([30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 21, 20, 19, 18]));
    expect(r.pattern).toBe("gradual_decline");
    expect(r.trendDirection).toBe("decreasing");
  });

  it("§P4.6 + §P4.2 row 3 — the cliff: steady 38 then →4 inside 60 days", () => {
    const r = readSellerCounts(series([38, 37, 38, 39, 38, 37, 38, 39, 38, 24, 9, 4, 4, 4]));
    expect(r.pattern).toBe("enforcement_cliff");
    expect(r.drop).not.toBeNull();
    expect(r.drop!.from).toBeGreaterThanOrEqual(20);
    expect(r.drop!.fraction).toBeGreaterThan(0.5);
    expect(r.drop!.days).toBeLessThanOrEqual(60);
  });

  it("the >50%-in-60-days law needs the row-3 peak: 8→3 on a small listing is NOT a cliff", () => {
    const r = readSellerCounts(series([8, 8, 7, 8, 8, 7, 8, 3, 3, 3, 3, 3]));
    expect(r.pattern).not.toBe("enforcement_cliff");
  });

  it("§P4.2 row 4 — 2-3 sellers for 6+ months reads already_locked_down", () => {
    const r = readSellerCounts(series([3, 2, 3, 3, 2, 2, 3, 3, 2, 3, 2, 3, 3, 2, 3, 2]));
    expect(r.pattern).toBe("already_locked_down");
  });

  it("§P4.2 row 5 — 8,15,4,12,3,18 reads volatile_unstable", () => {
    const r = readSellerCounts(series([8, 15, 4, 12, 3, 18, 7, 14, 5, 16, 6, 13]));
    expect(r.pattern).toBe("volatile_unstable");
  });

  it("§P4.2 row 6 — 5 → 15 over months reads rising_trend", () => {
    const r = readSellerCounts(series([5, 5, 6, 7, 7, 8, 9, 10, 11, 12, 13, 14, 15, 15]));
    expect(r.pattern).toBe("rising_trend");
  });

  it("§P4.2 row 7 — constant 1 reads brand_direct_only", () => {
    const r = readSellerCounts(series([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]));
    expect(r.pattern).toBe("brand_direct_only");
  });

  it("stable at 8 matches NO guide row — stable_unclassified, never a borrowed pattern name", () => {
    const r = readSellerCounts(series([8, 8, 9, 8, 8, 7, 8, 8, 9, 8, 8, 8, 9, 8]));
    expect(r.pattern).toBe("stable_unclassified");
  });

  it("too little history is said plainly — insufficient_history, not a guess", () => {
    expect(readSellerCounts(series([12, 11, 12])).pattern).toBe("insufficient_history");
    expect(readSellerCounts([]).pattern).toBe("insufficient_history");
  });

  it("peak and current are the exact numbers the report language interpolates", () => {
    const r = readSellerCounts(series([38, 37, 38, 39, 38, 37, 38, 39, 38, 24, 9, 4, 4, 4]));
    expect(r.peak).toBe(39);
    expect(r.current).toBe(4);
  });
});

describe("readBrandLevel — §P4.3 step 9", () => {
  const cliff = readSellerCounts(series([38, 37, 38, 39, 38, 37, 38, 39, 38, 24, 9, 4, 4, 4]));
  const stable = readSellerCounts(series([38, 37, 39, 38, 36, 40, 38, 39, 37, 38, 39, 38, 37, 38]));

  it("agreement across ASINs = brand-level signal", () => {
    expect(readBrandLevel([{ asin: "A", reading: cliff }, { asin: "B", reading: cliff }]).agreement).toBe("brand_level");
  });

  it("disagreement = ASIN-specific, which is itself the finding", () => {
    expect(readBrandLevel([{ asin: "A", reading: cliff }, { asin: "B", reading: stable }]).agreement).toBe("asin_specific");
  });

  it("one usable ASIN never claims a brand-level signal", () => {
    expect(readBrandLevel([{ asin: "A", reading: cliff }]).agreement).toBe("single_asin");
    const short = readSellerCounts(series([12, 11]));
    expect(readBrandLevel([{ asin: "A", reading: cliff }, { asin: "B", reading: short }]).agreement).toBe("single_asin");
  });
});

describe("priceHeldDuring — the flat-price discriminator, cliff-scoped only", () => {
  const drop = { from: 38, to: 4, startDate: new Date(T0), endDate: new Date(T0 + 45 * DAY), days: 45, fraction: 0.89 };
  const prices = (vals: number[]) => vals.map((v, i) => ({ date: new Date(T0 + i * 7 * DAY), count: v }));

  it("price within ±10% across the drop window = held", () => {
    expect(priceHeldDuring(prices([2999, 2989, 3020, 2995, 3005, 2999]), drop)).toBe(true);
  });

  it("price falling with the sellers = not held (a different story than enforcement's shape)", () => {
    expect(priceHeldDuring(prices([2999, 2600, 2300, 2000, 1800, 1500]), drop)).toBe(false);
  });

  it("too few price points inside the window = null — unknown is never asserted either way", () => {
    expect(priceHeldDuring(prices([2999]), drop)).toBeNull();
  });
});
