import { describe, it, expect } from "vitest";
import { scanHard, scanAssertion } from "@/lib/utils/banned-language";
import { scanForMethodLeakage } from "@/lib/research/synthesisMethodScan";
import { readSellerCounts, type CountPoint } from "./sellerCountReading";
import {
  sellerCountSentence, sellerIdentitySentence, brandLevelSentence, monitorEntries,
  SELLER_DATA_UNAVAILABLE, WHAT_PRODUCES_THIS_SHAPE, LISTING_UNRETRIEVABLE,
} from "./sellerCountLanguage";
import { classifySeller } from "./aggregators";

const DAY = 86_400_000;
const T0 = new Date("2026-01-01T00:00:00Z").getTime();
const series = (counts: number[], stepDays = 14): CountPoint[] =>
  counts.map((c, i) => ({ date: new Date(T0 + i * stepDays * DAY), count: c }));

const READINGS = {
  cliff: readSellerCounts(series([38, 37, 38, 39, 38, 37, 38, 39, 38, 24, 9, 4, 4, 4])),
  stable: readSellerCounts(series([38, 37, 39, 38, 36, 40, 38, 39, 37, 38, 39, 38, 37, 38])),
  decline: readSellerCounts(series([30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 21, 20, 19, 18])),
  locked: readSellerCounts(series([3, 2, 3, 3, 2, 2, 3, 3, 2, 3, 2, 3, 3, 2, 3, 2])),
  volatile: readSellerCounts(series([8, 15, 4, 12, 3, 18, 7, 14, 5, 16, 6, 13])),
  rising: readSellerCounts(series([5, 5, 6, 7, 7, 8, 9, 10, 11, 12, 13, 14, 15, 15])),
  direct: readSellerCounts(series([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])),
  mid: readSellerCounts(series([8, 8, 9, 8, 8, 7, 8, 8, 9, 8, 8, 8, 9, 8])),
  short: readSellerCounts(series([12, 11])),
};

function allSentences(): string[] {
  const out: string[] = [SELLER_DATA_UNAVAILABLE, WHAT_PRODUCES_THIS_SHAPE, LISTING_UNRETRIEVABLE];
  for (const r of Object.values(READINGS)) {
    for (const held of [true, false, null] as const) out.push(sellerCountSentence(r, held));
    out.push(...monitorEntries("B0EXAMPLE01", r));
  }
  for (const a of ["brand_level", "asin_specific", "single_asin"] as const) out.push(brandLevelSentence(a, 3));
  const ids = [
    { name: "AcmeBrand Store", identity: classifySeller("AcmeBrand Store", "AcmeBrand") },
    { name: "Thrasio LLC", identity: classifySeller("Thrasio LLC", "AcmeBrand") },
    { name: "Random Deals 24", identity: classifySeller("Random Deals 24", "AcmeBrand") },
    { name: "Amazon.com", identity: classifySeller("Amazon.com", "AcmeBrand", "ATVPDKIKX0DER") },
  ];
  const s = sellerIdentitySentence(ids);
  if (s) out.push(s);
  return out;
}

describe("seller-count language — the gates, from birth (own-voice: both tiers block)", () => {
  const SENTENCES = allSentences();

  it("HARD tier: zero hits across every pattern, price state, and identity sentence", () => {
    for (const s of SENTENCES) expect(scanHard(s), s.slice(0, 80)).toEqual([]);
  });

  it("ASSERTION tier: zero hits (no authorized/approved/verified-supplier vocabulary)", () => {
    for (const s of SENTENCES) expect(scanAssertion(s), s.slice(0, 80)).toEqual([]);
  });

  it("method-leakage: zero hits (no gate names, thresholds, weight keys)", () => {
    for (const s of SENTENCES) expect(scanForMethodLeakage({ _: s }), s.slice(0, 80)).toEqual([]);
  });
});

describe("the cause-is-inference ruling, enforced as a lock", () => {
  it("the cliff sentence names the shape and what it does not prove — never the cause as fact", () => {
    const s = sellerCountSentence(READINGS.cliff, true);
    expect(s).toContain("fell from 39 to 4");
    expect(s).toContain("cause is not visible");
    // The superseded P4.2 causal clause can never return:
    expect(s.toLowerCase()).not.toContain("consistent with a brand enforcement event");
    expect(s.toLowerCase()).not.toContain("sent mass");
    expect(s.toLowerCase()).not.toContain("brand enforced");
  });

  it("aggregator identity ships only as an observed storefront match, absence never a claim", () => {
    const s = sellerIdentitySentence([
      { name: "Thrasio LLC", identity: classifySeller("Thrasio LLC", null) },
      { name: "Random Deals 24", identity: classifySeller("Random Deals 24", null) },
    ])!;
    expect(s).toContain("matches Thrasio, a known marketplace aggregator");
    expect(s).toContain("not a determination of who owns it");
    expect(s.toLowerCase()).not.toContain("acquired");
  });

  it("degrade copy is a data-availability note, never a finding about the supplier", () => {
    expect(SELLER_DATA_UNAVAILABLE).toContain("not a finding about the supplier");
  });
});

describe("classifySeller — the ruled match rules", () => {
  it("brand-direct: tight name match is a claim", () => {
    expect(classifySeller("AcmeBrand", "AcmeBrand").kind).toBe("brand_direct");
    expect(classifySeller("AcmeBrand Official", "AcmeBrand").kind).toBe("brand_direct");
  });
  it("aggregator: exact-list containment only — near-names do not fire", () => {
    expect(classifySeller("Perch", null).kind).toBe("aggregator");
    expect(classifySeller("Berlin Brands Group US", null).kind).toBe("aggregator");
    expect(classifySeller("Thrifty Deals", null).kind).toBe("independent"); // not Thrasio
    expect(classifySeller("Heroic Supplies", null).kind).toBe("independent"); // not Heroes
  });
  it("no match ⇒ independent — the honest residue, not an ownership claim", () => {
    expect(classifySeller("Random Deals 24", "AcmeBrand").kind).toBe("independent");
  });
  it("amazon as a leading token ⇒ amazon_retail; inside a word it never fires (staging-case find)", () => {
    expect(classifySeller("Amazon Appstore", null).kind).toBe("amazon_retail");
    expect(classifySeller("Amazon.com", null).kind).toBe("amazon_retail");
    expect(classifySeller("Amazonia Goods", null).kind).toBe("independent");
    expect(classifySeller("Anything", null, "ATVPDKIKX0DER").kind).toBe("amazon_retail");
  });
});
