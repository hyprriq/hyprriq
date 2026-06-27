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
