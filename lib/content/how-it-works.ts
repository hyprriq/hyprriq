// Marketing copy (ADR-004). No "Track 0–5" language anywhere client-facing
// (ADR-005) — client dimension names only.
import { CASE_SLA_HOURS } from "@/lib/constants/plans";
import { ASSESSMENT_AREA_KEYS } from "@/lib/constants/tracks";
import { AREA_NAMES } from "@/lib/content/reportCopy";

export const hero = {
  title: "Before you commit capital, we research what matters.",
  subtitle:
    "Every report is built the same way: deep AI research, a human expert's review, and a one-page answer you can act on.",
};

export const layers = [
  {
    title: "AI research",
    body: "An AI pipeline investigates 60+ public data points across five dimensions — registration records, dealer locators, marketplace signals, and more.",
  },
  {
    title: "Expert review",
    body: "The founder reviews and approves every finding before it ships. The AI suggests; a human assigns the verdict. You never read raw model output.",
  },
  {
    title: "Delivery",
    body: `A one-page Decision Snapshot — a plain-English verdict, the evidence behind it, and the questions to ask your vendor. Delivered within ${CASE_SLA_HOURS} hours.`,
  },
];

// ── AREA NAMES FROM THE REGISTRY (founder-ordered 2026-09-08). All five hand-typed names here
// had drifted from what the paid report renders ("Supplier Identity Check", "Supply Chain
// Relationship Check", "Brand Risk Assessment", "Document Review", "Sourcing Logic Review") — a
// prospect who bought after reading this page received a report whose section headings matched
// none of them. The marketing-length bodies are this page's own; names come from AREA_NAMES.
const DIMENSION_BODY: Record<string, string> = {
  supplier_identity:
    "We verify the supplier is a real, operating wholesale business — not a shell, broker, or grey-market source. Physical presence, business registration, and online signals.",
  supply_chain_relationship:
    "We look for any observable connection between the supplier and the brand — dealer locators, distributor pages, public sources. We classify what we can, and state clearly what we can't confirm.",
  brand_risk_assessment:
    "We read the brand's actual enforcement posture from real marketplace signals — seller counts, brand storefronts, enforcement records, reseller policies. Invoice risk and enforcement risk are always reported separately.",
  documentation_review:
    "If you upload a document, we check that its entity and address line up with what our other research found independently. Only runs when a document is provided — no documents, no penalty.",
  sourcing_logic:
    "We check whether the whole scenario makes commercial sense — does the supplier type match the brands, are there category flags, does the story hold together or contradict itself.",
};
export const dimensions = ASSESSMENT_AREA_KEYS.map((key) => ({
  name: AREA_NAMES[key] ?? key,
  body: DIMENSION_BODY[key] ?? "",
}));

export const dataPoints = {
  title: "What “60+ data points” actually means",
  body: "It's not a vanity number. Each dimension pulls from many independent public sources — business registries, WHOIS and domain history, dealer and distributor pages, marketplace seller counts and storefronts, enforcement records, and your documents. We weigh them together, and we tell you which ones we could verify versus only infer.",
};

export const dontDo = {
  title: "What we don't do",
  items: [
    {
      // BL fix gate (2026-07-24): negation made explicit on both clauses ("or guarantee" left the
      // second clause un-negated for the scanner). Meaning identical; compliance-mechanical edit,
      // client-surface gate confirms wording.
      title: "We don't ungate brands and we don't guarantee approval",
      body: "We're intelligence, not a service that gets you into a category.",
    },
    {
      title: "We don't give legal advice",
      body: "We surface risk signals; decisions and legal questions stay with you and your counsel.",
    },
    {
      title: "We never call a source “safe”",
      body: "Authorization can't be confirmed from outside. We show what's observable and exactly what to verify.",
    },
  ],
};
