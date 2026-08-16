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
import { CASE_SLA_HOURS } from "@/lib/constants/plans";

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
      "All five research dimensions",
      "Document review included",
      "Full portal + case history",
      "Credit rollover (up to 2)",
    ],
    popular: false,
  },
  {
    id: "scale_499",
    name: "Scale",
    price: "$499",
    cadence: "/mo",
    meta: "12 reports a month",
    points: [
      "Everything in Growth",
      "Category compliance review",
      "Deep analysis + contradiction checks",
      `Delivered within ${CASE_SLA_HOURS} hours`,
      "Credit rollover (up to 4)",
    ],
    popular: true,
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
      "Three research dimensions: supplier identity, brand risk, sourcing logic",
      "Supplier questions checklist",
      `Ready in your portal within ${CASE_SLA_HOURS} hours`,
    ],
    popular: false,
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
      "All five research dimensions",
      "Category compliance review",
      "Document review included",
      `Ready in your portal within ${CASE_SLA_HOURS} hours`,
    ],
    popular: true,
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
  { feature: "Research dimensions", values: ["3 of 5", "All 5", "All 5", "All 5"] },
  { feature: "Category compliance review", values: ["—", "Yes", "—", "Yes"] },
  { feature: "Document review", values: ["—", "Yes", "Yes", "Yes"] },
  { feature: "Deep analysis + contradiction", values: ["—", "—", "—", "Yes"] },
  { feature: "Delivery", values: [`${CASE_SLA_HOURS} hours`, `${CASE_SLA_HOURS} hours`, `${CASE_SLA_HOURS} hours`, `${CASE_SLA_HOURS} hours`] },
  { feature: "Credit rollover", values: ["—", "—", "Up to 2", "Up to 4"] },
  // Stripe-verified 2026-07-23: the top-up price IDs charge $99/$179 — the portal billing page
  // was right, this table was wrong. Retired figures locked out by retiredPricing.lock.test.ts.
  { feature: "Top-up packs", values: ["—", "—", "+3 / $99", "+6 / $179"] },
];
