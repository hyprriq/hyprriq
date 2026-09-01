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
  // SB-1 (SO-3) — the OQ-B-ruled website_dead note is an OWN-VOICE (code-templated) string, so the
  // ASSERTION tier is BLOCKING for it, not advisory: lock both tiers on the real template.
  it("the SB-1 website_dead note passes BOTH tiers (explicit denial — the allowed class)", () => {
    const note = clientNote("website_dead", "Acme Corp", "Acme Corp");
    expect(scanHard(note)).toEqual([]);
    expect(scanAssertion(note)).toEqual([]);
  });
  // SB-2 (SO-3) — the ruled multiple_entities note (both the named template and the defensive
  // names-less fallback) passes BOTH tiers, blocking (own-voice string).
  it("the SB-2 multiple_entities note passes BOTH tiers, named and fallback variants", () => {
    const named = clientNote("multiple_entities", "Medline", "Medlink Inc", "Medline Industries");
    expect(scanHard(named)).toEqual([]);
    expect(scanAssertion(named)).toEqual([]);
    const fallback = clientNote("multiple_entities", "Medline", "Medlink Inc");
    expect(scanHard(fallback)).toEqual([]);
    expect(scanAssertion(fallback)).toEqual([]);
  });
});

// H5 bug fix (found via AT-2 pre-check): H2 must be NEGATION-AWARE. The spec-MANDATED disclaimer
// language ("does not guarantee", "We do not guarantee:") is the required DENIAL of a guarantee —
// blocking it would make every properly-disclaimed report unpublishable. Un-negated guarantees
// remain hard-blocked (founder ruling unchanged).
describe("H2 guarantee — negation-aware", () => {
  const negated = [
    "a confirmed distributor or authorization relationship does not guarantee marketplace approval",
    "We do not guarantee: Amazon invoice acceptance, account safety, or freedom from IP complaints",
    "we cannot guarantee marketplace outcomes",
    "we can't guarantee acceptance",
    "this report never guarantees results",
    "there is no guarantee of acceptance",
    "findings are observations, not guarantees",
  ];
  for (const s of negated) {
    it(`passes (required disclaimer language): "${s.slice(0, 50)}…"`, () => expect(scanHard(s)).toEqual([]));
  }
  const promises = [
    "we guarantee results",
    "the vendor guarantees invoice acceptance",
    "guaranteed safe sourcing",
    "acceptance is guaranteed",
  ];
  for (const s of promises) {
    it(`still blocks (un-negated): "${s}"`, () => expect(scanHard(s).length).toBeGreaterThan(0));
  }
});

// Same disclaimer-collision class as H2: the mandated denial list NAMES "account safety".
describe("H3 account-safe — disclaimer-safe boundary", () => {
  it("the mandated disclaimer's denial list passes", () => {
    expect(scanHard("We do not guarantee: Amazon invoice acceptance, account safety, or freedom from IP complaints.")).toEqual([]);
  });
  it("promise forms still block", () => {
    expect(scanHard("your account is safe").length).toBeGreaterThan(0);
    expect(scanHard("we ensure your account safety").length).toBeGreaterThan(0);
  });
});

// ── H1 UNGATING — NARROWED 2026-09-01, AND BOTH DIRECTIONS ARE LOCKED THIS TIME ──────────────
//
// ⚠ THE 2026-08-16 RULING HAD NO TEST FOR THE HALF IT INTRODUCED. It split SERVICE from
// SUBJECT-MATTER so that descriptive gating vocabulary would PASS — and only the blocking side was
// ever asserted ("ungating service", "we can help with ungating"). The permissive branch, which is
// what the ruling actually changed, was never locked. That is why narrowing it on 2026-09-01 broke
// nothing: there was nothing to break. A ruling that changes behaviour and locks only the half that
// already worked leaves its real content unguarded.
//
// The 2026-09-01 ruling: the WORD goes from client prose. "It is promise-shaped — a refused client
// quotes the word, never the careful clause around it — and it is the marketplace's vocabulary
// rather than ours."
describe("H1 ungating — the word blocks; mandated denials pass", () => {
  // THE SENTENCE THAT PROMPTED THE RULING, from AWI-2608-045 page 8. The founder judged it correct
  // and ruled the word out anyway, so it must block — this is the regression that matters.
  it("blocks the delivered sentence that started this", () => {
    const shipped =
      "The record carries a residual question about whether the Mattel portal listing reflects " +
      "active authorized-distributor standing sufficient for marketplace ungating purposes.";
    expect(scanHard(shipped)).toContain("ungating");
  });

  it("blocks the descriptive forms the previous ruling allowed", () => {
    // Each of these PASSED before 2026-09-01. Locking them is the whole point of the change.
    for (const s of [
      "Amazon ungating alone is insufficient for this brand.",
      "Sellers report ungating friction on this brand.",
      "invoice requirements have been found insufficient for ungating",
      "a date within the period Amazon requires for ungating",
      "the category is ungated for most sellers",
    ]) {
      expect(scanHard(s), `should block: ${s}`).toContain("ungating");
    }
  });

  it("the mandated DENIALS still pass — the copy this rule must never break", () => {
    for (const s of [
      "We do not provide ungating services.",
      "We don't ungate brands and we don't guarantee approval.",
      "This is not an ungating service.",
      "We never promise ungating.",
      "We cannot get you ungated.",
    ]) {
      expect(scanHard(s), `denial must pass: ${s}`).not.toContain("ungating");
    }
  });

  it("the negation must be in the SAME sentence — a denial elsewhere does not clear it", () => {
    // Without this, one disclaimer anywhere in a payload would license the word everywhere in it.
    const two = "We do not provide ungating services. This supplier's paperwork is sufficient for ungating.";
    expect(scanHard(two)).toContain("ungating");
  });
});
