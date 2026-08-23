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

// ── WHAT IS ON SALE (founder-locked 2026-08-22, money-surfaces ruling) — THE single source of
// truth for sellability. single_149 and scale_499 include category compliance, category
// compliance depends on Keepa, and KEEPA_LIVE is false: a customer buying either today would
// pay for a report section that cannot answer its own question. They are COMING SOON — visible
// on the pricing page as a roadmap, refused by /api/checkout/session as a control (a hidden
// button is not a control; the route is). Every purchase surface — pricing cards, portal plan
// pickers, upgrade cards, the checkout route — reads THIS list; a page-level list that could
// drift from a route-level list is the defect this constant exists to prevent (fixture-locked:
// no category-compliance tier may appear here while KEEPA_LIVE is false).
// Returning a tier to sale is a founder ruling recorded here, not an edit.
export const PLANS_ON_SALE: readonly PlanType[] = ["single_99", "growth_279"];

export function planOnSale(plan: PlanType): boolean {
  return PLANS_ON_SALE.includes(plan);
}

// Top-ups are OFF SALE (same ruling): purchasable-today packs fed a rollover that destroyed
// paid credits. The DB fix is live (purchased_credits, founder-run 2026-08-22) and the webhook
// lands top-ups as protected purchased credits — but they return to sale only by ruling,
// recorded here. The billing card and the checkout route both read this flag.
export const TOPUPS_ON_SALE = false;

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
  // FOUNDER RE-RULED 2026-08-10 (gap-close batch): "Single Deep Report" — matches the Stripe
  // product name; supersedes the 08-08 "Complete Report" ruling. One-line edit if ever re-ruled.
  single_149: "Single Deep Report",
  growth_279: "Growth",
  scale_499: "Scale",
};

export const PLAN_CATEGORY: Record<PlanType, "one_time" | "subscription"> = {
  single_99: "one_time",
  single_149: "one_time",
  growth_279: "subscription",
  scale_499: "subscription",
};

// ── CASE SLA (FOUNDER-RULED 2026-08-12: 24 HOURS): cases.sla_deadline = submitted_at + 24h,
// stamped at submission by BOTH intake paths (client submit route + operator run). THE single
// named constant every SLA display, risk count, AND client-facing delivery statement reads.
// COPY RULING (same day, second ruling): the client promise IS 24 hours — "within 24 hours",
// no "typically"/"up to", no per-plan variation. PLAN_SLA_DAYS (5/5/5/3 days) RETIRED with it;
// the Scale "priority turnaround" framing is dead everywhere. Supersedes DELIVERY_SLA_HOURS
// (1h, zero consumers — retired 2026-08-12 morning). ──
export const CASE_SLA_HOURS = 24;

// ── FOUNDER-RULED 2026-08-22: KEEP AT 6. The "at risk" window for SLA risk counts and badges.
// THE REASON, recorded so the number is a ruling and not a leftover: with a 24h SLA the previous
// day-granularity check (deadline within 1 day) flagged EVERY active case from the moment of
// submission, which is the same as flagging none. Six hours is the last quarter of the window —
// late enough that a flag means something, early enough to still act on it. Ruled after being
// flagged under the laws-get-named rule (a constant I introduced during plumbing work must be
// named for a ruling, never slipped in). Change the number HERE; every risk read derives from it.
export const SLA_RISK_WINDOW_HOURS = 6;
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
