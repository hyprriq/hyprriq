// Marketing copy lives here, not hardcoded in JSX (ADR-004) — the content
// thread can swap these without touching components. UI labels stay in the
// components themselves.

export const pricingHero = {
  title: "Costs less than one bad buy.",
  subtitle:
    "Subscribe for regular sourcing, or try a single report first. Either way, you pay for clarity before the capital moves.",
};

export type PlanId = "starter_79" | "dossier_197" | "growth_249" | "scale_499";

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
    id: "growth_249",
    name: "Growth",
    price: "$249",
    cadence: "/mo",
    meta: "5 research credits a month",
    points: [
      "Up to 3 brands per case",
      "Full five-dimension review",
      "Case history & report archive",
      "Credit rollover (up to 2)",
    ],
    popular: false,
  },
  {
    id: "scale_499",
    name: "Scale",
    price: "$499",
    cadence: "/mo",
    meta: "12 research credits a month",
    points: [
      "Up to 5 brands per case",
      "Deep analysis + contradiction checks",
      "3-business-day priority SLA",
      "Keepa seller-trend data",
      "Credit rollover (up to 4)",
    ],
    popular: true,
  },
];

export const oneTimePlans: Plan[] = [
  {
    id: "starter_79",
    name: "Starter Report",
    price: "$79",
    cadence: "one-time",
    meta: "1 report · limited scope",
    points: [
      "Up to 2 brands",
      "Supplier identity (basic)",
      "Brand risk (basic)",
      "Delivered to your email",
    ],
    popular: false,
  },
  {
    id: "dossier_197",
    name: "Full Dossier",
    price: "$197",
    cadence: "one-time",
    meta: "1 report · complete",
    points: [
      "Up to 5 brands",
      "Full five-dimension review",
      "14-field document review",
      "Delivered to your email",
    ],
    popular: true,
  },
];

export const creditExplainer =
  "One credit = one complete supplier research task — one vendor, the brands you list, across all five dimensions.";

export const comparison: {
  feature: string;
  values: [string, string, string, string]; // Starter, Dossier, Growth, Scale
}[] = [
  { feature: "Credits / uses", values: ["1 report", "1 report", "5 / mo", "12 / mo"] },
  { feature: "Brands per use", values: ["Up to 2", "Up to 5", "Up to 3", "Up to 5"] },
  { feature: "Supplier Identity Check", values: ["Basic", "Full", "Full", "Full + domain age"] },
  { feature: "Supply Chain Relationship", values: ["—", "Full", "Full", "Full"] },
  { feature: "Brand Risk Assessment", values: ["Basic", "Full", "Full", "Full + seller trend"] },
  { feature: "Document Review", values: ["—", "14-field", "14-field", "14-field"] },
  { feature: "Sourcing Logic Review", values: ["Flags only", "Standard", "Standard", "Deep + contradiction"] },
  { feature: "Delivery SLA", values: ["5 days", "5 days", "5 days", "3 days"] },
  { feature: "Credit rollover", values: ["—", "—", "Up to 2", "Up to 4"] },
  { feature: "Top-up packs", values: ["—", "—", "+3 / $99", "+6 / $179"] },
];

export const comparisonColumns = ["Starter", "Full Dossier", "Growth", "Scale"] as const;
