import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { DOCUMENT_FIELDS, PINNED_FIELDS, LISTED_FIELDS } from "@/lib/content/documentFields";
import { CHECKABLE, CANNOT } from "@/lib/content/methodBoundary";
import { AREAS } from "@/lib/content/whatWeCheck";
import { VERDICT_SCALE_ORDER } from "@/lib/content/reportCopy";

// ── LOCK — THE THREE PAGE GRAPHICS (2026-08-25, design sitting five, part three) ──────────────
//
// A graphic is the hardest thing on the site to police. Prose gets read; a diagram gets glanced at,
// and a wrong one survives for months because nobody re-counts the pins. These are the rules the
// founder's visual plan set, written as assertions instead of as a paragraph nobody re-reads:
//
//   1. No fabricated evidence about a business, and no company names — real or invented.
//   2. Warm hues mean a verdict. The invoice pins and the boundary columns must stay cool.
//   3. Never publish how we score — no threshold, no weight, nothing that moves a case.
//   4. Every graphic carries a masked-demonstration label.
//   5. Legible at 360px, or it has a stacked mobile form.
//
// Rule 5 is the one that would have been skipped. All three are drawn in 900-unit viewBoxes; at
// 360px their 13–14px text renders around 5px. Each therefore ships TWO forms from ONE source, and
// the assertions below refuse a graphic that only has the drawn one.

const repo = path.resolve(__dirname, "../..");
const read = (p: string) => fs.readFileSync(path.join(repo, p), "utf8");
/** Comments quote the words they ban. Code only — twice-learned. */
const strip = (x: string) => x.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

const GRAPHICS = {
  "masked-invoice": strip(read("components/marketing/graphics/masked-invoice.tsx")),
  "checkable-boundary": strip(read("components/marketing/graphics/checkable-boundary.tsx")),
  "verdict-ladder": strip(read("components/marketing/graphics/verdict-ladder.tsx")),
} as const;

describe("LOCK — every page graphic is readable on a phone", () => {
  it.each(Object.keys(GRAPHICS))("%s ships a stacked form as well as a drawn one", (name) => {
    const src = GRAPHICS[name as keyof typeof GRAPHICS];
    expect(
      src,
      `${name} has no desktop-only gate — a 900-unit viewBox at 360px renders its text at about 5px`,
    ).toMatch(/hidden[^"]*md:block|md:block/);
    expect(
      src,
      `${name} has no mobile form. A graphic that becomes a smear on a phone is worse than none.`,
    ).toMatch(/md:hidden/);
  });
});

describe("LOCK — no graphic invents a business", () => {
  it.each(Object.keys(GRAPHICS))("%s writes no company-shaped name", (name) => {
    const src = GRAPHICS[name as keyof typeof GRAPHICS];
    // Every value on the invoice is a grey bar and every boundary line is a category. A company
    // suffix appearing in any of them means someone started filling the masks in.
    const suffixes = /\b(LLC|Inc\.|Ltd\.?|GmbH|Corp\.?|Co\.|Wholesale|Trading|Distribution)\b/;
    const hit = src.match(suffixes);
    expect(hit?.[0], `${name} contains "${hit?.[0]}" — graphics carry no company names, invented or real`)
      .toBeUndefined();
  });

  it("the invoice is labelled as a masked demonstration on BOTH of its forms", () => {
    const matches = GRAPHICS["masked-invoice"].match(/Masked demonstration/g) ?? [];
    expect(matches.length, "the drawn form and the stacked form each need the label").toBe(2);
  });
});

describe("LOCK — the fourteen-point read is a list, not a word", () => {
  it("the count the copy asserts matches the list that backs it", () => {
    // "A fourteen-point read of your paperwork" was a word in a paragraph with nothing behind it.
    // Now the graphic enumerates every field, so the claim is countable — and this keeps it true.
    expect(DOCUMENT_FIELDS.length, "the copy says fourteen; the list must contain fourteen").toBe(14);
    expect(PINNED_FIELDS.length + LISTED_FIELDS.length).toBe(DOCUMENT_FIELDS.length);
    const copy = read("lib/content/whatWeCheck.ts");
    expect(copy, "the Documentation Review copy must still say fourteen").toContain("fourteen-point read");
  });

  it("every field key is unique", () => {
    const keys = DOCUMENT_FIELDS.map((f) => f.key);
    expect(new Set(keys).size, "duplicate field key — the pin ordering would be ambiguous").toBe(keys.length);
  });

  it("no callout accuses a supplier of anything", () => {
    // THE RULE THE PRODUCT RESTS ON. A callout says what is CHECKED. It never says a field is wrong,
    // and it never converts an anomaly into an allegation. The standing instruction on formatting is
    // ESCALATE, DO NOT ACCUSE — so "gets flagged for a closer look" is correct and "indicates
    // tampering" is not, however obviously true it might feel in a given case.
    const ACCUSATORY = [
      "tamper", "forged", "forgery", "fake", "fraud", "falsified", "doctored",
      "counterfeit", "suspicious", "lying", "dishonest", "scam",
    ];
    const offenders: string[] = [];
    for (const f of DOCUMENT_FIELDS) {
      const text = f.callout.toLowerCase();
      for (const word of ACCUSATORY) if (text.includes(word)) offenders.push(`${f.key} → "${word}"`);
    }
    expect(offenders, `a callout accuses rather than describes:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("the invoice pins are the brand action colour, never a verdict hue", () => {
    // A red pin on an invoice field is a verdict colour doing decoration, on a graphic that is
    // explicitly NOT rendering a verdict about anything.
    const src = GRAPHICS["masked-invoice"];
    expect(src).toContain("var(--color-action)");
    for (const warm of ["verify", "rely", "cond", "clear"]) {
      expect(
        src.includes(`--color-${warm}-`),
        `the masked invoice uses the ${warm} verdict token — warm hues mean a verdict`,
      ).toBe(false);
    }
  });
});

describe("LOCK — the boundary derives from the method, and stays cool on both sides", () => {
  it("the checkable column has one line per assessment area", () => {
    // Derived, so a sixth area appears in the graphic the day it is added rather than the day
    // somebody remembers the graphic exists.
    expect(CHECKABLE.length).toBe(AREAS.length);
    expect(CHECKABLE.map((c) => c.key)).toEqual(AREAS.map((a) => a.key));
    for (const c of CHECKABLE) expect(c.line.length, `${c.key} has no checkable line`).toBeGreaterThan(10);
  });

  it("the limits the graphic draws are the limits /method publishes", () => {
    const page = read("app/(marketing)/method/page.tsx");
    expect(page, "/method must read CANNOT from the shared module, not re-declare it")
      .toMatch(/import \{ CANNOT \} from "@\/lib\/content\/methodBoundary"/);
    expect(page, "a second CANNOT literal is back — that is how two versions of a refusal happen")
      .not.toMatch(/^const CANNOT = \[/m);
    for (const c of CANNOT) {
      expect(c.short.length, `"${c.t}" has no drawable short form`).toBeGreaterThan(10);
    }
  });

  it("the not-knowable column is NOT drawn as a warning", () => {
    // The single most important design decision in this graphic. It is a boundary, not a failure
    // state — and it is the strongest argument for the column beside it.
    const src = GRAPHICS["checkable-boundary"];
    for (const warm of ["verify", "rely", "cond", "clear", "deny"]) {
      expect(
        src.includes(`--color-${warm}-`) || src.includes(`-${warm}-ink`) || src.includes(`bg-${warm}-`),
        `the boundary uses the ${warm} verdict token — the right column is a boundary, not a warning`,
      ).toBe(false);
    }
    expect(src, "the cool accent must be there on the left").toContain("cyan");
  });
});

describe("LOCK — the verdict ladder cannot drift from the registry", () => {
  const src = GRAPHICS["verdict-ladder"];

  it("reads every colour from VERDICT_PALETTE and writes no hex of its own", () => {
    expect(src).toMatch(/VERDICT_PALETTE\[key\]/);
    const hex = src.match(/#[0-9A-Fa-f]{6}\b/g) ?? [];
    expect(hex, `the ladder writes raw hex: ${hex.join(", ")}`).toEqual([]);
  });

  it("draws a rung for every level on the scale, in scale order", () => {
    expect(src).toMatch(/VERDICT_SCALE_ORDER\.map/);
    // The width cue is what makes it a ladder rather than four cards. If a future edit makes every
    // rung the same width the graphic silently becomes the thing it replaced.
    expect(src, "the rungs must widen with the level").toMatch(/function rungWidth/);
    expect(VERDICT_SCALE_ORDER.length, "the scale is four levels").toBe(4);
  });

  it("the certainty chips stay in neutral ink", () => {
    // Verified and Assessed describe EVIDENCE QUALITY, not the supplier. Giving them verdict colour
    // would read as a fifth and sixth verdict on a four-level scale.
    const caption = src.slice(src.indexOf("figcaption"));
    for (const warm of ["verify", "rely", "cond", "clear"]) {
      expect(
        caption.includes(`-${warm}-`),
        `the certainty chips use the ${warm} verdict token — certainty is not a verdict`,
      ).toBe(false);
    }
  });

  it("/how-to-read renders the ladder instead of hand-building a colour map", () => {
    const page = read("app/(marketing)/how-to-read/page.tsx");
    expect(page).toMatch(/<VerdictLadder/);
    expect(
      page.includes("VERDICT_CLASSES["),
      "/how-to-read is building its own verdict styling again — the page whose whole job is " +
        "teaching a client to read the verdict had three of four colours wrong the last time it did",
    ).toBe(false);
  });
});
