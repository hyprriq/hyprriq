// Submit-flow copy. Kept here (not inline in the component) per the project
// content-file pattern so wording can change without touching form logic.

// Vendor-brand vetting expectation-setter, shown under the brand-tags input.
// This is the in-form half of the mechanism; the full explanation lives in the
// Help Centre FAQ (see lib/content/help.ts -> "unconfirmed-brands").
export const brandHelper =
  "Brands not shown on your uploaded document will still be researched, but the report will flag them as unconfirmed against this vendor.";

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
