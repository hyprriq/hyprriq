// H7 (SO-1) — ONE canonical form for a real-world source URL, shared by the pack dedupe and the
// source-diversity cap (one fn, all sites). Conservative: strips only noise that provably does not
// change the document (scheme, www, trailing slash, tracking params); meaningful queries survive.
const TRACKING_PARAM = /^(utm_|fbclid|gclid|msclkid|mc_|ref$|ref_)/i;

export function canonicalUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const params = [...u.searchParams.entries()]
      .filter(([k]) => !TRACKING_PARAM.test(k))
      .sort(([a], [b]) => a.localeCompare(b));
    const query = params.length ? `?${params.map(([k, v]) => `${k}=${v}`).join("&")}` : "";
    const path = u.pathname.replace(/\/+$/, "");
    return `${host}${path}${query}`;
  } catch {
    return url.trim().toLowerCase(); // not a URL — still a stable key, never a throw
  }
}
