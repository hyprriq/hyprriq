// ── THE SELLER-COUNT READING — PATCH 4 §P4.2/P4.6 ENCODED (founder-approved 2026-09-08) ──────
//
// Every threshold below is FROM docs/KEEPA_READING_GUIDE_recovered.md (the verbatim recovered
// founder method), cited per constant. Constants the guide states only by example are marked
// ⚠ DERIVED-UNRULED and listed for founder ratification — the laws-get-named rule.
//
// This module is PURE: series in, reading out. No HTTP, no env, no persistence — the whole
// method is testable without a Keepa token. The CAUSE-IS-INFERENCE amendment (ruled 2026-09-08)
// lives in the language layer (sellerCountLanguage.ts), not here: this module names shapes,
// never causes.
//
// ADVISORY ONLY (the approved shape (b)): nothing in this module may feed a weight key, a
// signal, or the doubt axis. The three keepa_* keys stay firewall-inert; their gate is a
// separate founder ruling.

/** One observation: when, and how many third-party new-condition sellers. */
export interface CountPoint { date: Date; count: number }

export type SellerCountPattern =
  | "open_market_stable_high"   // P4.2 row 1
  | "gradual_decline"           // P4.2 row 2
  | "enforcement_cliff"         // P4.2 row 3 (SHAPE name from the guide; cause never asserted)
  | "already_locked_down"       // P4.2 row 4
  | "volatile_unstable"         // P4.2 row 5
  | "rising_trend"              // P4.2 row 6
  | "brand_direct_only"         // P4.2 row 7
  | "stable_unclassified"       // ⚠ NOT a guide row: stable between the lockdown band (≤3) and
                                // row 1's floor (15+). The guide names no pattern here; claiming
                                // one would invent. Language layer reports count + window only.
                                // The low_seller_count_stable tension was RULED 2026-09-08:
                                // §P4.2 row 4 wins (low-stable = locked down = HIGH); the key's
                                // favorable sign is recorded as backwards in weights.ts.
  | "insufficient_history";     // honest state — not in the guide's table; absence of a reading

export interface DropEvent {
  from: number; to: number;
  startDate: Date; endDate: Date;
  days: number;
  fraction: number;             // (from - to) / from
}

export interface SellerCountReading {
  pattern: SellerCountPattern;
  current: number | null;
  peak: number | null;
  peakDate: Date | null;
  min: number | null;
  drop: DropEvent | null;       // the largest qualifying drop, when one exists
  trendDirection: "increasing" | "stable" | "decreasing" | "volatile" | "unknown";
  observedDays: number;         // span of usable history
  points: number;               // usable observations
}

// ── The guide's numeric law (P4.6, verbatim): ">50% drop in under 60 days = enforcement cliff".
export const CLIFF_DROP_FRACTION = 0.5;        // KEEPA_READING_GUIDE_recovered.md §P4.6
export const CLIFF_WINDOW_DAYS = 60;           // §P4.6 ("under 60 days"); §P4.2 gives 30-60
// §P4.2 row 3's classic form: "20+ sellers to 2-4". The fraction rule is the general law; the
// 20+ floor keeps a 4→1 wiggle on a tiny listing from reading as the guide's most alarming
// pattern. ⚠ DERIVED-UNRULED: the guide states 20+ only inside the example; using it as a
// minimum-peak qualifier for the CLIFF label (smaller listings can still satisfy the >50%
// rule and read as gradual/volatile instead) is my reading, listed for ratification.
export const CLIFF_MIN_PEAK = 20;

// §P4.2 row 1: "Flat line 15-40+ sellers. Stable over 90+ days."
export const STABLE_HIGH_MIN = 15;             // §P4.2 row 1
export const STABILITY_WINDOW_DAYS = 90;       // §P4.2 row 1
// §P4.2 row 4: "Permanently 1-3 sellers for 6+ months."
export const LOCKDOWN_MAX = 3;                 // §P4.2 row 4
export const LOCKDOWN_WINDOW_DAYS = 183;       // §P4.2 row 4 ("6+ months")
// §P4.2 row 2: decline "over 6-12 months".
export const GRADUAL_WINDOW_DAYS = 183;        // §P4.2 row 2
// ⚠ DERIVED-UNRULED trio (the guide shows these only by example — 8,15,4,12,3,18 for volatile;
// 5→15 for rising; "flat" for stable). Listed for founder ratification:
export const VOLATILE_MIN_SWINGS = 3;          // direction reversals of ≥ VOLATILE_MIN_DELTA
export const VOLATILE_MIN_DELTA = 0.4;         // each swing ≥40% of local level
export const TREND_FLAT_BAND = 0.2;            // ±20% of window mean counts as "flat"
export const MIN_POINTS = 6;                   // fewer usable observations ⇒ insufficient_history
export const MIN_OBSERVED_DAYS = 60;           // shorter span ⇒ insufficient_history

const MS_DAY = 86_400_000;

/** Keepa csv arrays are [keepaMinutes, value, …]; keepaMinutes = unixMs/60000 − 21564000.
 *  −1 values are data gaps and are DROPPED (a gap is not a zero-seller observation). */
export function parseKeepaCountCsv(csv: readonly number[] | null | undefined): CountPoint[] {
  if (!Array.isArray(csv)) return [];
  const out: CountPoint[] = [];
  for (let i = 0; i + 1 < csv.length; i += 2) {
    const v = csv[i + 1];
    if (typeof v !== "number" || v < 0) continue;
    out.push({ date: new Date((csv[i] + 21_564_000) * 60_000), count: v });
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function largestDrop(points: CountPoint[]): DropEvent | null {
  // The largest peak→trough fall completed within CLIFF_WINDOW_DAYS, scanning each local peak.
  let best: DropEvent | null = null;
  for (let i = 0; i < points.length; i++) {
    const from = points[i];
    if (from.count <= 0) continue;
    for (let j = i + 1; j < points.length; j++) {
      const days = (points[j].date.getTime() - from.date.getTime()) / MS_DAY;
      if (days > CLIFF_WINDOW_DAYS) break;
      const fraction = (from.count - points[j].count) / from.count;
      if (fraction > (best?.fraction ?? 0)) {
        best = { from: from.count, to: points[j].count, startDate: from.date, endDate: points[j].date, days: Math.round(days), fraction };
      }
    }
  }
  return best;
}

function reversalsOf(points: CountPoint[]): number {
  let reversals = 0;
  let lastDir = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1].count, b = points[i].count;
    const base = Math.max(1, Math.min(a, b));
    if (Math.abs(b - a) / base < VOLATILE_MIN_DELTA) continue;
    const dir = Math.sign(b - a);
    if (dir !== 0 && lastDir !== 0 && dir !== lastDir) reversals++;
    if (dir !== 0) lastDir = dir;
  }
  return reversals;
}

function within(points: CountPoint[], days: number): CountPoint[] {
  if (points.length === 0) return [];
  const cutoff = points[points.length - 1].date.getTime() - days * MS_DAY;
  return points.filter((p) => p.date.getTime() >= cutoff);
}

/** The classification — P4.2's seven patterns, priority-ordered so the most specific shape
 *  wins: cliff → brand-direct → locked-down → volatile → gradual decline → rising → stable
 *  high → (low-and-stable folds into locked-down or reads as stable at its own level). */
export function readSellerCounts(all: CountPoint[]): SellerCountReading {
  const observedDays = all.length >= 2 ? (all[all.length - 1].date.getTime() - all[0].date.getTime()) / MS_DAY : 0;
  const base: Omit<SellerCountReading, "pattern"> = {
    current: all.length ? all[all.length - 1].count : null,
    peak: all.length ? Math.max(...all.map((p) => p.count)) : null,
    peakDate: all.length ? all.reduce((m, p) => (p.count > m.count ? p : m)).date : null,
    min: all.length ? Math.min(...all.map((p) => p.count)) : null,
    drop: null,
    trendDirection: "unknown",
    observedDays: Math.round(observedDays),
    points: all.length,
  };
  if (all.length < MIN_POINTS || observedDays < MIN_OBSERVED_DAYS) {
    return { ...base, pattern: "insufficient_history" };
  }

  const drop = largestDrop(all);
  const recent90 = within(all, STABILITY_WINDOW_DAYS);
  const recent180 = within(all, LOCKDOWN_WINDOW_DAYS);
  const mean = all.reduce((s, p) => s + p.count, 0) / all.length;
  const firstHalfMean = all.slice(0, Math.floor(all.length / 2)).reduce((s, p) => s + p.count, 0) / Math.max(1, Math.floor(all.length / 2));
  const lastHalfMean = all.slice(Math.floor(all.length / 2)).reduce((s, p) => s + p.count, 0) / Math.max(1, all.length - Math.floor(all.length / 2));
  const trendDirection: SellerCountReading["trendDirection"] =
    reversalsOf(all) >= VOLATILE_MIN_SWINGS ? "volatile"
      : lastHalfMean > firstHalfMean * (1 + TREND_FLAT_BAND) ? "increasing"
      : lastHalfMean < firstHalfMean * (1 - TREND_FLAT_BAND) ? "decreasing"
      : "stable";

  const withTrend = { ...base, drop, trendDirection };

  // §P4.6 cliff law + §P4.2 row-3 peak qualifier.
  if (drop && drop.fraction > CLIFF_DROP_FRACTION && drop.from >= CLIFF_MIN_PEAK) {
    return { ...withTrend, pattern: "enforcement_cliff" };
  }
  // §P4.2 row 7: exactly one seller, consistently (judged over the lockdown window).
  if (recent180.length >= 3 && recent180.every((p) => p.count === 1)) {
    return { ...withTrend, pattern: "brand_direct_only" };
  }
  // §P4.2 row 4: 1-3 sellers for 6+ months, no variation above the band.
  if (recent180.length >= 3 && recent180.every((p) => p.count >= 1 && p.count <= LOCKDOWN_MAX)) {
    return { ...withTrend, pattern: "already_locked_down" };
  }
  if (trendDirection === "volatile") return { ...withTrend, pattern: "volatile_unstable" };
  if (trendDirection === "decreasing") return { ...withTrend, pattern: "gradual_decline" };
  if (trendDirection === "increasing") return { ...withTrend, pattern: "rising_trend" };
  // §P4.2 row 1: stable at 15+, judged over the 90-day window.
  if (recent90.length >= 3 && recent90.every((p) => p.count >= STABLE_HIGH_MIN) && mean >= STABLE_HIGH_MIN) {
    return { ...withTrend, pattern: "open_market_stable_high" };
  }
  // Stable below the row-1 floor and above the lockdown band: the honest residue — a stable
  // mid count matches no guide row; report the numbers, claim no pattern name it isn't.
  return { ...withTrend, pattern: "stable_unclassified" };
}

// ── §P4.3 STEP 9 — the brand-level rule: agreement across ASINs is a brand signal; a lone
// ASIN's pattern is that listing's story. ──
export interface BrandLevelReading {
  agreement: "brand_level" | "asin_specific" | "single_asin";
  patterns: { asin: string; reading: SellerCountReading }[];
}

export function readBrandLevel(perAsin: { asin: string; reading: SellerCountReading }[]): BrandLevelReading {
  const usable = perAsin.filter((p) => p.reading.pattern !== "insufficient_history");
  if (usable.length <= 1) return { agreement: "single_asin", patterns: perAsin };
  const first = usable[0].reading.pattern;
  return {
    agreement: usable.every((p) => p.reading.pattern === first) ? "brand_level" : "asin_specific",
    patterns: perAsin,
  };
}

// ── THE FLAT-PRICE DISCRIMINATOR (founder-approved 2026-09-08): price is used ONLY inside the
// cliff reading — sellers exiting while price holds is what separates an enforcement-shaped
// exit from a price war. Never a standalone client signal, never deal advice. ──
export const PRICE_FLAT_BAND = 0.10; // ⚠ DERIVED-UNRULED: ±10% median move counts as "held"
export function priceHeldDuring(prices: CountPoint[], drop: DropEvent): boolean | null {
  const inWindow = prices.filter((p) => p.date >= drop.startDate && p.date <= drop.endDate && p.count > 0);
  if (inWindow.length < 2) return null; // unknown — never asserted either way
  const start = inWindow[0].count, end = inWindow[inWindow.length - 1].count;
  return Math.abs(end - start) / start <= PRICE_FLAT_BAND;
}
