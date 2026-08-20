// ── THE CANONICAL PUBLIC ORIGIN — one constant, consumed by robots.ts, sitemap.ts, and the
// metadataBase (OG/Twitter cards resolve relative URLs against it).
//
// NEXT_PUBLIC_APP_URL wins when set (it is also the delivery email's link origin fallback);
// the apex domain is the hard fallback so a missing env var degrades to the real site, never
// to localhost in a crawler's face.
export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://hyprriq.com";
