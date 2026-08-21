import { canonicalDomain } from "./host";
import { normalizeBrandToken } from "./source_profile";

// ── SAME-ENTITY DETECTION (founder-ruled 2026-08-21; design: docs/DESIGN_MANUFACTURER_DIRECT_
// 2026-08-21.md). Detects the vendor-IS-brand case — the safest sourcing relationship in wholesale,
// which the engine scored 0-for-3 before this (024 asked whether the brand is connected to itself).
//
// TWO-STAGE, CODE-OWNED, UNDER-RESOLVE ON DOUBT (the identityResolver's philosophy applied intact):
//   candidate  — the brand token relates to the resolved domain or the vendor name. Names NOMINATE
//                and never confirm: "Mototec Parts Wholesale LLC" gets to candidate and no further.
//   confirmed  — S1: the resolved domain's registrable domain equals a source the classifier
//                independently profiled official_brand (two independent systems converging on one
//                domain: identity resolution said "the vendor's", source profiling said "the
//                brand's"); OR S2: the vendor's own domain is profiled official_company AND the
//                domain label itself carries the brand's name (mototecusa.com for "mototec" — the
//                024 shape, where the profiler saw the vendor's site as a company site).
// Anything less than confirmed changes NOTHING downstream.
//
// PER BRAND: a multi-brand case can be manufacturer-direct for one brand and a normal third-party
// vendor for the rest (034: same-entity for stacker2, not for black jax).

export interface SameEntityInput {
  resolved_domain: string | null;
  vendor_name: string | null;
  brand: string; // ONE submitted brand token
  official_brand_hosts: string[];   // hosts of pack sources profiled official_brand (this case)
  official_company_hosts: string[]; // hosts of pack sources profiled official_company (this case)
}

export interface SameEntityResult {
  brand: string;
  status: "confirmed" | "candidate" | "none";
  signals: string[]; // audit trail: which signals fired ("name_relates", "s1_official_brand_domain", "s2_official_company_branded_domain")
  matched_host: string | null; // the pack host that satisfied S1/S2 (for the evidence item's source_url)
}

// Registrable domain (eTLD+1-ish): last two labels, three for common two-part TLDs — the same
// multi-part list domainLabel() uses. shop.specialshit.com → specialshit.com.
export function registrableDomain(host: string): string {
  const clean = (canonicalDomain(host) ?? host).replace(/^www\./, "");
  const parts = clean.split(".");
  if (parts.length <= 2) return clean;
  const tld2 = parts.slice(-2).join(".");
  const multi = /^(co|com|org|net|gov|ac)\.[a-z]{2}$/.test(tld2);
  return parts.slice(multi ? -3 : -2).join(".");
}

// Does the normalized brand token name this domain label? Equality always; containment only for
// tokens long enough that containment is meaningful (guards "hp" ⊂ "shophq"-class false positives).
function brandNamesLabel(brandToken: string, label: string): boolean {
  if (!brandToken || !label) return false;
  if (brandToken === label) return true;
  return brandToken.length >= 5 && label.includes(brandToken);
}

export function detectSameEntity(input: SameEntityInput): SameEntityResult {
  const none: SameEntityResult = { brand: input.brand, status: "none", signals: [], matched_host: null };
  const resolved = input.resolved_domain ? registrableDomain(input.resolved_domain) : null;
  if (!resolved) return none;
  const token = normalizeBrandToken(input.brand);
  if (!token) return none;

  // Stage 1 — candidate: the brand's name relates to the resolved domain or the vendor's name.
  const resolvedLabel = normalizeBrandToken(resolved.split(".")[0] ?? "");
  const vendorToken = normalizeBrandToken(input.vendor_name ?? "");
  const nameRelates = brandNamesLabel(token, resolvedLabel)
    || (vendorToken !== "" && (vendorToken === token || (token.length >= 5 && vendorToken.includes(token))));
  if (!nameRelates) return none;

  const signals: string[] = ["name_relates"];

  // Stage 2 — confirmation.
  const brandHost = input.official_brand_hosts.find((h) => registrableDomain(h) === resolved);
  if (brandHost) {
    return { brand: input.brand, status: "confirmed", signals: [...signals, "s1_official_brand_domain"], matched_host: brandHost };
  }
  const companyHost = input.official_company_hosts.find((h) => registrableDomain(h) === resolved);
  if (companyHost && brandNamesLabel(token, resolvedLabel)) {
    return { brand: input.brand, status: "confirmed", signals: [...signals, "s2_official_company_branded_domain"], matched_host: companyHost };
  }
  return { brand: input.brand, status: "candidate", signals, matched_host: null };
}
