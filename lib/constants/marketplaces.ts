// Client business-profile marketplace list (Item 1 — clients.primary_marketplace).
// Distinct from lib/content/submit.ts MARKETPLACES, which is the per-CASE Amazon
// locale picker. This is the broader "where does your business sell" set and must
// stay in sync with the CHECK constraint in
// supabase/migrations/20260622010000_client_profile_and_notes.sql.
export const PRIMARY_MARKETPLACES: { value: string; label: string }[] = [
  { value: "amazon_us", label: "Amazon US" },
  { value: "amazon_uk", label: "Amazon UK" },
  { value: "amazon_de", label: "Amazon DE (Germany)" },
  { value: "amazon_ca", label: "Amazon CA (Canada)" },
  { value: "amazon_au", label: "Amazon AU (Australia)" },
  { value: "amazon_mx", label: "Amazon MX (Mexico)" },
  { value: "walmart_us", label: "Walmart US" },
  { value: "ebay_us", label: "eBay US" },
  { value: "shopify", label: "Shopify (own store)" },
  { value: "tiktok_shop", label: "TikTok Shop" },
  { value: "wholesale_only", label: "Wholesale only (no online marketplace)" },
  { value: "other", label: "Other" },
];

export const PRIMARY_MARKETPLACE_VALUES = PRIMARY_MARKETPLACES.map((m) => m.value);

export function primaryMarketplaceLabel(value: string | null): string | null {
  if (!value) return null;
  return PRIMARY_MARKETPLACES.find((m) => m.value === value)?.label ?? value;
}

// Short country list for the onboarding "Country" requirement + Settings. Kept
// minimal and ISO-ish; free enough for wholesale clients. Stored as the label.
export const COUNTRIES: string[] = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "India",
  "United Arab Emirates",
  "Mexico",
  "Other",
];
