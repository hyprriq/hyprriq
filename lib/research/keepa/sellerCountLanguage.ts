// ── THE READING, IN WORDS — cause-is-inference enforced at the sentence level ────────────────
//
// FOUNDER RULING 2026-09-08 (recorded in docs/KEEPA_READING_GUIDE_recovered.md): whatever ships
// says "seller count fell sharply in this window, and here is what can produce that shape" —
// NEVER "the brand enforced". Show the pattern, name what it does not prove.
//
// FOUNDER REFRAMING 2026-09-12 ("the facts are right; the writing is a data dump with a
// disclaimer attached") — three laws applied to every pattern:
//   1. THE FINDING GETS SAID FIRST — what the measurement amounts to, then the numbers.
//   2. STOREFRONTS ARE GROUPED BY KIND, never listed as equal-weight items with a repeated
//      clause per row.
//   3. The cause-is-inference close stays; the locked boundary sentence stays BYTE-EXACT.
// Small counts are written as words (the founder's ratified exemplar: "between one and three",
// "a twelve-month peak of seven").
//
// ⚠ EVERY SENTENCE HERE IS PROPOSED CLIENT COPY, UNRULED until the founder ratifies the exact
// wording (client copy is founder-ruled by standing law; the 2026-09-08 set was ratified, this
// 2026-09-12 rewrite awaits its ratification and DOES NOT DEPLOY before it). Held to scanHard +
// scanAssertion + the method-leakage scanner from birth.

import type { SellerCountReading, DropEvent } from "./sellerCountReading";
import type { SellerIdentity } from "./aggregators";

const month = (d: Date): string =>
  d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

const COUNT_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen",
  "nineteen", "twenty",
] as const;
const countWord = (n: number): string => COUNT_WORDS[n] ?? String(n);
/** A paired comparison mixes registers badly ("from 39 to four") — words only when BOTH fit. */
const pairWords = (a: number, b: number): [string, string] =>
  a <= 20 && b <= 20 ? [countWord(a), countWord(b)] : [String(a), String(b)];

// The shape-not-cause sentence for the CLIFF, one definition (ruled 2026-09-08).
export const WHAT_PRODUCES_THIS_SHAPE =
  "Several different events can produce this shape — brand enforcement activity, an exclusivity arrangement, sellers losing their supply, or the marketplace itself entering the listing. The pattern is the observation; the cause is not visible from the outside.";

// The founder's close for sustained-low readings (his 2026-09-12 exemplar, near-verbatim).
export const SUSTAINED_LOW_CLOSE =
  "Several things can produce a sustained low count. This is what the listing shows, not why.";

function dropSentence(drop: DropEvent, priceHeld: boolean | null): string {
  const price =
    priceHeld === true ? " while the listed price held roughly level"
    : priceHeld === false ? " while the listed price also fell"
    : "";
  const [from, to] = pairWords(drop.from, drop.to);
  return `Seller count fell from ${from} to ${to} across ${drop.days} days, ending ${month(drop.endDate)},${price}.`;
}

/** The true twelve-month peak clause — peak12, never the all-history peak (the 047/048 monitor
 *  line said "12-month peak" over an all-history date; found 2026-09-12, fixed at the reading). */
function peakClause(r: SellerCountReading): string {
  return r.peak12 != null && r.current != null && r.peak12 > r.current
    ? `, against a twelve-month peak of ${countWord(r.peak12)}`
    : "";
}

export function sellerCountSentence(r: SellerCountReading, priceHeld: boolean | null): string {
  switch (r.pattern) {
    case "enforcement_cliff":
      return `This listing's third-party sellers left fast. ${dropSentence(r.drop!, priceHeld)} ${WHAT_PRODUCES_THIS_SHAPE}`;
    case "open_market_stable_high":
      return `This listing shows an open reseller environment. Seller count has held near ${countWord(r.current!)} across the observed ${r.observedDays} days, with no significant drops.`;
    case "gradual_decline": {
      const [from, to] = pairWords(r.peak!, r.current!);
      return `This listing's third-party presence is thinning. Seller count declined from ${from} to ${to} over the observed ${r.observedDays} days. A slow decline can reflect tightening distribution or ordinary seller turnover; periodic monitoring is the practical response.`;
    }
    case "already_locked_down": {
      // Founder's 2026-09-12 exemplar, followed clause for clause. The months number stays
      // (his 2026-09-08 change (a)): judged over the lockdown window, never beyond what was read.
      const months = Math.max(1, Math.round(Math.min(r.observedDays, 183) / 30));
      return `This listing has very little third-party presence. Seller count has stayed between one and three over the last ${countWord(months)} months and currently stands at ${countWord(r.current!)}${peakClause(r)}. ${SUSTAINED_LOW_CLOSE}`;
    }
    case "brand_direct_only":
      return `This listing is sold by a single storefront. One seller has held it across the observed ${r.observedDays} days; where that storefront matches the brand, this is a brand-direct selling model. ${SUSTAINED_LOW_CLOSE}`;
    case "volatile_unstable": {
      const [peak, low] = pairWords(r.peak!, r.min!);
      return `This listing's seller count has not settled. It swung repeatedly across the observed period (peak ${peak}, low ${low}) without holding a level. The swings are the observation; no single cause is identifiable from the outside.`;
    }
    case "rising_trend": {
      const [from, to] = pairWords(r.min!, r.current!);
      return `This listing's third-party presence is widening. Seller count rose from around ${from} toward ${to} across the observed period. No enforcement-shaped drop appears in this window.`;
    }
    case "stable_unclassified":
      return `This listing's seller count has been steady at a middle level. It held near ${countWord(r.current!)} across the observed ${r.observedDays} days; this level matches none of the named marketplace patterns, so the numbers are reported for your own read.`;
    case "insufficient_history":
      return "This listing's seller-count history is too short to support a reading. No conclusion is drawn from it.";
  }
}

// ⛔ FOUNDER-RATIFIED VERBATIM (2026-09-08, change (c)) AND RE-CONFIRMED BYTE-EXACT in the
// 2026-09-12 reframing ruling: "The boundary sentence stays byte-exact — it is already locked
// and must not be reworded." Locked by test.
export const UNMATCHED_BOUNDARY =
  "A storefront that matches neither list is reported as unmatched — that is an observation about the storefront name, not a determination of who owns it.";

/** GROUPED identity sentence (founder reframing 2026-09-12: say the SHAPE — never four items of
 *  equal weight, never the same clause repeated per storefront). */
export function sellerIdentitySentence(identities: { name: string; identity: SellerIdentity }[]): string | null {
  if (identities.length === 0) return null;
  const by = (kind: SellerIdentity["kind"]) => identities.filter(({ identity }) => identity.kind === kind);
  const amazon = by("amazon_retail");
  const brand = by("brand_direct");
  const aggregator = by("aggregator");
  const unmatched = by("independent");

  const clauses: string[] = [];
  if (amazon.length > 0) clauses.push(`${countWord(amazon.length)} ${amazon.length === 1 ? "is" : "are"} Amazon's own retail presence`);
  if (brand.length > 0) clauses.push(`${countWord(brand.length)} ${brand.length === 1 ? "matches" : "match"} the brand itself`);
  if (aggregator.length > 0) {
    const names = [...new Set(aggregator.map(({ identity }) => (identity.kind === "aggregator" ? identity.matched : "")))].filter(Boolean);
    clauses.push(`${countWord(aggregator.length)} ${aggregator.length === 1 ? "matches" : "match"} ${names.join(" and ")}, a known marketplace aggregator${names.length > 1 ? "s" : ""}`);
  }
  if (unmatched.length > 0) {
    clauses.push(`${amazon.length + brand.length + aggregator.length > 0 ? `the remaining ${countWord(unmatched.length)}` : countWord(unmatched.length)} ${unmatched.length === 1 ? "matches" : "match"} neither the brand name nor any known aggregator storefront`);
  }
  const lead = `Of the ${countWord(identities.length)} storefront${identities.length === 1 ? "" : "s"} observed, ${clauses.join("; ")}.`;
  // The locked boundary rides ONLY when an unmatched storefront exists — it is the honest
  // boundary on that class, not a footer for every list.
  return unmatched.length > 0 ? `${lead} ${UNMATCHED_BOUNDARY}` : lead;
}

export const LISTING_UNRETRIEVABLE =
  "This listing could not be retrieved from marketplace history, so no reading is drawn for it.";

/** The degrade-path cached-category line — FOUNDER-RATIFIED WORDING 2026-09-09, date always
 *  visible (a cached fact presented as fresh is the instrument-lying class). */
export function cachedCategorySentence(path: string[], fetchedAt: Date): string {
  const date = fetchedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return `Listing history could not be obtained; the listing's category placement, as fetched on ${date}, was ${path.join(" › ")}.`;
}

export const SELLER_DATA_UNAVAILABLE =
  "Marketplace listing history could not be obtained for this case, so this advisory item is reported without it. This is a data-availability note about our research, not a finding about the supplier or the brand.";

/** §P4.3 step 9 — the brand-level line rides only on multi-ASIN agreement. */
export function brandLevelSentence(agreement: "brand_level" | "asin_specific" | "single_asin", asinCount: number): string {
  if (agreement === "brand_level") return `The same pattern appears on all ${asinCount} listings checked for this brand — a brand-level observation rather than a single listing's story.`;
  if (agreement === "asin_specific") return `The listings checked for this brand show different patterns — the observations above are listing-specific, not a brand-level signal.`;
  return "One listing was readable for this brand; the observation is that listing's story and is not extended to the brand.";
}

/** Dated, concrete monitoring entries. The peak is peak12 — honestly twelve-month — since the
 *  2026-09-12 find that the old line labeled an all-history peak "12-month". */
export function monitorEntries(asin: string, r: SellerCountReading): string[] {
  if (r.pattern === "insufficient_history" || r.current == null) return [];
  const base = `Third-party seller count on ${asin} — currently ${r.current}`;
  const peak = r.peak12 != null && r.peak12Date && r.peak12 > r.current
    ? ` against a twelve-month peak of ${r.peak12} (${month(r.peak12Date)})`
    : "";
  if (r.pattern === "enforcement_cliff" || r.pattern === "gradual_decline") {
    return [`${base}${peak}. Watch whether the count recovers or continues to fall.`];
  }
  if (r.pattern === "rising_trend") return [`${base}${peak}. Watch whether the widening continues.`];
  return [`${base}${peak}.`];
}
