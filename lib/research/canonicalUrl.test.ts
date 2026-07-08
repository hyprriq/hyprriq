import { it, expect, describe } from "vitest";
import { canonicalUrl } from "./canonicalUrl";

describe("canonicalUrl (H7 SO-1 — one canonical form for a real-world source URL)", () => {
  it("strips scheme, www, trailing slash, and tracking params", () => {
    expect(canonicalUrl("https://www.Example.com/path/?utm_source=x&fbclid=y")).toBe("example.com/path");
    expect(canonicalUrl("http://example.com/path")).toBe("example.com/path");
    expect(canonicalUrl("https://example.com/path")).toBe("example.com/path");
  });
  it("keeps meaningful query params, sorted (stable key)", () => {
    expect(canonicalUrl("https://example.com/p?b=2&a=1")).toBe("example.com/p?a=1&b=2");
    expect(canonicalUrl("https://example.com/p?a=1&b=2")).toBe("example.com/p?a=1&b=2");
  });
  it("distinct paths stay distinct", () => {
    expect(canonicalUrl("https://example.com/a")).not.toBe(canonicalUrl("https://example.com/b"));
  });
  it("distinct hosts stay distinct", () => {
    expect(canonicalUrl("https://a.com/x")).not.toBe(canonicalUrl("https://b.com/x"));
  });
  it("null/unparseable inputs are handled without throwing", () => {
    expect(canonicalUrl(null)).toBeNull();
    expect(canonicalUrl("not a url")).toBe("not a url");
    expect(canonicalUrl("  Not A URL  ")).toBe("not a url");
  });
});
