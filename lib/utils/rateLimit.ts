// ── FIXED-WINDOW RATE LIMITER, in-process (2026-08-22, item 1h) ──────────────────────────────
//
// HONEST SCOPE: this is per-instance memory. On serverless every warm instance counts alone and
// a cold start forgets — so this is a nuisance brake on casual scripting, NOT a security
// boundary. The real abuse controls on the partner-request path are the DB's one-open-request-
// per-address unique index and the honeypot field; this exists so a loop from one connection
// can't cheaply spray rows between those two. A shared store (Upstash et al) is a deliberate
// future step if launch traffic ever warrants it — not silently assumed here.
//
// CTO-DECIDED: fixed window over sliding — the precision difference is meaningless for a
// nuisance brake, and fixed-window state is one integer per key.

interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();

// A capture endpoint sees few distinct IPs between deploys; cap the map so a spoofed-IP flood
// can't grow memory unbounded. Eviction drops the oldest-expiring entries first.
const MAX_KEYS = 10_000;

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): { allowed: boolean } {
  const w = buckets.get(key);
  if (!w || now >= w.resetAt) {
    if (buckets.size >= MAX_KEYS && !buckets.has(key)) {
      for (const [k, v] of buckets) {
        if (now >= v.resetAt) buckets.delete(k);
        if (buckets.size < MAX_KEYS) break;
      }
      // Still full of live windows → refuse new keys rather than grow: under an active flood
      // the safe answer for a form endpoint is "try later".
      if (buckets.size >= MAX_KEYS) return { allowed: false };
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  w.count += 1;
  return { allowed: w.count <= limit };
}

/** First hop of x-forwarded-for (the client, per Vercel's header contract), else a shared key. */
export function clientIpFrom(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  const first = xff?.split(",")[0]?.trim();
  return first || headers.get("x-real-ip") || "unknown";
}
