// ── THE CATEGORY CACHE READ — DEGRADE PATH ONLY (founder-ruled 2026-09-09) ───────────────────
//
// A RESILIENCE FEATURE, NOT AN OPTIMISATION — the founder accepted the reframe in those words.
// The category tree arrives FREE inside the live seller call, so a cache read on the normal
// path saves nothing; the only moment this file earns its place is when Keepa cannot be
// reached (key expired, quota out, API down) and a brand we have seen before can still show
// the marketplace's own category placement — DATED.
//
// THE FOUR RULED CONSTRAINTS, all load-bearing:
//   · DEGRADE PATH ONLY — the normal path never reads here; both facts arrive fresh.
//   · CATEGORY TREE ONLY — never the seller count, and here is the REASONING beside the code
//     (founder-ordered it recorded, not just decided): the seller-history cache window is ZERO
//     because the value of that data IS movement — a stale count would report a collapse that
//     has since recovered, or miss one that just happened; live costs ~1-2 tokens per ASIN
//     against a 1/minute refill (ten-fold headroom at full Scale volume); and a dated category
//     is still TRUE while a dated seller count inside a risk reading is the instrument-lying
//     class — an instrument reporting success without looking. The one tempting exception
//     (fall back to cached history when Keepa is down) was considered and REJECTED for exactly
//     that reason, by builder and founder independently.
//   · ASIN MATCH, NEVER BRAND MATCH — brand_cache is keyed by brand, but a category tree
//     belongs to an ASIN; same brand, different ASIN can mean a different tree. The stored
//     keepa_data_json carries the ASIN it was fetched for; a row only answers for THAT ASIN.
//   · fetched_at ALWAYS VISIBLE — a cached fact presented as fresh is the same class as an
//     instrument reporting success without looking (founder's words). The client sentence
//     carries the fetch date; there is no undated form.
//
// (cache_valid_days plays no part here and does not exist: the 2026-09-09 measurement found
// brand_cache was FILE-FICTION — defined in the initial-schema file, never applied to the live
// database, so the stage-1 writer had been fail-softing on every case with only a console
// witness. The companion migration 20260909000000 creates the table in its RULED shape, born
// without a day-window column: category reads are indefinite-but-dated, seller reads are
// zero-window. Until the founder runs it, this reader returns null and the degrade note stands
// alone — honest, just cache-less.)

import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeName } from "@/lib/utils/normalize-name";

export interface CachedCategory { path: string[]; fetchedAt: Date }

/** PURE matching rule, unit-tested: a cache row answers only for the ASIN it was fetched for. */
export function matchCachedCategory(
  row: { keepa_data_json?: unknown } | null | undefined,
  asin: string,
): CachedCategory | null {
  const j = row?.keepa_data_json as { asin?: unknown; category_tree?: unknown; fetched_at?: unknown } | null | undefined;
  if (!j || typeof j !== "object") return null;
  if (typeof j.asin !== "string" || j.asin !== asin) return null;      // ASIN match, never brand match
  if (!Array.isArray(j.category_tree)) return null;
  const path = (j.category_tree as unknown[]).filter((x): x is string => typeof x === "string" && x.trim() !== "");
  if (path.length === 0) return null;
  const fetchedAt = typeof j.fetched_at === "string" ? new Date(j.fetched_at) : null;
  if (!fetchedAt || Number.isNaN(fetchedAt.getTime())) return null;    // undated cache = unusable cache
  return { path, fetchedAt };
}

/** The degrade-path reader. Fail-soft in both directions: a cache miss or a DB error yields
 *  null and the degrade note stands alone — the cache must never break the path it exists to
 *  soften. */
export async function readCachedCategory(brand: string, asin: string): Promise<CachedCategory | null> {
  try {
    const { data } = await supabaseAdmin
      .from("brand_cache")
      .select("keepa_data_json")
      .eq("brand_name_normalized", normalizeName(brand))
      .maybeSingle();
    return matchCachedCategory(data, asin);
  } catch {
    return null;
  }
}
