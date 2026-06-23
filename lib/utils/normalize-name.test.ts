import { describe, it, expect } from "vitest";
import { normalizeName } from "./normalize-name";

// Characterization tests for the existing (Session 1 / Patch 10) normalizeName.
// This function produces the cache key for supplier_cache.vendor_name_normalized
// and brand_cache.brand_name_normalized (both UNIQUE NOT NULL), so its behavior
// is load-bearing: a change here can silently split or collide cache rows.
describe("normalizeName", () => {
  it("strips a trailing legal suffix and trailing punctuation", () => {
    expect(normalizeName("Ingram Micro, Inc.")).toBe("ingram micro");
  });

  it("strips multiple suffixes (Holdings + LLC)", () => {
    expect(normalizeName("UNFI Holdings, LLC")).toBe("unfi");
  });

  it("removes ampersands and dots as punctuation", () => {
    // NOTE: '&' is stripped, not preserved — 'D&H' -> 'dh'.
    expect(normalizeName("D&H Distributing Co.")).toBe("dh distributing");
  });

  it("lowercases and collapses internal whitespace", () => {
    expect(normalizeName("  ACME   Trading  ")).toBe("acme trading");
  });

  it("preserves hyphens", () => {
    expect(normalizeName("Smith-Jones Inc")).toBe("smith-jones");
  });

  it("keeps digits (3M)", () => {
    expect(normalizeName("3M Company")).toBe("3m");
  });

  it("does NOT strip suffix letters that are inside a word (Costco keeps 'co')", () => {
    expect(normalizeName("Costco")).toBe("costco");
  });

  it("strips a standalone 'co' word", () => {
    expect(normalizeName("Trading Co")).toBe("trading");
  });

  it("is idempotent — normalizing an already-normalized name is a no-op", () => {
    const once = normalizeName("Ingram Micro, Inc.");
    expect(normalizeName(once)).toBe(once);
  });

  it("keeps the cleaned tokens when a name is made entirely of suffix words", () => {
    // G1 fix: a pure-suffix name must NOT collapse to '' (that would collide on
    // the UNIQUE cache key). When every token is a suffix, keep them all.
    expect(normalizeName("Holdings International Group")).toBe("holdings international group");
  });

  it("returns an empty string for empty input", () => {
    expect(normalizeName("")).toBe("");
  });
});

// G1 edge-case hardening (brief §3.1): pure-suffix inputs and nullish guards.
describe("normalizeName edge cases (G1)", () => {
  it("returns cleaned token when input is a pure business suffix", () => {
    expect(normalizeName("LLC")).toBe("llc");
    expect(normalizeName("Corp")).toBe("corp");
  });
  it("strips suffix from real names", () => {
    expect(normalizeName("Acme LLC")).toBe("acme");
    expect(normalizeName("Ingram Micro Inc")).toBe("ingram micro");
  });
  it("guards empty/nullish input", () => {
    expect(normalizeName("")).toBe("");
    // @ts-expect-error runtime guard for null
    expect(normalizeName(null)).toBe("");
    // @ts-expect-error runtime guard for undefined
    expect(normalizeName(undefined)).toBe("");
  });
});
