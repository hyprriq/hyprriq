// Name normalization (v1.2 Addendum, Patch 10).
//
// Produces a stable cache key for vendor/brand names so that
// "Ingram Micro, Inc." and "ingram micro" resolve to the same
// supplier_cache / brand_cache row. Must be applied on every cache write
// AND every cache lookup — never query by the raw name.
//
// Strips business suffixes, lowercases, removes punctuation except hyphens,
// and collapses whitespace.
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(
      /\b(inc|llc|ltd|corp|corporation|company|co|group|holdings|enterprises|international)\b\.?/gi,
      ""
    )
    .replace(/[^a-z0-9\s\-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Examples (actual output of the regex above):
//   normalizeName('Ingram Micro, Inc.')    -> 'ingram micro'
//   normalizeName('D&H Distributing Co.')  -> 'dh distributing'  (& is stripped as punctuation)
//   normalizeName('UNFI Holdings, LLC')    -> 'unfi'
