import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ASSESSMENT_AREA_KEYS } from "@/lib/constants/tracks";

// ── LOCK — THE HOMEPAGE'S SPEC GRAPHICS STAY DERIVED (2026-08-24, design sitting five) ────────
//
// The spec hands over three pieces of geometry as literals: a `stroke-dasharray:188.5`, a
// `stroke-dashoffset:113.1`, and a label reading "2 of 5 areas complete". All three are correct
// ONLY while there are five assessment areas and two of them are done in the demonstration.
//
// Copied literally, they rot silently and in the worst possible way: the day a sixth area is added
// the ring would still draw a two-fifths arc under a label reading "2 of 6", and the row list
// beneath it would show six rows against a five-area circle. Nothing would fail, nothing would look
// broken, and the page would be quietly wrong about the product.
//
// So this lock refuses the literals and requires the derivation. 188.5 is 2π·30 and 113.1 is that
// circumference times three-fifths — both are computed below from the SAME constant the label reads,
// which is what makes them safe.

const repo = path.resolve(__dirname, "../..");
const read = (p: string) => fs.readFileSync(path.join(repo, p), "utf8");
/** Comments necessarily quote the numbers they exist to ban. Code only — the vocabulary lock and the
 *  console-switcher lock both failed against their own documentation before this was learned. */
const strip = (x: string) => x.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

const RING = strip(read("components/marketing/home/progress-ring.tsx"));
const PAGE = strip(read("app/(marketing)/page.tsx"));
const CSS = read("app/globals.css");

describe("LOCK — the progress ring's geometry is computed, never copied", () => {
  it("neither spec literal is written into the ring or the page", () => {
    for (const [name, src] of [["progress-ring.tsx", RING], ["page.tsx", PAGE]] as const) {
      for (const literal of ["188.5", "113.1"]) {
        expect(
          src.includes(literal),
          `${name} carries the spec literal ${literal}. It is only correct while there are ` +
            `${ASSESSMENT_AREA_KEYS.length} areas — derive it from ASSESSMENT_AREA_KEYS instead.`,
        ).toBe(false);
      }
    }
  });

  it("the arc's dash values come from CSS variables the component computes", () => {
    // If a future edit inlines the numbers into the stylesheet, the component's derivation becomes
    // dead code and the drift is back — so the CSS is held to reading them from the component.
    expect(CSS).toMatch(/\.hq-ring-arc\s*\{[^}]*stroke-dasharray:\s*var\(--ring-c\)/);
    expect(CSS).toMatch(/\.hq-ring-arc\[data-drawn="true"\]\s*\{[^}]*stroke-dashoffset:\s*var\(--ring-o\)/);
  });

  it("the component derives the circumference from the radius, and the offset from the counts", () => {
    expect(RING, "the circumference must be computed").toMatch(/2\s*\*\s*Math\.PI\s*\*\s*r/);
    expect(RING, "the offset must be a fraction of done/total").toMatch(/1\s*-\s*done\s*\/\s*total/);
  });

  it("and the derivation still reproduces the spec's numbers today", () => {
    // The point of the lock is not that the spec was wrong — it is that the spec was right for one
    // configuration. This proves the derived form agrees with it at the configuration it was drawn
    // for, so the ban above cannot be read as "the spec's geometry was incorrect".
    const circumference = 2 * Math.PI * 30;
    const offset = circumference * (1 - 2 / ASSESSMENT_AREA_KEYS.length);
    expect(circumference.toFixed(1)).toBe("188.5");
    expect(offset.toFixed(1)).toBe("113.1");
  });

  it("the ring's label counts areas from the constant, not from a written number", () => {
    expect(
      PAGE,
      "the ring label must read the area count from ASSESSMENT_AREA_KEYS, or it will disagree " +
        "with the rows listed directly beneath it",
    ).toMatch(/\$\{ASSESSMENT_AREA_KEYS\.length\} areas complete/);
  });
});

describe("LOCK — the flow visual reads the verdict from the registry", () => {
  const FLOW = strip(read("components/marketing/home/flow-visual.tsx"));

  it("takes its warm pair from VERDICT_PALETTE rather than writing hex", () => {
    // Warm hues mean a verdict. This one IS a verdict, so warm is correct here — but it must be the
    // registry's warm, or the homepage graphic and the report can disagree about what the same
    // verdict looks like. That is the exact drift the palette registry was built to end.
    expect(FLOW).toMatch(/VERDICT_PALETTE\.verify_before_purchase/);
    expect(
      /#[0-9A-Fa-f]{6}/.test(FLOW),
      "the flow visual writes a raw hex colour — every colour in it must come from a token or the " +
        "verdict registry",
    ).toBe(false);
  });

  it("names the verdict from the copy registry and the wait from the SLA constant", () => {
    expect(FLOW).toMatch(/VERDICT_COPY\.verify_before_purchase\.name/);
    expect(FLOW).toMatch(/CASE_SLA_HOURS/);
  });

  it("carries a text alternative, because its own labels are drawn at 9.5 units", () => {
    // The verdict text inside the graphic renders at roughly 9.5px at the ruled 320px width. That is
    // the spec's size and it was built as ruled — but nothing may be available ONLY at that size.
    expect(FLOW).toMatch(/role="img"/);
    expect(FLOW).toMatch(/aria-label=/);
  });
});

describe("LOCK — the spec's card baselines are subgrid, not luck", () => {
  it("both card rows span and inherit the parent's three rows", () => {
    // Six capability cards and three walkthrough steps. Without subgrid they are independent stacks
    // that only LOOK aligned while the copy happens to be the same length — a thing that stops being
    // true the first time anyone edits a word.
    const spans = PAGE.match(/row-span-3 grid grid-rows-subgrid/g) ?? [];
    expect(spans.length, "expected the capability strip AND the walkthrough to use subgrid")
      .toBeGreaterThanOrEqual(2);
    const parents = PAGE.match(/grid-rows-\[auto_auto_auto\]/g) ?? [];
    expect(parents.length, "a subgrid child needs a parent that declares the three rows")
      .toBeGreaterThanOrEqual(2);
  });

  it("every capability carries a real mark, not a placeholder dot", () => {
    // The first build reduced the spec's six line-art marks to one coloured circle each. Restored
    // 2026-08-24; this keeps them restored.
    const icons = PAGE.match(/icon: \[/g) ?? [];
    expect(icons.length, "all six capability entries must carry their spec path data").toBe(6);
  });
});

describe("LOCK — the service section compresses on a phone, and loses nothing", () => {
  const RAIL = strip(read("components/marketing/home/service-rail.tsx"));
  const WHAT_WE_CHECK = read("app/(marketing)/what-we-check/page.tsx");

  it("the summary and BOTH detail boxes come off below 960px", () => {
    // Spec line 437: `.pan .pm, .pan .d { display: none }`. The homepage is a hub — on a phone its
    // job is five questions and their limits, not the full explanation.
    const gated = RAIL.match(/max-\[960px\]:hidden/g) ?? [];
    expect(
      gated.length,
      "expected the summary paragraph AND the detail-box grid to hide below 960px",
    ).toBeGreaterThanOrEqual(2);
  });

  it("ONE NUMBER governs the rail and the compression (founder-ruled 2026-08-25)", () => {
    // The breakpoint was three different numbers: the comment said 760, the code used lg (1024),
    // the spec says 960. Ruling: 960 for both, so the rail hides at exactly the width the summary
    // form appears. "Two breakpoints doing related jobs at different widths is how this kind of
    // disagreement starts."
    //
    // The two halves are COMPLEMENTARY, not identical: content-hiding is `max-[960px]:` so a missed
    // query SHOWS the copy, and the structural switches are `min-[961px]:` so a missed query leaves
    // the MOBILE form — which keeps the panel's own number, and that number is content. Both
    // default to the safe state; they just have opposite safe states.
    expect(RAIL, "the rail must switch at 961, not at lg").toMatch(/min-\[961px\]:block/);
    expect(RAIL, "the two-column layout must switch with the rail").toMatch(/min-\[961px\]:grid-cols-/);
    expect(RAIL, "the panel's own number must disappear exactly when the rail appears")
      .toMatch(/min-\[961px\]:hidden/);
    // No structural rule may still be on lg — that would reopen the gap this ruling closed.
    expect(
      /lg:(block|grid-cols-|hidden)/.test(RAIL),
      "a STRUCTURAL rule is still on lg (1024). The rail, its grid and the panel number all move " +
        "together at 960; only type and spacing polish stays on lg.",
    ).toBe(false);
  });

  it("uses the SPEC's 960px breakpoint, and FAILS OPEN", () => {
    // lg is 1024; using it would compress the 960-1023 band the spec leaves expanded.
    expect(RAIL, "the compression must key off 960px").toMatch(/max-\[960px\]:hidden/);
    // ⚠ THE DIRECTION IS THE POINT. `hidden min-[961px]:block` was measured hiding the summary at a
    // 961px viewport — devicePixelRatio 1.25 made matchMedia("(min-width: 961px)") false. An
    // inverted rule on the boundary can land the wrong side of sub-pixel rounding, and
    // default-hidden means the COPY DISAPPEARS. Default-visible means the same failure shows too
    // much instead. A rule that hides real copy must fail open.
    expect(
      /hidden[^"]*min-\[9\d\dpx\]:(block|grid)/.test(RAIL),
      "the compression is inverted to default-hidden again — it must be `max-[960px]:hidden` so a " +
        "boundary miss shows the copy rather than losing it",
    ).toBe(false);
  });

  it("⚠ NOTHING IS HIDDEN THAT IS NOT RENDERED IN FULL ON /what-we-check", () => {
    // THE TEST THAT MATTERS. Compression is only honest while the detail exists somewhere the reader
    // is sent. Both surfaces read lib/content/whatWeCheck.ts — this proves the destination actually
    // renders the three fields the homepage stops showing, so they are MOVED and not LOST.
    for (const field of ["a.summary", "a.examines", "a.delivers"]) {
      const bare = field.split(".")[1];
      expect(
        WHAT_WE_CHECK.includes(`a.${bare}`) || WHAT_WE_CHECK.includes(`{a.full`),
        `/what-we-check no longer renders ${bare}, so hiding it on the homepage now LOSES it`,
      ).toBe(true);
    }
    expect(
      RAIL, "the panel must still link the reader to where the detail lives",
    ).toBeTruthy();
    const page = read("app/(marketing)/page.tsx");
    expect(page, "the homepage must still link to /what-we-check").toMatch(/href="\/what-we-check"/);
  });

  it("the number, the question and the limit SURVIVE the compression", () => {
    // What is left has to still make a promise legible. If a future edit gates these too, the
    // section becomes five headings and nothing else.
    // NEWLINE VIA charCode, NOT AN ESCAPE — standing rule 11's family. Writing "\n" through the
    // tooling that generated this file produced a LITERAL newline inside the string and broke the
    // parse. It failed loudly this time; the backspace variant of the same mistake fails silently.
    const NEWLINE = String.fromCharCode(10);
    for (const kept of ["a.question", "a.summaryLimit"]) {
      const line = RAIL.split(NEWLINE).find((l) => l.includes(kept)) ?? "";
      expect(line, `${kept} must render at every width`).not.toMatch(/min-\[961px\]:|hidden/);
    }
  });
});
