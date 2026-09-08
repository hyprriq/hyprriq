// ── THE READING, IN WORDS — cause-is-inference enforced at the sentence level ────────────────
//
// FOUNDER RULING 2026-09-08 (recorded in docs/KEEPA_READING_GUIDE_recovered.md): whatever ships
// says "seller count fell sharply in this window, and here is what can produce that shape" —
// NEVER "the brand enforced". Show the pattern, name what it does not prove. §P4.2's report-
// language column supplies the structure; its causal clauses are superseded by that ruling.
//
// ⚠ EVERY SENTENCE HERE IS PROPOSED CLIENT COPY, UNRULED until the founder ratifies the exact
// wording (client copy is founder-ruled by standing law). Held to scanHard + scanAssertion +
// the method-leakage scanner by sellerCountLanguage.test.ts from birth.

import type { SellerCountReading, DropEvent } from "./sellerCountReading";
import type { SellerIdentity } from "./aggregators";

const month = (d: Date): string =>
  d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

// The shape-not-cause sentence, used wherever a sharp fall is described. One definition.
export const WHAT_PRODUCES_THIS_SHAPE =
  "Several different events can produce this shape — brand enforcement activity, an exclusivity arrangement, sellers losing their supply, or the marketplace itself entering the listing. The pattern is the observation; the cause is not visible from the outside.";

function dropSentence(drop: DropEvent, priceHeld: boolean | null): string {
  const price =
    priceHeld === true ? " while the listed price held roughly level"
    : priceHeld === false ? " while the listed price also fell"
    : "";
  return `Third-party seller count fell from ${drop.from} to ${drop.to} across ${drop.days} days, ending ${month(drop.endDate)},${price}.`;
}

export function sellerCountSentence(r: SellerCountReading, priceHeld: boolean | null): string {
  switch (r.pattern) {
    case "enforcement_cliff":
      return `${dropSentence(r.drop!, priceHeld)} ${WHAT_PRODUCES_THIS_SHAPE}`;
    case "open_market_stable_high":
      return `Third-party seller count held near ${r.current} across the observed ${r.observedDays} days — consistent with an open reseller environment for this listing.`;
    case "gradual_decline":
      return `Third-party seller count declined gradually — from a peak of ${r.peak} to ${r.current} over the observed ${r.observedDays} days. A slow decline can reflect tightening distribution or ordinary seller turnover; periodic monitoring is the practical response.`;
    case "already_locked_down": {
      // Founder-ratified 2026-09-08 with change (a): the window gets a NUMBER — "recent months"
      // is the vagueness the rest of the product refuses. The claim is judged over the lockdown
      // window (≤6 months), so the stated months never exceed what the classifier actually read.
      const months = Math.max(1, Math.round(Math.min(r.observedDays, 183) / 30));
      return `Third-party seller count has stayed between 1 and 3 across the last ${months} months (currently ${r.current}). The listing shows very limited third-party presence.`;
    }
    case "brand_direct_only":
      return `One seller has held this listing consistently across the observed ${r.observedDays} days. Where the storefront matches the brand, that is a brand-direct selling model on this listing.`;
    case "volatile_unstable":
      return `Third-party seller count swung repeatedly across the observed period (peak ${r.peak}, low ${r.min}) without settling at a level — consistent with listing instability or intermittent enforcement-shaped events. The swings are the observation; no single cause is identifiable from the outside.`;
    case "rising_trend":
      return `Third-party seller count rose across the observed period (from around ${r.min} toward ${r.current}), suggesting distribution that is widening rather than tightening. No enforcement-shaped drop appears in this window.`;
    case "stable_unclassified":
      return `Third-party seller count held near ${r.current} across the observed ${r.observedDays} days. This level matches none of the named marketplace patterns; the numbers are reported for your own read.`;
    case "insufficient_history":
      return "This listing's seller-count history is too short to support a reading. No conclusion is drawn from it.";
  }
}

// ⛔ FOUNDER-RATIFIED VERBATIM (2026-09-08, change (c)): "It is the honest boundary on the
// weakest part of the reading and it must never be edited down for brevity." Locked by test.
export const UNMATCHED_BOUNDARY =
  "A storefront that matches neither list is reported as unmatched — that is an observation about the storefront name, not a determination of who owns it.";

const COUNT_WORDS = ["zero", "one", "two", "three", "four", "five"] as const;
const countWord = (n: number): string => COUNT_WORDS[n] ?? String(n);

export function sellerIdentitySentence(identities: { name: string; identity: SellerIdentity }[]): string | null {
  if (identities.length === 0) return null;
  // Founder-ratified change (b): LEAD WITH THE FINDING — two Amazon storefronts are not two
  // items of equal weight beside two unknowns.
  const amazon = identities.filter(({ identity }) => identity.kind === "amazon_retail");
  const rest = identities.filter(({ identity }) => identity.kind !== "amazon_retail");
  const lead = amazon.length > 0
    ? `Of the ${countWord(identities.length)} storefronts observed, ${countWord(amazon.length)} ${amazon.length === 1 ? "is" : "are"} Amazon's own retail presence on the listing.`
    : null;
  const parts = rest.map(({ name, identity }) => {
    if (identity.kind === "brand_direct") return `"${name}" matches the brand itself`;
    if (identity.kind === "aggregator") return `"${name}" matches ${identity.matched}, a known marketplace aggregator`;
    return `"${name}" shows no match to the brand or to known aggregator storefronts`;
  });
  const restSentence = parts.length > 0
    ? `${lead ? "Of the rest: " : "Remaining storefronts observed: "}${parts.join("; ")}.`
    : null;
  return [lead, restSentence, UNMATCHED_BOUNDARY].filter(Boolean).join(" ");
}

export const LISTING_UNRETRIEVABLE =
  "This listing could not be retrieved from marketplace history, so no reading is drawn for it.";

export const SELLER_DATA_UNAVAILABLE =
  "Marketplace listing history could not be obtained for this case, so this advisory item is reported without it. This is a data-availability note about our research, not a finding about the supplier or the brand.";

/** §P4.3 step 9 — the brand-level line rides only on multi-ASIN agreement. */
export function brandLevelSentence(agreement: "brand_level" | "asin_specific" | "single_asin", asinCount: number): string {
  if (agreement === "brand_level") return `The same pattern appears on all ${asinCount} listings checked for this brand — a brand-level observation rather than a single listing's story.`;
  if (agreement === "asin_specific") return `The listings checked for this brand show different patterns — the observations above are listing-specific, not a brand-level signal.`;
  return "One listing was readable for this brand; the observation is that listing's story and is not extended to the brand.";
}

/** Dated, concrete monitoring entries (founder-approved 2026-09-08: stage 1, not a nice-to-have). */
export function monitorEntries(asin: string, r: SellerCountReading): string[] {
  if (r.pattern === "insufficient_history" || r.current == null) return [];
  const base = `Third-party seller count on ${asin} — currently ${r.current}`;
  const peak = r.peak != null && r.peakDate ? ` against a 12-month peak of ${r.peak} (${month(r.peakDate)})` : "";
  if (r.pattern === "enforcement_cliff" || r.pattern === "gradual_decline") {
    return [`${base}${peak}. Watch whether the count recovers or continues to fall.`];
  }
  if (r.pattern === "rising_trend") return [`${base}${peak}. Watch whether the widening continues.`];
  return [`${base}${peak}.`];
}
