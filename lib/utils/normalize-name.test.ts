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

  it("returns an empty string for a name made entirely of suffix words", () => {
    // EDGE CASE worth guarding at the call site: an empty normalized key
    // collides on the UNIQUE(vendor_name_normalized) constraint if two such
    // names are ever cached. The pipeline must not write a '' cache key.
    expect(normalizeName("Holdings International Group")).toBe("");
  });

  it("returns an empty string for empty input", () => {
    expect(normalizeName("")).toBe("");
  });
});
