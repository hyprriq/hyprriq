// Banned-language scanner (brief §3.12 + ADR-G001 GR1). Runs before report
// delivery; any violation blocks delivery. The word "ungating" must never appear
// in client-facing output. Detection is intentionally broad — the product never
// confirms authorization or guarantees safety.
const BANNED: { re: RegExp; label: string }[] = [
  { re: /ungat/i, label: "ungating" },
  { re: /authoriz(ed|e)\s+(seller|reseller|distributor)/i, label: "authorized seller/distributor" },
  { re: /authoris(ed|e)\s+(seller|reseller|distributor)/i, label: "authorised seller/distributor" },
  { re: /official\s+distributor/i, label: "official distributor" },
  { re: /amazon\s+approv/i, label: "amazon approved" },
  { re: /account\s+safe/i, label: "account safe" },
  { re: /\bguarantee/i, label: "guarantee" },
  { re: /\b(safe|approved|verified|recommended|low[\s-]?risk)\s+supplier/i, label: "safe/approved/verified supplier" },
  { re: /affiliated\s+with\s+(amazon|walmart|ebay|shopify)/i, label: "affiliated with marketplace" },
];

// Scan arbitrary client-facing text. Returns matched violation labels (empty = clean).
export function scanForBannedLanguage(text: string): string[] {
  if (!text) return [];
  return BANNED.filter((b) => b.re.test(text)).map((b) => b.label);
}

// Scan every string value found in a compiled findings JSON blob.
export function scanFindingsForBannedLanguage(findings: unknown): string[] {
  const out = new Set<string>();
  const walk = (v: unknown) => {
    if (typeof v === "string") scanForBannedLanguage(v).forEach((x) => out.add(x));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(findings);
  return [...out];
}
