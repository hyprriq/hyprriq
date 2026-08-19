import { AREA_NAMES } from "@/lib/content/reportCopy";

// Phase 5.1c (ADR-T2-002) — Track 2's three DISTINCT boundary notes, code-templated (never LLM-generated)
// so their wording can never drift or weaken over time. Each guards one boundary of Track 2's lane:
//   identity_scope_note        → hands LEGITIMACY/identity UP to the Supplier Identity lane (Track 1/0.5)
//   authorization_scope_note   → states what THIS finding is: the contractual/commercial authorization layer
//   marketplace_eligibility    → hands PLATFORM approval (Amazon/Walmart/eBay) DOWN, out of scope
// authorization_scope_note (commercial eligibility) and the marketplace disclaimer (platform policy) are
// related but NOT redundant — they describe different layers and are worded so they never read the same.

// ── DANGLING CROSS-REFERENCE, FIXED 2026-08-19 (founder-reported on AWI-2608-038) ────────────
// This note told the client to "see the Supplier Identity findings". THE REPORT HAS NO SECTION BY
// THAT NAME: the area renders as "Supplier Legitimacy" (AREA_NAMES.supplier_identity). The finding
// was there all along — 1,151 characters on 038 — under a different heading, so a client following
// the instruction finds nothing and concludes the report is incomplete.
//
// ⚠ IT IS BUILT FROM AREA_NAMES, NOT RETYPED. Hardcoding the heading here is what caused the drift:
// it was a FIFTH copy of an area name, in prose, which the reportCopy lock cannot catch because it
// is a sentence rather than a declaration. Referencing the shared source means the note and the
// heading can never disagree again — rename the area and this sentence follows.
export const IDENTITY_SCOPE_NOTE =
  `Supplier legitimacy and identity verification are assessed separately (see the ${AREA_NAMES.supplier_identity} findings); this analysis addresses the brand/supply-chain relationship only.`;

export const AUTHORIZATION_SCOPE_NOTE =
  "This finding assesses the contractual and commercial authorization relationship between the vendor and the brand — whether the vendor is authorized, recognized, or connected as a source for the brand. It does not assess whether any specific online marketplace will approve resale.";

export const MARKETPLACE_ELIGIBILITY_DISCLAIMER =
  "A confirmed distributor or authorization relationship does not guarantee marketplace approval. Platforms such as Amazon, Walmart, and eBay apply seller-history, category, regional, and brand-specific review that cannot be verified by this analysis. Additional verification with the platform and brand may be required before purchasing inventory.";
