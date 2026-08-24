// ── LEGAL CONSTANTS — one source, referenced by all six legal pages. ─────────────────────────
//
// THE COPY IS FINAL AND LOCKED (founder, 2026-08-21, HyprrIQ_LEGAL_PAGES_FINAL.md): the pages
// TRANSCRIBE it — nothing there is authored, edited, tightened or improved in code. Wording
// concerns are flagged in reports, never fixed in place.
//
// ── EFFECTIVE DATE — UNSET UNTIL LAUNCH (founder-ruled 2026-08-22, superseding the May-22
// ruling of the previous day): the date is set to the day the pages go live on the PRODUCTION
// domain — not a staging push, not a development date. THE FOUNDER SETS IT AT THE DOMAIN MOVE:
// replace null with e.g. "August 30, 2026". While null, the pages render "Effective on launch"
// instead of a date — a past or placeholder date structurally cannot ship. ──
// SET AT THE DOMAIN MOVE (2026-08-24, founder condition 3). Phase 0 of the move.
// ⚠ THIS MUST EQUAL THE DAY THE PAGES GO LIVE ON THE PRODUCTION DOMAIN. It is set here during the
// pre-merge phase; if the merge slips to another day, change this line before merging. The
// pre-merge checklist in the tracker names it for exactly that reason.
export const LEGAL_EFFECTIVE_DATE: string | null = "August 24, 2026";

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
