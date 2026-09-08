// ── §P4.5 AGGREGATOR RECOGNITION — the thirteen, with the RULED LIMITS beside the list ───────
//
// Source: docs/KEEPA_READING_GUIDE_recovered.md §P4.5 (verbatim names). The two 2026-09-08
// founder rulings that govern every use of this list:
//   · BRAND-DIRECT IS A CLAIM (seller name ≈ brand name — tight match);
//   · AGGREGATOR IS ASSERTED ON EXACT LIST MATCH ONLY, PHRASED AS OBSERVED, NEVER INFERRED
//     FROM ABSENCE. Aggregators frequently sell under acquired-brand storefront names; a
//     miss here means "no aggregator storefront observed", never "not aggregator-owned".

export const AGGREGATORS: readonly string[] = [
  "Perch", "Branded", "Thrasio", "Factory14", "Heyday", "Elevate Brands", "Heroes",
  "Accel Club", "Berlin Brands Group", "Suma Brands", "Boosted Commerce", "Benitago",
  "Cap Hill Brands",
]; // §P4.5, verbatim — 13 names as of the 2026 guide

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export type SellerIdentity =
  | { kind: "brand_direct"; matched: string }
  | { kind: "aggregator"; matched: string }        // exact-list hit ONLY
  | { kind: "amazon_retail" }                       // Amazon itself on the listing — probe-proven
                                                    // observable (2026-09-08: sellerId ATVPDKIKX0DER,
                                                    // names "Amazon.com"/"Amazon Resale"). One of the
                                                    // founder's alternative cliff causes, observed.
  | { kind: "independent" };                        // NOT a claim of independence from the brand —
                                                    // the honest residue: no list hit, no brand match

/** Amazon Retail's fixed US sellerId — measured from the 2026-09-08 probe, not recalled. */
export const AMAZON_RETAIL_SELLER_ID = "ATVPDKIKX0DER";

/** Classify one storefront name. `brand` enables the brand-direct claim; matching is
 *  containment on normalized tokens — "Thrasio LLC" hits, "Thrifty" does not. */
export function classifySeller(sellerName: string, brand: string | null, sellerId?: string): SellerIdentity {
  if (sellerId === AMAZON_RETAIL_SELLER_ID) return { kind: "amazon_retail" };
  const n = norm(sellerName);
  if (!n) return { kind: "independent" };
  if (/^amazon(\s|$|\.)/.test(n + " ") && (n === "amazon" || n.startsWith("amazon com") || n.startsWith("amazon resale") || n.startsWith("amazon warehouse"))) {
    return { kind: "amazon_retail" };
  }
  if (brand) {
    const b = norm(brand);
    if (b && (n === b || n.includes(b) || b.includes(n))) return { kind: "brand_direct", matched: brand };
  }
  for (const a of AGGREGATORS) {
    const an = norm(a);
    // Exact word-boundary containment: every token of the aggregator name, in order.
    if (n === an || n.startsWith(`${an} `) || n.endsWith(` ${an}`) || n.includes(` ${an} `)) {
      return { kind: "aggregator", matched: a };
    }
  }
  return { kind: "independent" };
}
