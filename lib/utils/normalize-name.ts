// Name normalization (v1.2 Addendum, Patch 10).
//
// Produces a stable cache key for vendor/brand names so that
// "Ingram Micro, Inc." and "ingram micro" resolve to the same
// supplier_cache / brand_cache row. Must be applied on every cache write
// AND every cache lookup — never query by the raw name.
//
// Strips business suffixes, lowercases, removes punctuation except hyphens,
// and collapses whitespace. If a name is made ENTIRELY of suffix words, the
// cleaned tokens are kept rather than returning '' — an empty key collides on
// the UNIQUE cache constraints (brief §3.1).
const BUSINESS_SUFFIXES = new Set([
  "llc", "inc", "corp", "ltd", "co", "company", "corporation", "incorporated",
  "limited", "lp", "llp", "pllc", "plc", "group", "holdings", "enterprises",
  "international",
]);

export function normalizeName(name: string): string {
  if (!name?.trim()) return "";
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const tokens = cleaned.split(" ").filter(Boolean);
  const meaningful = tokens.filter((t) => !BUSINESS_SUFFIXES.has(t));
  return (meaningful.length === 0 ? tokens : meaningful).join(" ");
}

// Examples (actual output of the regex above):
//   normalizeName('Ingram Micro, Inc.')    -> 'ingram micro'
//   normalizeName('D&H Distributing Co.')  -> 'dh distributing'  (& is stripped as punctuation)
//   normalizeName('UNFI Holdings, LLC')    -> 'unfi'
