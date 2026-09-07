// Help Centre content — static, editable without a code review/redeploy of the
// page logic. Rendered by app/(portal)/portal/help/page.tsx.

import {
  CHIP_DEF_VERIFIED_CLAUSE, CHIP_DEF_ASSESSED_CLAUSE,
  VERDICT_COPY, VERDICT_SCALE_ORDER, AREA_NAMES, AREA_DEFS,
} from "@/lib/content/reportCopy";
import { ASSESSMENT_AREA_KEYS } from "@/lib/constants/tracks";

export const howItWorks = {
  title: "How HyprrIQ Works",
  sub: "A quick overview of our research process from submission to delivery.",
  steps: [
    { icon: "📝", label: "Submit", detail: "supplier & brands" },
    { icon: "🔍", label: "Research", detail: "assessment areas" },
    { icon: "📍", label: "Founder reviews", detail: "findings" },
    { icon: "📄", label: "Verdict", detail: "delivered" },
  ],
};

export type VerdictInfo = {
  key: "source_clear" | "usable_with_conditions" | "verify_before_purchase" | "do_not_rely";
  name: string;
  desc: string;
};

// ── DERIVED FROM VERDICT_COPY (founder-ordered 2026-09-08): "portal help has its own everything
// — it is not drifting from the source; it never read the source." This page carried a SECOND
// full set of verdict meanings; its Source Clear said "Identity confirmed, no significant red
// flags found" — stronger than the report's own meaning and stronger than /terms. The `action`
// rows ("→ Proceed with standard due diligence", …) are GONE with the same ruling, not reworded:
// a verdict gloss is a finding, never an action, and the verdict is already the recommendation.
export const verdicts: VerdictInfo[] = VERDICT_SCALE_ORDER.map((key) => ({
  key,
  name: VERDICT_COPY[key].name,
  desc: VERDICT_COPY[key].means,
}));

export const verdictDisclaimer =
  "Important: HyprrIQ reports reflect what we can observe externally. We cannot confirm whether Amazon will accept an invoice.";

// ── NAMES AND DEFINITIONS FROM THE REGISTRY (founder-ordered 2026-09-08). The hand-typed list
// had 3 of 5 names wrong on this page ("Supplier Identity", unhyphenated "Supply Chain
// Relationship", "Brand Risk Assessment") — a client following the report's headings found no
// such sections here. Only the icons are this page's own.
const DIMENSION_ICONS: Record<string, string> = {
  supplier_identity: "🏢", supply_chain_relationship: "🔗", brand_risk_assessment: "🛡",
  documentation_review: "📄", sourcing_logic: "🧠",
};
export const dimensions = ASSESSMENT_AREA_KEYS.map((key) => ({
  icon: DIMENSION_ICONS[key] ?? "•",
  name: AREA_NAMES[key] ?? key,
  desc: AREA_DEFS[key] ?? "",
}));

export type Faq = { id: string; q: string; a: string };

// Order matters: the vendor-brand vetting entry ("unconfirmed-brands") is placed
// directly after "How do credits work?" per the Session F spec, and the submit
// form deep-links to its #unconfirmed-brands anchor.
export const faqs: Faq[] = [
  {
    id: "supplier-authorized",
    q: "Can you confirm my supplier is authorized to sell this brand?",
    a: "No — brand authorization is a private agreement between a supplier and a brand. It is not publicly verifiable from the outside. HyprrIQ surfaces every observable signal we can find, but we cannot confirm the existence of a private authorization agreement. Our verdicts reflect what we can observe, not what Amazon will decide.",
  },
  {
    id: "change-request",
    q: "What is a change request?",
    a: "A change request lets you flag a specific part of a delivered report that you believe is incorrect. You have 7 days from delivery to submit one. We review within 1 business day and either update the finding or explain why the current assessment stands. One change request is included per report.",
  },
  {
    id: "how-credits-work",
    q: "How do credits work?",
    a: "1 credit = 1 research case (1 supplier + up to 5 brands on Growth and Single Report). Credits are deducted at submission, not at delivery. Unused credits carry forward at renewal — up to 2 on Growth, up to 4 on Scale.",
  },
  {
    id: "unconfirmed-brands",
    q: "Do the brands I enter need to appear on my uploaded document?",
    a: "No. The brands and vendor you enter on the form are what we research — every brand gets the full research treatment regardless of what your paperwork shows. Vendor documents usually carry the vendor's own item codes rather than brand names, so a brand missing from a document is expected and never counts against the vendor. Documents help us confirm the vendor's entity and address; the brand-level findings come from independent research.",
  },
  {
    id: "certainty-levels",
    q: "What do Verified and Assessed mean?",
    // Both READ the ruled definitions (verified 2026-09-07, assessed 2026-09-08 — the old
    // Assessed here defined it by absence, which the ruling called weaker than what we do).
    // The trailing reassurance is this surface's own context, not a definition.
    a: `Verified: ${CHIP_DEF_VERIFIED_CLAUSE} Assessed: ${CHIP_DEF_ASSESSED_CLAUSE} Assessed is the normal state for many findings and never means something is wrong.`,
  },
  {
    id: "upgrade-midmonth",
    q: "Can I upgrade my plan mid-month?",
    a: "Yes. Stripe handles the upgrade immediately with prorated billing. Your new credit allowance takes effect at your next renewal date. Your current month's remaining credits are unchanged.",
  },
];
