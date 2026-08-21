import { describe, it, expect } from "vitest";
import { detectSameEntity, registrableDomain } from "./sameEntity";
import { validateWeights } from "./weightValidation";
import { deriveTrackSignal } from "./signals";
import { applySourceDiversityCap } from "./sourceDiversity";
import { weightFor } from "./weights";

// ── SAME-ENTITY / MANUFACTURER-DIRECT (founder-ruled 2026-08-21). The three corpus shapes the
// acceptance census confirmed, the ruled false positive (a distributor with a similar name), and
// the enforcement seams: the LLM can never earn the key, +8 is pass alone, and the diversity cap
// never silently downgrades the code-emitted determination.

describe("registrableDomain", () => {
  it("collapses subdomains to eTLD+1 and strips www", () => {
    expect(registrableDomain("shop.specialshit.com")).toBe("specialshit.com");
    expect(registrableDomain("www.stacker2.com")).toBe("stacker2.com");
    expect(registrableDomain("mototecusa.com")).toBe("mototecusa.com");
  });
  it("handles two-part TLDs", () => {
    expect(registrableDomain("shop.example.co.uk")).toBe("example.co.uk");
  });
});

describe("detectSameEntity — the three corpus shapes (acceptance census: exactly these confirm)", () => {
  it("AWI-2608-043 shape: S1 via subdomain — shop.specialshit.com vs official_brand specialshit.com host", () => {
    const r = detectSameEntity({
      resolved_domain: "shop.specialshit.com", vendor_name: "Special Shit", brand: "special shit",
      official_brand_hosts: ["shop.specialshit.com"], official_company_hosts: [],
    });
    expect(r.status).toBe("confirmed");
    expect(r.signals).toContain("s1_official_brand_domain");
  });
  it("AWI-2608-034 shape: S1 — stacker2.com profiled official_brand IS the resolved domain", () => {
    const r = detectSameEntity({
      resolved_domain: "stacker2.com", vendor_name: "stacker", brand: "stacker2",
      official_brand_hosts: ["www.stacker2.com"], official_company_hosts: [],
    });
    expect(r.status).toBe("confirmed");
  });
  it("AWI-2607-024 shape: S2 — official_company on a brand-named domain (mototecusa.com for 'mototec')", () => {
    const r = detectSameEntity({
      resolved_domain: "mototecusa.com", vendor_name: "Mototec USA", brand: "mototec",
      official_brand_hosts: [], official_company_hosts: ["mototecusa.com"],
    });
    expect(r.status).toBe("confirmed");
    expect(r.signals).toContain("s2_official_company_branded_domain");
  });
});

describe("detectSameEntity — the ruled false positives stay out", () => {
  it("a DISTRIBUTOR with a similar name reaches candidate and NO further — names nominate, never confirm", () => {
    const r = detectSameEntity({
      resolved_domain: "mototec-parts-wholesale.com", vendor_name: "Mototec Parts Wholesale LLC", brand: "mototec",
      official_brand_hosts: ["mototecusa.com"], // the brand's real site, a DIFFERENT domain
      official_company_hosts: [],
    });
    expect(r.status).toBe("candidate");
  });
  it("an ordinary third-party vendor is 'none' (TD Synnex × bosch)", () => {
    const r = detectSameEntity({
      resolved_domain: "tdsynnex.com", vendor_name: "TD Synnex", brand: "bosch",
      official_brand_hosts: ["bosch.com"], official_company_hosts: ["tdsynnex.com"],
    });
    expect(r.status).toBe("none");
  });
  it("official_company on the vendor's own domain alone is NOT enough without a brand-named domain", () => {
    // Every vendor's own site is official_company — that must never confirm by itself.
    const r = detectSameEntity({
      resolved_domain: "kehe.com", vendor_name: "kehe", brand: "kehe organics",
      official_brand_hosts: [], official_company_hosts: ["kehe.com"],
    });
    // brand token "keheorganics" does not equal/contain-match label "kehe" cleanly → at most candidate.
    expect(r.status).not.toBe("confirmed");
  });
  it("short brand tokens never containment-match (no 'hp' ⊂ 'shophq' class confirmations)", () => {
    const r = detectSameEntity({
      resolved_domain: "shophq.com", vendor_name: "ShopHQ", brand: "hp",
      official_brand_hosts: ["shophq.com"], official_company_hosts: [],
    });
    expect(r.status).toBe("none");
  });
  it("multi-brand isolation: confirmation is PER BRAND (034: stacker2 yes, black jax no)", () => {
    const input = { resolved_domain: "stacker2.com", vendor_name: "stacker", official_brand_hosts: ["stacker2.com"], official_company_hosts: [] };
    expect(detectSameEntity({ ...input, brand: "stacker2" }).status).toBe("confirmed");
    expect(detectSameEntity({ ...input, brand: "black jax" }).status).toBe("none");
  });
});

describe("manufacturer_direct — enforcement seams", () => {
  it("is +8 in the Track 2 registry and yields pass ALONE (the ruling: pass, not infer)", () => {
    expect(weightFor("supply_chain_relationship", "manufacturer_direct")).toEqual({ points: 8 });
    expect(deriveTrackSignal("supply_chain_relationship", ["manufacturer_direct"]).signal).toBe("pass");
  });
  it("an LLM proposal of manufacturer_direct dies at the provenance gate — from ANY profile", () => {
    for (const profile of ["official_brand", "official_company", "registry", "news"] as const) {
      const r = validateWeights({
        track: "supply_chain_relationship",
        sourceProfileById: { s1: profile },
        proposals: [{ evidence_id: "e1", proposed_weight_key: "manufacturer_direct", cited_source_ids: ["s1"] }],
      });
      expect(r[0].validated_weight_key, `profile ${profile} must not earn the code-only key`).toBeNull();
      expect(r[0].gate).toBe("provenance");
    }
  });
  it("the diversity cap exempts a manufacturer_direct pass (one code item = one URL by construction)", () => {
    const r = applySourceDiversityCap("pass", [{ source_url: "https://stacker2.com", weight_key: "manufacturer_direct" }]);
    expect(r.signal).toBe("pass");
    expect(r.capped).toBe(false);
  });
  it("REGRESSION: an ordinary single-source pass still caps to infer", () => {
    const r = applySourceDiversityCap("pass", [{ source_url: "https://example.com/a", weight_key: "government_registration" }]);
    expect(r.signal).toBe("infer");
    expect(r.capped).toBe(true);
  });
});
