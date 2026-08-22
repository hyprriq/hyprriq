// ── LEGAL CONSTANTS — one source, referenced by all six legal pages. ─────────────────────────
//
// THE COPY IS FINAL AND LOCKED (founder, 2026-08-21, HyprrIQ_LEGAL_PAGES_FINAL.md): the pages
// TRANSCRIBE it — nothing there is authored, edited, tightened or improved in code. Wording
// concerns are flagged in reports, never fixed in place.
//
// EFFECTIVE DATE — RULED DELIBERATE (founder, 2026-08-22): May 22, 2026 is the date development
// of HyprrIQ began, and the policies are dated from it intentionally — buyers should see an
// operation that has been running, not one that appeared yesterday. NOT an error; do not
// "fix" this to a launch or push date. One line to change if the founder ever re-rules.
export const LEGAL_EFFECTIVE_DATE = "May 22, 2026";

export const COMPANY = {
  legalName: "Hyprr Retail LLC",
  address: "30 N Gould St, Ste R, Sheridan, WY 82801, United States",
  addressShort: "30 N Gould St, Ste R, Sheridan, WY 82801",
  brandLine: "HyprrIQ is a product of Hyprr Retail LLC, operating under the HyprrX brand.",
  legalEmail: "admin@hyprriq.com",
  supportEmail: "support@hyprriq.com",
} as const;

// The six pages and their PERMANENT paths. Terms and Privacy are pointed at by Stripe live
// mode — these URLs must never move (build note in the locked copy).
export const LEGAL_PAGES = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/data-policy", label: "Data" },
  { href: "/refund-policy", label: "Refunds" },
  { href: "/payment-policy", label: "Payment" },
  { href: "/cookie-policy", label: "Cookies" },
] as const;
