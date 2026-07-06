import { describe, it, expect } from "vitest";
import { scanHard, scanAssertion, scanFindingsForBannedLanguage, assertionAdvisories, scanForBannedLanguage } from "./banned-language";
import { clientNote } from "@/lib/research/websiteAnchor";

// H5 — two-tier scanner (founder-ruled phrase list, 2026-07-06).
// HARD tier (H1–H9): promises/affiliations — dangerous even when attributed → blocks delivery in
// every client-visible string. ASSERTION tier (A1–A5): the product's subject-matter vocabulary —
// blocks in OUR own-voice strings, mandatory-review advisory in LLM narrative/evidence/questions.

describe("HARD tier (H1–H9): blocks, attributed or not", () => {
  const hardSamples: [string, string][] = [
    ["we can help with ungating", "H1"],
    ["the vendor guarantees invoice acceptance", "H2 — HARD even attributed (founder ruling)"],
    ["your account is safe with this supplier", "H3"],
    ["this source is Amazon approved", "H4"],
    ["the vendor is affiliated with Amazon", "H5"],
    ["the vendor is partnered with Walmart", "H5 extension (founder addition 2)"],
    ["this supplier is fully legitimate", "H6"],
    ["a risk-free purchase", "H7"],
    ["a risk free purchase", "H7"],
    ["resale is officially permitted", "H8"],
    ["your account will not be suspended", "H9 (founder addition 1)"],
    ["you won't be suspended", "H9"],
    ["there is no risk of suspension", "H9"],
  ];
  for (const [s, ref] of hardSamples) {
    it(`${ref}: blocks "${s}"`, () => expect(scanHard(s).length).toBeGreaterThan(0));
  }
  it("clean intelligence language passes the hard tier", () => {
    expect(scanHard("The brand's dealer locator lists TD Synnex as an authorized distributor.")).toEqual([]);
    expect(scanHard("The vendor promises fast shipping; no registry record contradicts the registration.")).toEqual([]);
    expect(scanHard("")).toEqual([]);
  });
});

describe("ASSERTION tier (A1–A5): fires on presence, attributed or not (never trusts the LLM)", () => {
  it("fires on attributed AND unattributed usage", () => {
    expect(scanAssertion("Lenovo's dealer locator lists the vendor as an authorized distributor").length).toBeGreaterThan(0);
    expect(scanAssertion("The vendor is an authorized distributor").length).toBeGreaterThan(0);
    expect(scanAssertion("an authorised dealer in the UK").length).toBeGreaterThan(0);
    expect(scanAssertion("an official distributor for the region").length).toBeGreaterThan(0);
    expect(scanAssertion("an approved reseller per the program page").length).toBeGreaterThan(0);
    expect(scanAssertion("the brand approved storefront list").length).toBeGreaterThan(0);
    expect(scanAssertion("a verified supplier according to the directory").length).toBeGreaterThan(0);
  });
  it("does NOT fire on the UI certainty label or plain prose (A5 precision)", () => {
    expect(scanAssertion("Certainty: verified. The registration was confirmed in the state registry.")).toEqual([]);
    expect(scanAssertion("The supplier operates a wholesale distribution business.")).toEqual([]);
  });
  it("hard-tier phrases are not duplicated into the assertion tier", () => {
    expect(scanAssertion("the vendor guarantees delivery")).toEqual([]);
  });
});

describe("jsonb walkers (delivery gate + admin advisories)", () => {
  const findings = {
    summary: "The dealer locator lists the vendor as an authorized distributor.",
    nested: { qs: [{ question: "Are you an authorized distributor for Lenovo?" }] },
  };
  it("scanFindingsForBannedLanguage walks with the HARD tier only — this content is deliverable", () => {
    expect(scanFindingsForBannedLanguage(findings)).toEqual([]);
    expect(scanFindingsForBannedLanguage({ summary: "purchase is guaranteed safe" }).length).toBeGreaterThan(0);
  });
  it("assertionAdvisories walks with the ASSERTION tier — review material, non-blocking", () => {
    expect(assertionAdvisories(findings).length).toBeGreaterThan(0);
    expect(assertionAdvisories({ summary: "a wholesale distributor of electronics" })).toEqual([]);
  });
  it("walkers never throw on nulls/arrays/nesting", () => {
    expect(scanFindingsForBannedLanguage(null)).toEqual([]);
    expect(assertionAdvisories([{ a: null }, "x"])).toEqual([]);
  });
});

describe("back-compat + Spec-B client_note templates", () => {
  it("scanForBannedLanguage remains the HARD scan (existing call sites keep blocking semantics)", () => {
    expect(scanForBannedLanguage("we guarantee results").length).toBeGreaterThan(0);
    expect(scanForBannedLanguage("ungating service").length).toBeGreaterThan(0);
    // assertion-tier vocabulary no longer hard-blocks (OQ-1 two-tier ruling):
    expect(scanForBannedLanguage("This is an authorized seller")).toEqual([]);
    expect(scanForBannedLanguage("a verified supplier")).toEqual([]);
  });
  it("all Spec-B client_note templates pass the HARD tier (OQ-2 lock)", () => {
    const kinds = ["name_is_brand", "name_website_mismatch", "multiple_entities", "website_dead", "dba"] as const;
    for (const k of kinds) {
      expect(scanHard(clientNote(k, "Bosch", "Global Distribution LLC"))).toEqual([]);
    }
  });
});
