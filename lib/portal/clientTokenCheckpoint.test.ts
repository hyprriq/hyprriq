import { describe, it, expect } from "vitest";
import { findInternalTokens, assertNoInternalTokens, InternalTokenLeak } from "./clientTokenCheckpoint";

// ── THE PRESENCE CHECKPOINT. These fixtures test the BACKSTOP PROPERTY, which is the opposite of
// what the cleaner tests test: the cleaner is judged on whether it handles the shapes the corpus
// contains, the checkpoint is judged on whether it fires REGARDLESS of shape. A checkpoint test
// that only used corpus shapes would be testing the wrong thing — the whole point is the shapes
// nobody has seen yet.

describe("the checkpoint fires on PRESENCE, in any grammar, including shapes no cleaner models", () => {
  const shapes = [
    "Confirmed via the portal (src_40).",
    "src_40 confirms the registration.",
    "Confirmed via the portal, src_40, and the filing.",
    "Confirmed [src_40] in the record.",
    "Sources src_3-src_6 agree.",
    "Confirmed via the portal src_40",
    "src_40",
    "SEE:src_40|next",                    // no whitespace, no punctuation a cleaner would model
    "…mid-word-adjacent/src_40/…",
    "Confirmed (EV-001, EV-004, A05, A08).",
  ];

  for (const s of shapes) {
    it(`fires on: ${s}`, () => {
      expect(findInternalTokens({ summary: s }).length).toBeGreaterThan(0);
    });
  }
});

describe("the ruled token set — the EXCLUSIONS are as load-bearing as the inclusions", () => {
  it("does NOT fire on bare E-NN: it collides with real product model numbers", () => {
    // A false refusal at publish is the worst failure mode a backstop can have.
    expect(findInternalTokens({ summary: "The E-40 controller ships with the unit." })).toEqual([]);
  });

  it("does NOT fire on EV- with four digits: EV-2000 is a product, EV-001 is a citation", () => {
    expect(findInternalTokens({ summary: "The EV-2000 charger is in scope." })).toEqual([]);
    expect(findInternalTokens({ summary: "See EV-001 for the filing." })).toHaveLength(1);
  });

  // ── EXPECTATION REVERSED BY RULING (item 1e, 2026-08-22), not bent to fit a build. This
  // previously asserted snake_case keys were "ruled safe in prose" because the cleaners
  // substitute them. The corpus sweep then measured what that assumption cost: "(brand_risk)"
  // reached a DELIVERED report, because the substitution list knew brand_risk_assessment but
  // not the short alias. The cleaner now derives from AREA_NAMES; the checkpoint refuses the
  // next form nobody wrote down. Measured false positives across 45 cases: zero.
  it("DOES fire on internal snake_case track keys (was: ruled safe in prose)", () => {
    expect(findInternalTokens({ summary: "The documentation_review area was not assessed." })).not.toEqual([]);
    expect(findInternalTokens({ summary: "restricted third-party ASINs (brand_risk)" })).not.toEqual([]);
  });

  it("still does NOT fire on the client's own words — the measured collisions stay safe", () => {
    for (const s of [
      "active SEC filings (S-1, S-3, 10-K)",
      "SKUs beyond B007EARF3O",
      "the EV-2000 charger and the E-40 mount",
      "Documentation Review was not assessed.",
      "Brand Risk is covered in this report.",
    ]) expect(findInternalTokens({ summary: s }), s).toEqual([]);
  });

  it("does NOT fire on an operator-pasted URL containing a token-shaped path segment", () => {
    // Ruled: review_additions URL-valued content is normalised out BEFORE the presence test, so
    // an operator pasting an image path cannot refuse a publish.
    expect(findInternalTokens({ note: "See https://cdn.example.com/img/src_1.png for the label." })).toEqual([]);
    expect(findInternalTokens({ note: "Evidence at /img/src_1.png" })).toEqual([]);
  });

  it("still fires on a token in the same field as a URL — the URL is removed, not the sentence", () => {
    expect(findInternalTokens({ note: "See https://cdn.example.com/img/src_1.png — and src_9 confirms it." }))
      .toHaveLength(1);
  });
});

describe("it reports WHERE, because 'a token is somewhere in this payload' is not actionable", () => {
  it("carries the path through nested arrays and objects", () => {
    const payload = { findings: [{ summary: "clean" }, { summary: "Confirmed src_18 here." }] };
    const [hit] = findInternalTokens(payload);
    expect(hit.path).toBe("findings[1].summary");
    expect(hit.match).toBe("src_18");
    expect(hit.excerpt).toContain("Confirmed src_18 here.");
  });

  it("finds every occurrence, not just the first", () => {
    expect(findInternalTokens({ a: "src_1 and src_2", b: "and EV-001" })).toHaveLength(3);
  });

  it("client_notes are IN SCOPE (ruled)", () => {
    expect(findInternalTokens({ client_notes: "We could not resolve src_4." })).toHaveLength(1);
  });
});

describe("assertNoInternalTokens — the REFUSING form, loud by design", () => {
  it("throws a typed error naming the occurrences", () => {
    expect(() => assertNoInternalTokens({ summary: "Confirmed src_40." }, "publish AWI-2608-034"))
      .toThrow(InternalTokenLeak);
    try {
      assertNoInternalTokens({ summary: "Confirmed src_40." }, "publish AWI-2608-034");
    } catch (e) {
      expect((e as InternalTokenLeak).findings).toHaveLength(1);
      expect((e as Error).message).toContain("publish AWI-2608-034");
      expect((e as Error).message).toContain("src_40");
    }
  });

  it("passes silently on clean client bytes", () => {
    expect(() => assertNoInternalTokens({ summary: "The registry filing confirms the entity." }, "x")).not.toThrow();
  });
});

// ⛔ THE LAW, AS AN EXECUTABLE TEST. If someone "fixes" a false positive by teaching the checkpoint
// about grammar, this fails. The checkpoint may not care where in a sentence a token sits.
describe("LAW: the checkpoint is PRESENCE-based and may never become a shape matcher", () => {
  it("treats every grammatical position identically — no position is exempt", () => {
    const positions = [
      "src_9 leads the sentence.",
      "The sentence carries src_9 inside.",
      "The sentence ends with src_9.",
      "(src_9)",
      "[src_9]",
      ";src_9;",
    ];
    for (const p of positions) {
      expect(findInternalTokens({ f: p })).toHaveLength(1);
    }
  });
});
