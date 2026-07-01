// Phase 5.1c.5 — shared fuzzy vendor-name ↔ domain matcher. Used by BOTH the Track 0.5 discovery
// signal-derivation (track05.ts) and the resolver's provided-website sanity check (identityResolver.ts),
// so "does this name relate to this host" is decided ONE way (DRY). Fuzzy (edit-distance tolerant) so a
// one-character typo still matches; `exact` distinguishes a clean match from a normalized (typo/alias) one.
import { domainLabel, hostOf } from "./host";
import { normalizeBrandToken } from "./source_profile";

// Levenshtein edit distance (small strings; pure + deterministic).
export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

// FUZZY match between a vendor name and a candidate domain (label): a one-character typo ("TD Synexx"
// vs tdsynnex) still matches. Returns { match, exact } — exact separates a clean match from a
// normalized (typo/alias) one. Semantic aliases (IBM ↔ International Business Machines) are NOT matched
// — that is an accepted v1 limitation, not a bug.
export function nameMatch(vendorName: string, domain: string): { match: boolean; exact: boolean } {
  const name = normalizeBrandToken(vendorName);
  const label = normalizeBrandToken(domainLabel(hostOf(domain) ?? domain));
  if (!name || !label) return { match: false, exact: false };
  if (name === label) return { match: true, exact: true };
  const tolerance = Math.max(1, Math.floor(Math.min(name.length, label.length) * 0.25));
  return { match: levenshtein(name, label) <= tolerance, exact: false };
}
