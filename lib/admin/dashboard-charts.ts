// Dashboard chart presenter — TRUE numbers only (design ruling 2026-08-13). Both series are
// computed from case rows the dashboard already loads; nothing here estimates or interpolates.
// - "created" counts case rows by created_at week.
// - hours-to-deliver is delivered_at − created_at per case, bucketed by DELIVERY week. This is
//   factual across SLA regimes (the 24h ruling changed the promise, not the history), which is
//   why the chart is this and NOT "% within SLA" — sla_deadline values predating the 2026-08-12
//   ruling carry the old day-based windows and a %-within chart would mix regimes.
// Pure presenter (finding-view pattern): unit-locked, no Date.now() inside — `now` is an input.

export interface CaseChartInput {
  created_at: string;
  delivered_at: string | null;
}

export interface WeekBucket {
  /** Week-start label, e.g. "21 Jul" (weeks start Monday, UTC). */
  label: string;
  /** Cases created in this week. */
  created: number;
  /** Median hours from creation to delivery, over cases DELIVERED this week. Null = none delivered. */
  medianHours: number | null;
  /** How many deliveries the median is over (honest sample size for the label). */
  deliveredCount: number;
}

const WEEK_MS = 7 * 24 * 3_600_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Monday 00:00 UTC of the week containing `t`. */
function weekStart(t: number): number {
  const d = new Date(t);
  const day = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function buildWeeklyCaseSeries(cases: CaseChartInput[], now: number, weeks = 8): WeekBucket[] {
  const lastStart = weekStart(now);
  const firstStart = lastStart - (weeks - 1) * WEEK_MS;

  const created = new Array<number>(weeks).fill(0);
  const deliverHours: number[][] = Array.from({ length: weeks }, () => []);

  for (const c of cases) {
    const createdAt = Date.parse(c.created_at);
    if (!Number.isNaN(createdAt)) {
      const i = Math.floor((weekStart(createdAt) - firstStart) / WEEK_MS);
      if (i >= 0 && i < weeks) created[i] += 1;
    }
    if (c.delivered_at) {
      const deliveredAt = Date.parse(c.delivered_at);
      if (!Number.isNaN(deliveredAt) && !Number.isNaN(createdAt) && deliveredAt >= createdAt) {
        const i = Math.floor((weekStart(deliveredAt) - firstStart) / WEEK_MS);
        if (i >= 0 && i < weeks) deliverHours[i].push((deliveredAt - createdAt) / 3_600_000);
      }
    }
  }

  return created.map((count, i) => {
    const start = new Date(firstStart + i * WEEK_MS);
    const hours = deliverHours[i].sort((a, b) => a - b);
    return {
      label: `${start.getUTCDate()} ${MONTHS[start.getUTCMonth()]}`,
      created: count,
      medianHours: hours.length ? Math.round(median(hours)) : null,
      deliveredCount: hours.length,
    };
  });
}
