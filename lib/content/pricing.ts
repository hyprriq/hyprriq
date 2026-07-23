// Marketing copy lives here, not hardcoded in JSX (ADR-004). UI labels stay in
// the components. Pricing model (locked 2026-06-18): single $99 one-time, Growth
// $279/mo, Scale $499/mo. Brand count is uniform (up to 5) so tiers differentiate
// on credits + depth + SLA, not on brand limits (which previously overlapped).

export const pricingHero = {
  title: "Costs less than one bad buy.",
  subtitle:
    "Try a single report, or subscribe for regular sourcing. Either way, you pay for clarity before the capital moves — not after.",
};

export type PlanId = "single_99" | "growth_279" | "scale_499";

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
      "Full five-dimension review",
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
      "Deep analysis + contradiction checks",
      "Keepa seller-trend data",
      "3-business-day priority SLA",
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
    meta: "1 complete report",
    points: [
      "Up to 5 brands",
      "Full five-dimension review",
      "14-field document review",
      "Delivered to your email in 5 days",
    ],
    popular: false,
  },
];

export const creditExplainer =
  "One credit = one complete report — one supplier, up to 5 brands, across all five dimensions. Credits don't change what you get; they're just how many reports you can run.";

export const comparisonColumns = ["Single Report", "Growth", "Scale"] as const;

export const comparison: {
  feature: string;
  values: [string, string, string]; // Single, Growth, Scale
}[] = [
  { feature: "Reports", values: ["1", "5 / mo", "12 / mo"] },
  { feature: "Brands per report", values: ["Up to 5", "Up to 5", "Up to 5"] },
  { feature: "Five-dimension review", values: ["Full", "Full", "Full"] },
  { feature: "Document review (14-field)", values: ["Yes", "Yes", "Yes"] },
  { feature: "Deep analysis + contradiction", values: ["—", "—", "Yes"] },
  { feature: "Keepa seller-trend data", values: ["—", "—", "Yes"] },
  { feature: "Delivery SLA", values: ["5 days", "5 days", "3 days"] },
  { feature: "Portal + case history", values: ["Read-only", "Full", "Full"] },
  { feature: "Credit rollover", values: ["—", "Up to 2", "Up to 4"] },
  // Stripe-verified 2026-07-23: the top-up price IDs charge $99/$179 — the portal billing page
  // was right, this table was wrong. Retired figures locked out by retiredPricing.lock.test.ts.
  { feature: "Top-up packs", values: ["—", "+3 / $99", "+6 / $179"] },
];
