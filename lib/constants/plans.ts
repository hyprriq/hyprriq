// Canonical plan logic — single source of truth for plan_type values, prices,
// brand caps, and credit math. Marketing copy lives in lib/content/pricing.ts
// (CRO surface, editable without touching logic). These values are LOCKED and
// wired into Stripe products + the DB plan_type CHECK constraint — changing a
// number here is a migration, not a content edit (see SESSION_F_PROGRESS.md).

export type PlanType = "single_99" | "single_149" | "growth_279" | "scale_499";

export const PLAN_TYPES: PlanType[] = ["single_99", "single_149", "growth_279", "scale_499"];

// ── KEEPA_LIVE (founder-ruled 2026-08-07): the SINGLE flag that gates every Keepa-dependent
// surface (today: ASIN collection on the intake form — lib/portal/asinIntake.ts). Keepa is a
// scheduled build, not a permanent absence; while this is false NOTHING may render or collect
// a field only Keepa consumes (the same silent-dead-field failure removed from $99 uploads).
// Flips in exactly one place when the integration lands. ──
export const KEEPA_LIVE = false;

// Brand cap = max brands researched per credit (one case = one supplier + up to
// this many brands = 1 credit). Read from HERE everywhere it's shown so a
// confirmed number is a one-line change, not a find-and-replace.
// FOUNDER-RULED 2026-08-07 (pricing-ladder correction; supersedes 2026-07-28):
// single_99 = 3 · single_149 = 3 · growth = 5 · scale = 5. Five is the ceiling —
// the report design is spec'd to survive 1–5 brands. New submissions only.
export const PLAN_BRAND_CAPS: Record<PlanType, number> = {
  single_99: 3,
  single_149: 3,
  growth_279: 5,
  scale_499: 5,
};

// Credits granted per billing cycle. The singles are one-time (1 report each).
export const PLAN_CREDITS_PER_CYCLE: Record<PlanType, number> = {
  single_99: 1,
  single_149: 1,
  growth_279: 5,
  scale_499: 12,
};

export const PLAN_PRICE_LABEL: Record<PlanType, string> = {
  single_99: "$99",
  single_149: "$149",
  growth_279: "$279",
  scale_499: "$499",
};

export const PLAN_CADENCE: Record<PlanType, string> = {
  single_99: "one-time",
  single_149: "one-time",
  growth_279: "/mo",
  scale_499: "/mo",
};

export const PLAN_NAME: Record<PlanType, string> = {
  single_99: "Single Report",
  // FOUNDER-RULED 2026-08-08: "Complete Report" IS the client-facing tier name (placeholder
  // promoted; pre-design batch). Still a one-line edit here if ever re-ruled.
  single_149: "Complete Report",
  growth_279: "Growth",
  scale_499: "Scale",
};

export const PLAN_CATEGORY: Record<PlanType, "one_time" | "subscription"> = {
  single_99: "one_time",
  single_149: "one_time",
  growth_279: "subscription",
  scale_499: "subscription",
};

export const PLAN_SLA_DAYS: Record<PlanType, number> = {
  single_99: 5,
  single_149: 5, // STANDARD SLA by ruling — priority stays Scale-exclusive
  growth_279: 5,
  scale_499: 3,
};

// ── DELIVERY SLA (founder-ruled 2026-08-02): delivery is ~1 hour, HARD MAX. The single named
// constant both the client-facing promise and the (deferred) refund logic read — the
// "undelivered / full-refund" state exists ONLY within this window; after delivery the
// delivered-report refund path applies (policy captured in docs, build deferred to the
// billing-section pass). ⚠ FLAGGED TENSION for the founder (UNRESOLVED as of 2026-08-07):
// PLAN_SLA_DAYS above (3–5 days) drives the est-completion label + onboarding copy, vs this
// 1-hour value (currently declaration-only — zero consumers). CORRECTION 2026-08-07: an earlier
// version of this comment claimed PLAN_SLA_DAYS drives cases.sla_deadline — FALSE; nothing
// sets sla_deadline anywhere (it is NULL on every case; B4 report). Reconcile which promise
// the client sees before marketing/report copy locks. ──
export const DELIVERY_SLA_HOURS = 1;
// The refund window (days from delivery for single reports; from charge for subscriptions).
// Captured with the LOCKED refund policy; the money-write build is deferred.
export const REFUND_WINDOW_DAYS = 14;

export const PLAN_ROLLOVER_LIMIT: Record<PlanType, number> = {
  single_99: 0,
  single_149: 0, // no rollover, no top-ups — one-time by ruling
  growth_279: 2,
  scale_499: 4,
};

// Default brand cap for a client with no plan yet (e.g. fresh signup before
// purchase). Conservative — the submit flow still requires a plan to spend.
// Lowered to 3 with the 2026-08-07 ladder (the smallest ruled cap is the conservative one).
export const DEFAULT_BRAND_CAP = 3;

export function brandCapForPlan(plan: PlanType | null | undefined): number {
  return plan ? PLAN_BRAND_CAPS[plan] : DEFAULT_BRAND_CAP;
}

// Credits a case costs: one supplier + up to (cap) brands = 1 credit; each
// additional full multiple of the cap is another credit. The submit form caps
// brand entry at the plan cap, so in practice this is 1 — but the formula is
// kept general so the cap is the only thing that ever needs to change.
export function creditsRequired(
  brandCount: number,
  plan: PlanType | null | undefined,
): number {
  const cap = brandCapForPlan(plan);
  if (brandCount <= 0) return 1;
  return Math.max(1, Math.ceil(brandCount / cap));
}
