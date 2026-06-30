// Phase 5.1c.5 — shared host-normalization helpers. Extracted verbatim from source_profile.ts so the
// Track 0.5 identity resolver and the Track 2 classifier parse hosts IDENTICALLY (DRY). Pure string
// functions, no trust/authority semantics — kept out of the locked trust registry on purpose.

// Tolerant host parse for loosely-formatted client input: trims whitespace, accepts protocol-less
// ("tdsynnex.com"), www variants, paths, and any-case protocol ("HTTP://", "Https://"). Returns the
// lowercase hostname, or null if unparseable.
export function hostOf(value: string): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  try { return new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`).hostname.toLowerCase(); }
  catch { return null; }
}

// Second-level domain label, handling common 2-part TLDs (co.uk, com.au): lenovo.com → "lenovo",
// www.lenovo.co.uk → "lenovo".
export function domainLabel(host: string): string {
  const parts = host.replace(/^www\./, "").split(".");
  if (parts.length <= 2) return parts[0] ?? "";
  const tld2 = parts.slice(-2).join(".");
  const multi = /^(co|com|org|net|gov|ac)\.[a-z]{2}$/.test(tld2);
  return (multi ? parts[parts.length - 3] : parts[parts.length - 2]) ?? "";
}
