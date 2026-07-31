// ── BUG-2 fix (2026-07-30) — the honest credits framing, ONE computation for every render
// site (billing page ×2, dashboard, sidebar widget). The old label "{available} of
// {per-cycle}" lied the moment top-ups or rollover pushed the balance above the plan
// allotment ("7 of 5 remaining"), and the bar math overflowed before its Math.min clamp.
// Held credits and the plan allotment are DIFFERENT quantities: credits_available is a
// balance (grant + top-ups + rollover − spend); PLAN_CREDITS_PER_CYCLE is what a renewal
// grants. This module states each as itself and never divides one by the other unclamped.
// Wording/layout polish belongs to the UI/UX thread — these strings are function-only.

import { PLAN_CREDITS_PER_CYCLE, type PlanType } from "@/lib/constants/plans";

export interface CreditsView {
  available: number;   // the balance, shown as-is
  perCycle: number;    // what the plan grants per cycle (0 = no plan)
  extra: number;       // balance above the per-cycle grant (top-ups and/or rollover), never negative
  pct: number;         // bar fill 0–100 — NEVER above 100 (full bar means "at least a full cycle in hand")
  headline: string;    // "7 credits available"
  detail: string | null; // honest second line, null when there is no plan
}

export function creditsView(available: number, plan: PlanType | null | undefined): CreditsView {
  const perCycle = plan ? PLAN_CREDITS_PER_CYCLE[plan] : 0;
  const extra = Math.max(0, available - perCycle);
  const pct = perCycle > 0 ? Math.min(100, Math.max(0, Math.round((available / perCycle) * 100))) : 0;
  const headline = `${available} ${available === 1 ? "credit" : "credits"} available`;
  const detail =
    perCycle === 0
      ? null
      : extra > 0
        ? `plan renews to ${perCycle}/cycle · includes ${extra} extra (top-ups & rollover carry until used)`
        : `of ${perCycle} included per cycle`;
  return { available, perCycle, extra, pct, headline, detail };
}
