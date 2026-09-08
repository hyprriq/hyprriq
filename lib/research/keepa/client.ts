// ── THE KEEPA CLIENT — quota-aware from the first line (founder condition, 2026-09-08) ───────
//
// The anthropic.ts 429 gap is a standing review finding; this dependency does not repeat it.
// Contract:
//   · KEEPA_API_KEY absent ⇒ { available: false } — the degrade path IS production's path
//     (the key exists only in .env.local and Vercel Preview, by founder instruction).
//   · Every response's own accounting (tokensLeft / refillIn / tokensConsumed) is READ and
//     returned to the caller — burn is measured, never estimated.
//   · Token exhaustion (Keepa answers 429 with refillIn) ⇒ ONE bounded wait (≤ WAIT_CAP_MS)
//     and one retry; still exhausted ⇒ degrade with the reason. Never a loop, never a throw
//     into the case pipeline.
//   · Any other failure (network, 5xx, malformed) ⇒ degrade with the reason. A dead vendor
//     must not strand a paying client's report — the caller renders "could not obtain".
//
// COST MODEL (measured by the probe, then trusted): base /product ≈ 1 token per ASIN (history
// + category tree included); /seller ≈ 1 per seller. Offers (+6/ASIN) are requested ONLY by
// the seller-identification stage, which is gated separately.

const API = "https://api.keepa.com";
const DOMAIN_US = 1; // amazon.com — US-only clients by ruling; not configurable until ruled
const WAIT_CAP_MS = 65_000; // one refill cycle; longer waits belong to the caller's judgment
const TIMEOUT_MS = 30_000;

export interface KeepaQuota { tokensLeft: number; refillIn: number; refillRate: number; tokensConsumed: number }

export type KeepaResult<T> =
  | { available: true; data: T; quota: KeepaQuota }
  | { available: false; reason: string };

export interface KeepaProduct {
  asin: string;
  title: string | null;
  brand: string | null;
  categoryTree: { catId: number; name: string }[];
  /** COUNT_NEW history — csv[11], raw keepa pairs. Parse with parseKeepaCountCsv. */
  countNewCsv: number[] | null;
  /** NEW price history — csv[1], raw keepa pairs (cents). For the cliff discriminator only. */
  priceNewCsv: number[] | null;
  /** Live offer sellerIds — present only when offers were requested. */
  offerSellerIds: string[];
}

function keyOrNull(): string | null {
  const k = process.env.KEEPA_API_KEY;
  return k && k.trim() ? k.trim() : null;
}

export function keepaConfigured(): boolean {
  return keyOrNull() !== null;
}

async function call(path: string): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API}${path}`, { signal: ctrl.signal });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, status: res.status, body };
  } finally {
    clearTimeout(t);
  }
}

function quotaOf(body: Record<string, unknown>): KeepaQuota {
  return {
    tokensLeft: Number(body.tokensLeft ?? -1),
    refillIn: Number(body.refillIn ?? -1),
    refillRate: Number(body.refillRate ?? -1),
    tokensConsumed: Number(body.tokensConsumed ?? 0),
  };
}

/** One request, one bounded quota wait, honest degrade. */
async function withQuota(path: string): Promise<KeepaResult<Record<string, unknown>>> {
  const key = keyOrNull();
  if (!key) return { available: false, reason: "KEEPA_API_KEY not configured" };
  const full = `${path}${path.includes("?") ? "&" : "?"}key=${key}`;
  try {
    let r = await call(full);
    if (r.status === 429) {
      const refillMs = Math.max(0, Number(r.body.refillIn ?? 0));
      if (refillMs > 0 && refillMs <= WAIT_CAP_MS) {
        await new Promise((res) => setTimeout(res, refillMs + 250));
        r = await call(full); // exactly one retry — never a loop
      }
    }
    if (r.status === 429) return { available: false, reason: `keepa quota exhausted (refill in ${r.body.refillIn}ms, beyond the bounded wait)` };
    if (!r.ok) return { available: false, reason: `keepa HTTP ${r.status}: ${JSON.stringify(r.body).slice(0, 160)}` };
    return { available: true, data: r.body, quota: quotaOf(r.body) };
  } catch (e) {
    return { available: false, reason: `keepa unreachable: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/** Up to 5 ASINs (a case's ceiling), ONE request. `withOffers` belongs to the gated
 *  seller-identification stage only. */
export async function fetchProducts(asins: string[], opts?: { withOffers?: boolean }): Promise<KeepaResult<KeepaProduct[]>> {
  if (asins.length === 0) return { available: false, reason: "no ASINs to look up" };
  const params = `domain=${DOMAIN_US}&asin=${asins.map(encodeURIComponent).join(",")}&history=1&stats=365${opts?.withOffers ? "&offers=20" : ""}`;
  const r = await withQuota(`/product?${params}`);
  if (!r.available) return r;
  const products = Array.isArray(r.data.products) ? (r.data.products as Record<string, unknown>[]) : [];
  const data: KeepaProduct[] = products.map((p) => ({
    asin: String(p.asin ?? ""),
    title: typeof p.title === "string" ? p.title : null,
    brand: typeof p.brand === "string" ? p.brand : null,
    categoryTree: Array.isArray(p.categoryTree)
      ? (p.categoryTree as { catId?: unknown; name?: unknown }[])
          .map((c) => ({ catId: Number(c.catId ?? 0), name: String(c.name ?? "") }))
          .filter((c) => c.name)
      : [],
    countNewCsv: Array.isArray((p.csv as unknown[])?.[11]) ? ((p.csv as unknown[])[11] as number[]) : null,
    priceNewCsv: Array.isArray((p.csv as unknown[])?.[1]) ? ((p.csv as unknown[])[1] as number[]) : null,
    offerSellerIds: Array.isArray(p.offers)
      ? [...new Set((p.offers as { sellerId?: unknown }[]).map((o) => String(o.sellerId ?? "")).filter(Boolean))]
      : [],
  }));
  return { available: true, data, quota: r.quota };
}

/** Storefront names for up to 100 sellerIds, ONE request (the gated identification stage). */
export async function fetchSellerNames(sellerIds: string[]): Promise<KeepaResult<Record<string, string | null>>> {
  if (sellerIds.length === 0) return { available: true, data: {}, quota: { tokensLeft: -1, refillIn: -1, refillRate: -1, tokensConsumed: 0 } };
  const r = await withQuota(`/seller?domain=${DOMAIN_US}&seller=${sellerIds.map(encodeURIComponent).join(",")}`);
  if (!r.available) return r;
  const sellers = (r.data.sellers ?? {}) as Record<string, { sellerName?: unknown }>;
  const data: Record<string, string | null> = {};
  for (const id of sellerIds) data[id] = typeof sellers[id]?.sellerName === "string" ? (sellers[id].sellerName as string) : null;
  return { available: true, data, quota: r.quota };
}
