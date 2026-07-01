import { describe, it, expect } from "vitest";
import {
  SOURCE_PROFILES, authorityFor, freshnessExpectationFor, classifySource, sourceTypeFor,
} from "./source_profile";

describe("source_profile registry", () => {
  it("exposes deterministic defaults per profile", () => {
    expect(authorityFor("government_record")).toBe("high");
    expect(authorityFor("user_upload")).toBe("low");
    expect(freshnessExpectationFor("marketplace")).toBe(30);
    expect(freshnessExpectationFor("whois")).toBe(3650);
  });
  it("classifies sources deterministically by plugin + domain", () => {
    expect(classifySource("https://whatever", "whois")).toBe("whois");
    expect(classifySource("https://sos.state.tx.us/corp", "serper")).toBe("government_record");
    expect(classifySource("https://www.linkedin.com/company/x", "serper")).toBe("social");
    expect(classifySource("https://www.amazon.com/dp/x", "serper")).toBe("marketplace");
    expect(classifySource("https://randomblog.example", "serper")).toBe("news");
  });
  it("derives the coarse source_type from the profile", () => {
    expect(sourceTypeFor("government_record")).toBe("government_record");
    expect(sourceTypeFor("user_upload")).toBe("vendor_self_assertion");
    expect(sourceTypeFor("news")).toBe("third_party");
    expect(sourceTypeFor("inference")).toBe("inference");
  });
  it("covers every profile in the registry", () => {
    expect(Object.keys(SOURCE_PROFILES)).toHaveLength(11);
  });
});

describe("classifySource — official-domain awareness (Track 2 fix, metadata-driven)", () => {
  const ctx = { vendorHost: "https://www.tdsynnex.com", brandTokens: ["lenovo", "bosch"] };
  it("classifies a submitted brand's own domain as official_brand", () => {
    expect(classifySource("https://www.lenovo.com/awards/distributor-of-the-year", "serper", ctx)).toBe("official_brand");
    expect(classifySource("https://lenovo.co.uk/dealers", "serper", ctx)).toBe("official_brand");
  });
  it("classifies the vendor's own domain as official_company", () => {
    expect(classifySource("https://www.tdsynnex.com/en-us/lenovo", "serper", ctx)).toBe("official_company");
  });
  it("normalizes loosely-formatted vendor_website (no protocol, www, path, mixed-case protocol, whitespace)", () => {
    for (const vendorHost of [
      "tdsynnex.com", "www.tdsynnex.com", "https://www.tdsynnex.com/en-us",
      "HTTP://TDSynnex.com", "Https://tdsynnex.com/", "  tdsynnex.com  ",
    ]) {
      expect(classifySource("https://www.tdsynnex.com/lenovo", "serper", { vendorHost, brandTokens: [] }))
        .toBe("official_company");
    }
  });
  it("still applies host rules / news default for non-official domains", () => {
    expect(classifySource("https://www.linkedin.com/company/td-synnex", "serper", ctx)).toBe("social");
    expect(classifySource("https://somerandomblog.com/post", "serper", ctx)).toBe("news");
  });
  it("WITHOUT context behaviour is unchanged (preserves Track 1 + the frozen pack)", () => {
    // No context → official domains are NOT specially recognised (Track 1 path is untouched).
    expect(classifySource("https://www.lenovo.com", "serper")).toBe("news");
    expect(classifySource("https://lenovo.co.uk/dealers", "serper")).toBe("news");
  });
  it("WITH context the vendor-domain check precedes host rules (fixes the x.com false-positive for the vendor)", () => {
    // NOTE: the x.com host rule matches 'tdsynnex.com' as a substring → 'social' without context
    // (a pre-existing classifier quirk). With context, the vendor-domain match wins first.
    expect(classifySource("https://www.tdsynnex.com/lenovo", "serper", ctx)).toBe("official_company");
  });
  it("whois/inference plugins ignore the context", () => {
    expect(classifySource("https://www.lenovo.com", "whois", ctx)).toBe("whois");
  });
  // LOCKED REGRESSION (Track 0.5 required matrix): when a marketplace IS the vendor, its own pages
  // must classify official_company — official-domain recognition MUST run before the marketplace
  // host-rule. Amazon (normally 'marketplace') as the vendor → official_company. Do not reorder.
  it("Amazon as the vendor → amazon.com classifies official_company (not marketplace)", () => {
    const amazonCtx = { vendorHost: "https://www.amazon.com", brandTokens: [] };
    expect(classifySource("https://www.amazon.com/about", "serper", amazonCtx)).toBe("official_company");
    // sanity: with a DIFFERENT vendor, amazon.com is still the marketplace default
    expect(classifySource("https://www.amazon.com/dp/x", "serper", ctx)).toBe("marketplace");
  });
});

describe("classifySource — social-host anchoring (x.com substring fix)", () => {
  it("does NOT classify '...x.com' substring hosts as social", () => {
    expect(classifySource("https://www.tdsynnex.com", "serper")).toBe("news");
    expect(classifySource("https://www.netflix.com/title/x", "serper")).toBe("news");
    expect(classifySource("https://vertex.com", "serper")).toBe("news");
  });
  it("still classifies the real social domains as social", () => {
    expect(classifySource("https://x.com/foo", "serper")).toBe("social");
    expect(classifySource("https://www.linkedin.com/x", "serper")).toBe("social");
    expect(classifySource("https://twitter.com/foo", "serper")).toBe("social");
    expect(classifySource("https://careers.instagram.com", "serper")).toBe("social");
  });
});
