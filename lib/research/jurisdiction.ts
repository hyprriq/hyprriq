// ── JURISDICTION (founder-reported 2026-08-20) ───────────────────────────────────────────────
//
// THE DEFECT THIS FIXES, AND IT IS SYSTEMIC RATHER THAN PER-CASE. The identity research asked
// every supplier on earth a US question:
//
//   business_registry → "<vendor> business registration secretary of state"   ← US-ONLY CONCEPT
//   bbb_listing       → "<vendor> BBB better business bureau"                 ← US/CANADA ONLY
//
// A UK company registers at Companies House; a German one at the Handelsregister; an Italian one
// at the Registro Imprese. None of them appears under "secretary of state", and none has a BBB
// listing. `government_registration` is +4 — THE LARGEST POSITIVE IN THE IDENTITY TABLE — and
// `bbb_or_trade_association` is +1. So a legitimate non-US distributor loses up to 5 points for
// being non-US, and the report then tells the client "No government registration record was found",
// which reads as a FINDING ABOUT THE SUPPLIER when it is an artifact of asking the wrong registry.
//
// ⚠ A SECOND, PLAINER BUG FOUND IN THE SAME LINE: the weight key is `bbb_or_trade_association` —
// it explicitly admits trade associations — while the QUERY only ever asked about the BBB. The key
// was broader than the question, so trade-association evidence could never be found for anyone,
// US or not.
//
// ⛔ THIS FILE ADDS NO SCORING AND NO WEIGHT KEYS. It changes WHAT WE ASK, never what an answer is
// worth. The registry is frozen; a better question is not a rule change.

/** A jurisdiction we can name a registry for. `null` code = unknown, handled by neutral phrasing. */
export interface Jurisdiction {
  /** ISO-ish country code inferred, or null when we genuinely do not know. */
  code: string | null;
  /** How the registry is NAMED where the supplier is — the phrase that actually finds them. */
  registry: string;
  /** Where the inference came from, so a report can be honest about its own confidence. */
  source: "domain" | "address" | "marketplace" | "unknown";
}

// Registry names by country. NOT exhaustive and never will be — which is why the UNKNOWN path is
// the important one, not this table. Adding a row improves a query; missing a row must never make
// the question worse than the neutral form.
const REGISTRIES: Record<string, string> = {
  uk: "Companies House",
  gb: "Companies House",
  ie: "Companies Registration Office",
  de: "Handelsregister",
  at: "Firmenbuch",
  ch: "Handelsregister Zefix",
  fr: "RCS Infogreffe",
  it: "Registro Imprese Camera di Commercio",
  es: "Registro Mercantil",
  pt: "Registo Comercial",
  nl: "KVK Kamer van Koophandel",
  be: "Kruispuntbank van Ondernemingen",
  se: "Bolagsverket",
  no: "Brønnøysundregistrene",
  dk: "CVR Erhvervsstyrelsen",
  fi: "PRH Kaupparekisteri",
  pl: "KRS Krajowy Rejestr Sądowy",
  cz: "Obchodní rejstřík",
  ca: "Corporations Canada provincial registry",
  au: "ASIC company register",
  nz: "New Zealand Companies Office",
  in: "MCA Ministry of Corporate Affairs",
  sg: "ACRA Bizfile",
  hk: "Companies Registry",
  ae: "Department of Economic Development trade licence",
  za: "CIPC",
  jp: "National Tax Agency corporate number",
  kr: "NTS business registration",
  cn: "National Enterprise Credit Information",
  mx: "Registro Público de Comercio",
  br: "Junta Comercial CNPJ",
  us: "Secretary of State business registration",
};

/** ccTLDs that are used generically and therefore say NOTHING about where a company is. */
const GENERIC_TLDS = new Set(["com", "net", "org", "info", "biz", "io", "co", "shop", "store", "online", "app", "dev", "ai"]);

/** The country label from a hostname, or null when the TLD carries no country meaning. */
export function countryFromDomain(domain: string | null | undefined): string | null {
  if (!domain) return null;
  const host = domain.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
  const parts = host.split(".").filter(Boolean);
  if (parts.length < 2) return null;
  const last = parts[parts.length - 1];
  // co.uk / com.au — the country is the LAST label in both cases.
  if (last.length === 2 && !GENERIC_TLDS.has(last)) return last;
  return null;
}

/** Country from a free-text address, for the common cases a TLD cannot tell us. */
export function countryFromAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  const a = ` ${address.toLowerCase()} `;
  const HINTS: [RegExp, string][] = [
    [/\bunited kingdom\b|\bengland\b|\bscotland\b|\bwales\b|\blondon\b|\b[a-z]{1,2}\d[a-z\d]?\s*\d[a-z]{2}\b/, "uk"],
    [/\bireland\b|\bdublin\b/, "ie"],
    [/\bgermany\b|\bdeutschland\b|\bberlin\b|\bmünchen\b|\bmunich\b/, "de"],
    [/\bfrance\b|\bparis\b/, "fr"],
    [/\bitaly\b|\bitalia\b|\bmilano\b|\brome\b|\broma\b/, "it"],
    [/\bspain\b|\bespaña\b|\bmadrid\b|\bbarcelona\b/, "es"],
    [/\bnetherlands\b|\bamsterdam\b|\brotterdam\b/, "nl"],
    [/\bbelgium\b|\bbrussels\b|\bantwerp\b/, "be"],
    [/\bcanada\b|\bontario\b|\bquebec\b|\bbritish columbia\b/, "ca"],
    [/\baustralia\b|\bsydney\b|\bmelbourne\b/, "au"],
    [/\bindia\b|\bmumbai\b|\bdelhi\b|\bbengaluru\b|\bbangalore\b/, "in"],
    [/\bsingapore\b/, "sg"],
    [/\bhong kong\b/, "hk"],
    [/\bunited arab emirates\b|\bdubai\b|\babu dhabi\b/, "ae"],
    [/\bunited states\b|\bu\.s\.a?\.\b|\busa\b/, "us"],
  ];
  for (const [re, code] of HINTS) if (re.test(a)) return code;
  // A US state + ZIP is the strongest US signal and the most common shape in this corpus.
  if (/\b[a-z]{2}\s+\d{5}(-\d{4})?\b/.test(a)) return "us";
  return null;
}

/**
 * THE NEUTRAL FORM — used whenever the country is unknown, and deliberately naming several
 * registry vocabularies at once rather than guessing one. An unknown jurisdiction must produce a
 * question that can still find a real company, never a US question by default.
 */
export const NEUTRAL_REGISTRY = "company registration official business registry";

export function inferJurisdiction(input: {
  domain?: string | null;
  address?: string | null;
  marketplace?: string | null;
}): Jurisdiction {
  const fromDomain = countryFromDomain(input.domain);
  if (fromDomain) return { code: fromDomain, registry: REGISTRIES[fromDomain] ?? NEUTRAL_REGISTRY, source: "domain" };

  const fromAddress = countryFromAddress(input.address);
  if (fromAddress) return { code: fromAddress, registry: REGISTRIES[fromAddress] ?? NEUTRAL_REGISTRY, source: "address" };

  // ⚠ MARKETPLACE IS THE WEAKEST SIGNAL AND IS DELIBERATELY LAST. A supplier who SELLS on
  // amazon.com is very often not registered in the US — that is the exact case this file exists
  // for (a UK supplier shipping to US customers). It is used only to break a total tie, and never
  // overrides a domain or an address.
  const mk = (input.marketplace ?? "").toLowerCase();
  if (mk.includes("_uk")) return { code: "uk", registry: REGISTRIES.uk, source: "marketplace" };
  if (mk.includes("_de")) return { code: "de", registry: REGISTRIES.de, source: "marketplace" };
  if (mk.includes("_ca")) return { code: "ca", registry: REGISTRIES.ca, source: "marketplace" };

  return { code: null, registry: NEUTRAL_REGISTRY, source: "unknown" };
}

/**
 * The registry search string. When the jurisdiction is unknown we ask the NEUTRAL question —
 * never the US one — so "no registration found" stops meaning "not found in the wrong country".
 */
export function registryQuery(vendor: string, j: Jurisdiction): string {
  return `${vendor} ${j.registry}`;
}

/**
 * The trade-body search string.
 *
 * ⚠ THE KEY IS `bbb_or_trade_association` AND THE QUERY ONLY EVER ASKED ABOUT THE BBB — so
 * trade-association evidence was unfindable for every supplier on earth, US included. The query
 * now matches the key it feeds, and drops the BBB entirely outside US/Canada where it does not
 * exist.
 */
export function tradeBodyQuery(vendor: string, j: Jurisdiction): string {
  const bbbCountries = j.code === "us" || j.code === "ca" || j.code === null;
  return bbbCountries
    ? `${vendor} BBB better business bureau OR trade association OR chamber of commerce`
    : `${vendor} trade association OR chamber of commerce OR industry body`;
}
