import { describe, it, expect } from "vitest";
import { scanHard, scanAssertion } from "@/lib/utils/banned-language";
import { scanForMethodLeakage } from "@/lib/research/synthesisMethodScan";
import { matchCachedCategory } from "./categoryCache";
import { cachedCategorySentence } from "./sellerCountLanguage";

// The degrade-path category cache (founder-ruled 2026-09-09): category only, ASIN-matched,
// always dated. These tests pin the ruled constraints as behavior.

const ROW = {
  keepa_data_json: {
    asin: "B00FLYWNYQ",
    pattern: "already_locked_down",
    category_tree: ["Home & Kitchen", "Kitchen & Dining", "Small Appliances"],
    fetched_at: "2026-09-08T17:48:00.000Z",
  },
};

describe("matchCachedCategory — ASIN match, never brand match", () => {
  it("a row answers for the ASIN it was fetched for", () => {
    const hit = matchCachedCategory(ROW, "B00FLYWNYQ");
    expect(hit).not.toBeNull();
    expect(hit!.path).toEqual(["Home & Kitchen", "Kitchen & Dining", "Small Appliances"]);
    expect(hit!.fetchedAt.toISOString()).toBe("2026-09-08T17:48:00.000Z");
  });

  it("same brand, different ASIN ⇒ null — a different listing can mean a different tree", () => {
    expect(matchCachedCategory(ROW, "B0DIFFERENT")).toBeNull();
  });

  it("an UNDATED cache entry is an unusable cache entry — the date is not optional", () => {
    const undated = { keepa_data_json: { ...ROW.keepa_data_json, fetched_at: undefined } };
    expect(matchCachedCategory(undated, "B00FLYWNYQ")).toBeNull();
  });

  it("missing row / empty tree / malformed json ⇒ null, never a throw", () => {
    expect(matchCachedCategory(null, "B00FLYWNYQ")).toBeNull();
    expect(matchCachedCategory({}, "B00FLYWNYQ")).toBeNull();
    expect(matchCachedCategory({ keepa_data_json: { ...ROW.keepa_data_json, category_tree: [] } }, "B00FLYWNYQ")).toBeNull();
  });
});

describe("cachedCategorySentence — the founder-ratified wording, date always visible", () => {
  const s = cachedCategorySentence(["Home & Kitchen", "Kitchen & Dining", "Small Appliances"], new Date("2026-09-08T17:48:00.000Z"));

  it("matches the ratified form verbatim in structure and carries the fetch date", () => {
    expect(s).toBe(
      "Listing history could not be obtained; the listing's category placement, as fetched on 8 September 2026, was Home & Kitchen › Kitchen & Dining › Small Appliances.",
    );
  });

  it("passes all three gates (own-voice: HARD + ASSERTION block; method scan clean)", () => {
    expect(scanHard(s)).toEqual([]);
    expect(scanAssertion(s)).toEqual([]);
    expect(scanForMethodLeakage({ _: s })).toEqual([]);
  });
});
