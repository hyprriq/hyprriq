// Marketing copy lives here, not hardcoded in JSX (ADR-004). UI labels stay in
// the components. Pricing ladder (founder-ruled 2026-08-07/08): Single $99 one-time
// (3 brands, 3 dimensions) · Single Deep Report $149 one-time (3 brands, all 5
// dimensions + category compliance, document review) · Growth $279/mo (5 brands,
// 5/mo) · Scale $499/mo (5 brands, 12/mo, + category compliance). Upload caps
// NEVER appear in pricing copy (standing law). Keepa lines removed while
// KEEPA_LIVE=false (lib/constants/plans.ts). Every string here is locked into the
// banned-language MUST_PASS fixture by IMPORT (standing rule 8 — cannot drift).

// COPY RULING 2026-08-12: every delivery statement derives from CASE_SLA_HOURS — 24 hours on
// every plan, no per-plan variation, no "typically"/"up to", priority framing retired.
import { CASE_SLA_HOURS, PLANS_ON_SALE, type PlanType } from "@/lib/constants/plans";

// ── COMING SOON (founder-locked 2026-08-22): tiers with category compliance are off sale while
// Keepa is unbuilt. DERIVED from the one on-sale registry, never a second list — the cards stay
// visible as a roadmap; the checkout route is the control.
const onSale = (id: PlanType) => PLANS_ON_SALE.includes(id);
export const COMING_SOON_LABEL = "Coming soon";
export const COMING_SOON_NOTE = "Opens when category compliance research goes live. Not available for purchase yet.";

export const pricingHero = {
  title: "Costs less than one bad buy.",
  subtitle:
    "Try a single report, or subscribe for regular sourcing. Either way, you pay for clarity before the capital moves — not after.",
};

export type PlanId = "single_99" | "single_149" | "growth_279" | "scale_499";

export type Plan = {
  id: PlanId;
  name: string;
  price: string;
  cadence: string;
  meta: string;
  points: string[];
  popular: boolean;
  /** Derived from PLANS_ON_SALE — a roadmap card: visible, never buyable. */
  comingSoon: boolean;
};

export const subscriptionPlans: Plan[] = [
  {
    id: "growth_279",
    name: "Growth",
    price: "$279",
    cadence: "/mo",
    meta: "5 reports a month",
    points: [
      "Up to 5 brands per report",
      "All five assessment areas",
      "Document review included",
      "Full portal + case history",
      "Credit rollover (up to 2)",
    ],
    // "Most popular" moved off Scale with the 2026-08-22 sale ruling — a chip on a card you
    // cannot buy is an anti-pattern; the buyable subscription carries it.
    popular: true,
    comingSoon: !onSale("growth_279"),
  },
  {
    id: "scale_499",
    name: "Scale",
    price: "$499",
    cadence: "/mo",
    meta: "12 reports a month",
    // ── CLAIMS STRIP (founder-queued, executed 2026-08-20). Two bullets removed as UNBACKED:
    // "Deep analysis + contradiction checks" — no plan gating exists anywhere in synthesis;
    // contradiction checks run identically on every plan, so selling them as a Scale extra was
    // false in both directions. "Delivered within N hours" as a Scale bullet — one CASE_SLA_HOURS
    // constant, same on $99; delivery stays in the comparison table as a same-for-all row.
    // "12 reports a month, top-up packs available" bullet removed (founder-ruled 2026-08-22,
    // item 2): top-ups are not for sale at launch, and the 12/mo half already lives in `meta`.
    points: [
      "Everything in Growth",
      "Category compliance review",
      "Credit rollover (up to 4)",
    ],
    popular: false,
    comingSoon: !onSale("scale_499"),
  },
];

export const oneTimePlans: Plan[] = [
  {
    id: "single_99",
    name: "Single Report",
    price: "$99",
    cadence: "one-time",
    meta: "1 report",
    points: [
      "Up to 3 brands",
      "Three assessment areas: Supplier Legitimacy, Brand Risk, Sourcing Logic",
      "Supplier questions checklist",
      `Ready in your portal within ${CASE_SLA_HOURS} hours`,
    ],
    popular: true,
    comingSoon: !onSale("single_99"),
  },
  {
    id: "single_149",
    // FOUNDER RE-RULED 2026-08-10: matches the Stripe product name.
    name: "Single Deep Report",
    price: "$149",
    cadence: "one-time",
    meta: "1 complete report",
    points: [
      "Up to 3 brands",
      "All five assessment areas",
      "Category compliance review",
      "Document review included",
      `Ready in your portal within ${CASE_SLA_HOURS} hours`,
    ],
    popular: false,
    comingSoon: !onSale("single_149"),
  },
];

export const creditExplainer =
  "One credit buys one report: one supplier, up to your plan's brand limit, covering the assessment areas your plan includes. Credits are simply how many reports you can run.";

export const comparisonColumns = ["Single Report", "Single Deep Report", "Growth", "Scale"] as const;

export const comparison: {
  feature: string;
  values: [string, string, string, string]; // Single, Complete, Growth, Scale
}[] = [
  { feature: "Reports", values: ["1", "1", "5 / mo", "12 / mo"] },
  { feature: "Brands per report", values: ["Up to 3", "Up to 3", "Up to 5", "Up to 5"] },
  { feature: "Assessment areas", values: ["3 of 5", "All 5", "All 5", "All 5"] },
  { feature: "Category compliance review", values: ["—", "Yes", "—", "Yes"] },
  { feature: "Document review", values: ["—", "Yes", "Yes", "Yes"] },
  // "Deep analysis + contradiction" row removed 2026-08-20 (claims strip): contradiction checks
  // run on every plan — a Scale-only "Yes" was unbacked by anything in the engine.
  { feature: "Delivery", values: [`${CASE_SLA_HOURS} hours`, `${CASE_SLA_HOURS} hours`, `${CASE_SLA_HOURS} hours`, `${CASE_SLA_HOURS} hours`] },
  { feature: "Credit rollover", values: ["—", "—", "Up to 2", "Up to 4"] },
  // "Top-up packs" row removed (founder-ruled 2026-08-22, item 2): top-ups are not for sale at
  // launch — the pricing page advertises nothing a client cannot buy.
];
