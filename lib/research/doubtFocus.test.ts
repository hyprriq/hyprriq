import { describe, it, expect } from "vitest";
import { isPhraseShaped, asPhrase, asSentence, labelledFocus } from "./doubtFocus";
import { shapeSnapshot, type ShapeSnapshotInput } from "./synthesisCallC";

// ── MODULE 9 COMPOSITION — THE FOUR NOUN-PHRASE SLOTS.
// Corpus-derived (scripts/doubt-focus-shape-probe.ts). Both real BROKEN strings are here verbatim,
// both real GOOD strings are here verbatim, and `targeted` — which ZERO corpus cases exercise — is
// covered too, because "no case has hit it yet" is not the same as "it works".

// Verbatim from AWI-2608-034 (elevated) — the sentence that shipped "This reading rests on The
// most concentrated doubt lands on … holding." to a client.
const FOCUS_SENTENCE_034 =
  "The most concentrated doubt lands on NVE Pharmaceuticals' current operational and financial integrity — specifically the unresolved Chapter 11 bankruptcy status combined with an unresolved 2017 FDA warning letter. A secondary, distinct doubt focus is the complete absence of any verified connection between the Black Jax brand and NVE Pharmaceuticals.";
// Verbatim from AWI-2607-022 (elevated) — a clean phrase; the inline form must survive untouched.
const FOCUS_PHRASE_022 = "Bosch supply chain authorization status for TD SYNNEX";
// Verbatim from AWI-2608-032 (broad) — LONG but grammatical. Must be treated as a phrase: length
// is not what breaks a slot, and the first version of the probe wrongly counted it as broken.
const FOCUS_LONG_PHRASE_032 =
  "Supply chain legitimacy and downstream marketplace risk for Sterilite products sourced through Four Seasons General Merchandise";

describe("shape detection — punctuation, never length", () => {
  it("a clean phrase is a phrase", () => expect(isPhraseShaped(FOCUS_PHRASE_022)).toBe(true));
  it("a LONG phrase is still a phrase (the probe's own false positive, locked)", () =>
    expect(isPhraseShaped(FOCUS_LONG_PHRASE_032)).toBe(true));
  it("a sentence is not a phrase", () => expect(isPhraseShaped(FOCUS_SENTENCE_034)).toBe(false));
  it("an empty focus is not a phrase (the caller's fallback text takes over)", () =>
    expect(isPhraseShaped("   ")).toBe(false));

  it("asPhrase drops ONE trailing period so a slot cannot double its punctuation", () => {
    expect(asPhrase("the resolution status.")).toBe("the resolution status");
    expect(asPhrase("  the resolution status  ")).toBe("the resolution status");
  });

  it("asSentence terminates a focus the model left unterminated", () => {
    expect(asSentence("the record is unresolved")).toBe("the record is unresolved.");
    expect(asSentence("the record is unresolved.")).toBe("the record is unresolved.");
    expect(asSentence("is it resolved?")).toBe("is it resolved?");
  });

  it("labelledFocus is grammatical in BOTH shapes", () => {
    expect(labelledFocus("Subject to verification", FOCUS_PHRASE_022))
      .toBe("Subject to verification of Bosch supply chain authorization status for TD SYNNEX.");
    expect(labelledFocus("Subject to verification", FOCUS_SENTENCE_034)).toMatch(/^Subject to verification: The most concentrated/);
  });
});

// ── THE COMPOSITION ITSELF, at every doubt level.
const base = (level: string, focus: string): ShapeSnapshotInput => ({
  raw: {
    headline: "The supplier is real and trading.",
    leading_interpretation: "The record supports an operating business.",
    the_real_risk: "The operative risk is resale authorization.",
    what_to_verify: [],
    what_to_monitor: [],
  },
  doubt: { doubt_level: level, doubt_focus: focus } as ShapeSnapshotInput["doubt"],
  leading: null,
  limitations: [],
  materialUnresolvable: [],
  questions: [],
  verdictSentence: "Verdict: Verify Before Purchase.",
});

describe("elevated — the level that shipped the defect", () => {
  it("SENTENCE focus no longer lands inside a noun-phrase slot", () => {
    const s = shapeSnapshot(base("elevated", FOCUS_SENTENCE_034));
    expect(s.headline).not.toContain("verification of The most concentrated");
    expect(s.leading_interpretation).not.toContain("rests on The most concentrated");
    expect(s.leading_interpretation).not.toMatch(/holding\.$/);
    // The doubt is load-bearing — it must survive WHOLE, not be trimmed to fit.
    expect(s.headline).toContain("Subject to verification:");
    expect(s.leading_interpretation).toContain("What this reading depends on:");
    expect(s.leading_interpretation).toContain("Chapter 11 bankruptcy status");
    expect(s.leading_interpretation).toContain("Black Jax");
  });

  it("PHRASE focus joins with a COLON (headline nudge, founder-ruled 2026-08-20)", () => {
    // Was "— subject to verification of X" / "rests on X holding." — a long noun phrase wrapped
    // the first client-read line into one clumsy clause (039 shipped the 'holding' form).
    const s = shapeSnapshot(base("elevated", FOCUS_PHRASE_022));
    expect(s.headline).toBe("The supplier is real and trading. — still to verify: Bosch supply chain authorization status for TD SYNNEX");
    expect(s.leading_interpretation).toContain("This reading depends on verifying: Bosch supply chain authorization status for TD SYNNEX.");
    expect(s.leading_interpretation).not.toMatch(/rests on .* holding/);
  });
});

describe("broad — a parenthesised slot cannot hold a sentence", () => {
  it("SENTENCE focus is not stuffed into the brackets (AWI-2607-021's shape)", () => {
    const s = shapeSnapshot(base("broad", "The supply chain relationship is entirely unresolved. No channel tier could be established."));
    expect(s.headline).not.toMatch(/\([^)]*\./);
    expect(s.headline).toContain("Key items could not be verified.");
    expect(s.headline).toContain("No channel tier could be established.");
  });

  it("PHRASE focus joins with a COLON — a focus carrying its own parentheses cannot nest brackets", () => {
    // Headline nudge (founder-ruled 2026-08-20): was `(${focus})` — 039's focus contained
    // "(Nintendo, Sony, PlayStation)" and the first line a client read carried nested brackets.
    const s = shapeSnapshot(base("broad", FOCUS_LONG_PHRASE_032));
    expect(s.headline).toContain(`Key items could not be verified: ${FOCUS_LONG_PHRASE_032}.`);
    expect(s.headline).not.toContain(`(${FOCUS_LONG_PHRASE_032})`);
    const withParens = "Supply chain authorization for Click across all three brands (Nintendo, Sony, PlayStation)";
    const s2 = shapeSnapshot(base("broad", withParens));
    expect(s2.headline).toContain(`: ${withParens}.`);
    expect(s2.headline).not.toMatch(/\([^)]*\(/); // no nested opening bracket anywhere
  });

  it("the founder's law survives: broad still LEADS with what could not be verified", () => {
    for (const f of [FOCUS_SENTENCE_034, FOCUS_LONG_PHRASE_032]) {
      expect(shapeSnapshot(base("broad", f)).headline.startsWith("Key items could not be verified")).toBe(true);
    }
  });
});

describe("targeted — ZERO corpus cases exercise this level, so it is covered here", () => {
  it("PHRASE focus reads inline", () => {
    expect(shapeSnapshot(base("targeted", FOCUS_PHRASE_022)).the_real_risk)
      .toBe("The open question: Bosch supply chain authorization status for TD SYNNEX. The operative risk is resale authorization.");
  });

  it("SENTENCE focus does not produce a doubled full stop", () => {
    const s = shapeSnapshot(base("targeted", FOCUS_SENTENCE_034));
    expect(s.the_real_risk).not.toMatch(/\.\s*\./);
    expect(s.the_real_risk).toContain("The open question:");
  });
});

describe("minimal — safe by construction, and must stay that way", () => {
  it("interpolates the focus nowhere, whatever shape it has", () => {
    for (const f of [FOCUS_SENTENCE_034, FOCUS_PHRASE_022]) {
      const s = shapeSnapshot(base("minimal", f));
      expect(s.headline).toBe("The supplier is real and trading.");
      expect(s.the_real_risk).toBe("The operative risk is resale authorization.");
    }
  });
});

// ⚠ THE SHAPE NOBODY HAD IN MIND: a focus that is ONLY punctuation, or a bare fragment ending in
// a colon. Neither exists in the corpus; both are things a model can emit.
describe("degenerate focus values never produce broken prose", () => {
  for (const [label, focus] of [
    ["trailing colon", "the open items:"],
    ["punctuation only", "..."],
    ["single word", "authorization"],
    ["already-terminated fragment", "unresolved."],
  ] as const) {
    it(`survives: ${label}`, () => {
      for (const level of ["targeted", "elevated", "broad"]) {
        const s = shapeSnapshot(base(level, focus));
        expect(s.headline).not.toMatch(/\s{2,}/);
        expect(s.headline).not.toMatch(/\(\s*\)/);
        expect(s.the_real_risk).not.toMatch(/\.\s*\./);
      }
    });
  }
});
