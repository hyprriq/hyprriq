// Submit-flow copy. Kept here (not inline in the component) per the project
// content-file pattern so wording can change without touching form logic.

import { CASE_SLA_HOURS, type PlanType } from "@/lib/constants/plans";

// Vendor-brand expectation-setter, shown under the brand-tags input.
// CORRECTED 2026-08-07 (form-is-authoritative ruling): the previous wording promised the report
// would "flag brands as unconfirmed against this vendor" — NO code implements that flagging
// (B1/B2 report, 2026-08-07), and brand-absence-in-documents is expected, never a signal.
// The copy now states what actually happens.
export const brandHelper =
  "The brands and vendor you enter here are what we research. An uploaded document helps confirm the vendor's entity and address — it is not expected to list your brands.";

export const brandHelperLearnMore = {
  label: "Learn more →",
  href: "/portal/help#unconfirmed-brands",
};

export const MARKETPLACES: { value: string; label: string }[] = [
  { value: "amazon_us", label: "Amazon US" },
  { value: "amazon_uk", label: "Amazon UK" },
  { value: "amazon_ca", label: "Amazon CA" },
  { value: "amazon_de", label: "Amazon DE" },
  { value: "amazon_au", label: "Amazon AU" },
];

// "Estimated completion" shown on the submit confirmation screen. COPY RULING 2026-08-12:
// 24 hours on every plan, derived from CASE_SLA_HOURS — the plan no longer changes the answer
// (param kept so callers stay untouched; per-plan SLAs are retired).
export function estimatedCompletionLabel(plan: PlanType | null): string {
  void plan; // retired input, kept for caller stability
  return `Within ${CASE_SLA_HOURS} hours`;
}
