// ── Category Compliance (spec 2026-07-23, founder-APPROVED) — Brief v1 §8 as versioned config.
// SOURCE OF TRUTH: docs/CATEGORY_FLAGS_TABLE_recovered.md (founder-authored, recovered verbatim).
// Every flag_language string is FOUNDER CLIENT COPY, code-injected byte-identically — never
// paraphrased, never LLM-written (the VERDICT_SENTENCES law). The doc-identity lock in
// categoryFlagsTable.test.ts fails by name if module and doc ever drift.
// Risk levels are the founder's own enum from the table — nothing invented. ──

export const CATEGORY_FLAGS_CONTRACT_VERSION = "cc-1.0.0" as const;

// The governing law, verbatim from the recovered §8 — the honesty law's source text.
export const CATEGORY_FLAGS_GOVERNING_LAW =
  "All category flags use 'may require' language. Never state requirements as absolute. Amazon policies change. These flags inform the client of potential requirements — they do not confirm or deny Amazon approval.";

export type CategoryRiskLevel = "HIGH" | "MODERATE-HIGH" | "MODERATE";

export interface CategoryFlagRow {
  subcategory: string;          // the table's Subcategory column, the payload's key
  trigger_keywords: string[];   // CATEGORY-DEFINITION AID for Hop-1 research (per the two-hop
                                // ruling) — NOT a text matcher. Exception: the brand_keyed row,
                                // where these ARE brand names matched in code against the roster.
  flag_language: string;        // founder client copy, VERBATIM — injected, never generated
  risk_level: CategoryRiskLevel;
  brand_keyed: boolean;         // true → matched against brands_submitted in code, no research hop
}

export const BRAND_KEYED_SUBCATEGORY = "Electronics — major brand partner programmes";

export const CATEGORY_FLAGS_TABLE: readonly CategoryFlagRow[] = [
  {
    subcategory: "Energy / stimulant supplements",
    trigger_keywords: ["energy", "stimulant", "pre-workout", "thermogenic", "fat burner", "weight loss", "male enhancement", "female enhancement"],
    flag_language: "This product may require seller-level independent third-party lab testing separate from any manufacturer Certificate of Analysis. Check Amazon's restricted substances list before listing.",
    risk_level: "HIGH", brand_keyed: false,
  },
  {
    subcategory: "General supplements / vitamins",
    trigger_keywords: ["supplement", "vitamin", "mineral", "probiotic", "omega", "protein powder", "collagen", "elderberry"],
    flag_language: "Amazon may require compliance documentation depending on product claims. Verify current requirements before committing inventory at scale.",
    risk_level: "MODERATE", brand_keyed: false,
  },
  {
    subcategory: "Baby / infant products",
    trigger_keywords: ["baby", "infant", "newborn", "toddler", "0-12 months", "0-24 months", "baby monitor"],
    flag_language: "May require CPSC/ASTM seller-level compliance documentation separate from brand certification. Verify specific requirements before listing.",
    risk_level: "MODERATE-HIGH", brand_keyed: false,
  },
  {
    subcategory: "Children's toys",
    trigger_keywords: ["toy", "children", "kids", "ages 3+", "play", "game", "puzzle", "doll", "action figure"],
    flag_language: "ASTM F963/CPSC compliance documentation may apply at seller level. Requirements may exceed brand-level certification.",
    risk_level: "MODERATE", brand_keyed: false,
  },
  {
    subcategory: "Food / grocery / perishables",
    trigger_keywords: ["food", "grocery", "snack", "beverage", "perishable", "frozen", "best by", "expiration", "drink", "supplement bar"],
    // Row 5 FOUNDER-AMENDED 2026-07-23: "Expiry dates visible on units required." (the recovered
    // verbatim) stated a requirement as absolute, violating §8's OWN governing law — the higher
    // authority. A RULED amendment, recorded in the doc; not drift, and never to be "restored".
    flag_language: "Check Amazon shelf-life requirements, lot tracking requirements, and FBA storage requirements before shipping. Expiry dates may need to be visible on units.",
    risk_level: "MODERATE", brand_keyed: false,
  },
  {
    subcategory: "Topical / beauty / cosmetics",
    trigger_keywords: ["cream", "lotion", "cosmetic", "serum", "skin", "hair", "SPF", "sunscreen", "moisturizer", "OTC claim", "drug fact"],
    flag_language: "May trigger topical, drug-claim, cosmetic safety, or labeling review depending on product claims. OTC-style claims on packaging may require additional documentation.",
    risk_level: "MODERATE-HIGH", brand_keyed: false,
  },
  {
    subcategory: "Medical devices / health monitors",
    trigger_keywords: ["medical", "FDA", "device", "blood pressure", "glucose monitor", "thermometer", "pulse oximeter", "health monitor"],
    flag_language: "May require FDA clearance documentation or product compliance documentation at seller level. Requirements change frequently — verify before listing.",
    risk_level: "HIGH", brand_keyed: false,
  },
  {
    subcategory: "Hazmat / chemical / aerosol / battery",
    trigger_keywords: ["aerosol", "lithium battery", "lithium ion", "flammable", "cleaner", "chemical", "spray", "dangerous goods", "hazmat"],
    flag_language: "May trigger hazmat documentation requirements, FBA storage restrictions, or shipping restrictions. Check Amazon's dangerous goods program requirements.",
    risk_level: "HIGH", brand_keyed: false,
  },
  {
    subcategory: BRAND_KEYED_SUBCATEGORY,
    trigger_keywords: ["Lenovo", "HP", "Cisco", "Microsoft", "Adobe", "Samsung Business", "Zebra", "Honeywell", "Epson"],
    flag_language: "Brand may require partner programme enrollment or authorization separate from distributor invoice. Verify with supplier whether account is enrolled in brand's partner programme.",
    risk_level: "MODERATE-HIGH", brand_keyed: true,
  },
] as const;

// The closed key set Hop-2 validates against (LLM proposes a subcategory; code checks membership).
export const SUBCATEGORY_KEYS = new Set(CATEGORY_FLAGS_TABLE.map((r) => r.subcategory));
