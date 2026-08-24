// ── THE CANONICAL PUBLIC ORIGIN — one constant, consumed by robots.ts, sitemap.ts, and the
// metadataBase (OG/Twitter cards resolve relative URLs against it).
//
// NEXT_PUBLIC_APP_URL wins when set (it is also the delivery email's link origin fallback);
// the apex domain is the hard fallback so a missing env var degrades to the real site, never
// to localhost in a crawler's face.
export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://hyprriq.com";

// ── SEARCH INDEXING — OFF UNTIL LIVE STRIPE (founder condition 1, domain move 2026-08-24) ─────
//
// "A live site whose buy button rejects real cards must not be indexed — once Google has crawled
// it, the bounce signals and the broken funnel are not retractable."
//
// ⚠ THE OBVIOUS MECHANISM IS THE WRONG ONE, and it produces the OPPOSITE of the intent.
// Reaching for `robots.txt: Disallow: /` blocks CRAWLING, not INDEXING: Google can still index a
// URL it found linked elsewhere and show it with no description, and — because it is forbidden to
// fetch the page — it will NEVER see a noindex tag. Blocking the crawler makes the site MORE
// likely to be indexed badly, not less.
//
// So robots.txt stays PERMISSIVE and the crawler is let in specifically to be told not to index.
// robots.lock.test.ts holds both halves of that inversion.
//
// FLIP THIS TO true ON THE DAY LIVE STRIPE IS CONFIGURED, and not before.
export const SEARCH_INDEXING_ENABLED = false;
