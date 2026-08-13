import { describe, it, expect } from "vitest";
import { parseFindingStructure } from "./findingStructure";

// ── FINDING READABILITY (dev thread 2026-08-13, item 3) — parse the structure the engine
// ALREADY writes: ALL-CAPS labeled sections ("CONFIRMED POSITIVES:") and parenthesized numbered
// points ("(1) … (2) …"). PRESENTATION ONLY: lossless — every non-whitespace character of the
// input must appear, in order, in the parsed blocks. No detectable structure → one prose block.

const noWs = (s: string) => s.replace(/\s+/g, "");
const flatten = (blocks: ReturnType<typeof parseFindingStructure>) =>
  blocks.map((b) => (b.type === "list" ? b.items.join("") : b.type === "heading" ? b.text : b.text)).join("");

describe("parseFindingStructure", () => {
  it("plain prose → a single prose block, unchanged", () => {
    const t = "TD SYNNEX is a large, publicly traded (NYSE: SNX) distributor with decades of history.";
    expect(parseFindingStructure(t)).toEqual([{ type: "prose", text: t }]);
  });

  it("ALL-CAPS labels become headed blocks", () => {
    const t = "LENOVO — CONFIRMED POSITIVES: TD SYNNEX is a directly authorized distributor. REMAINING UNKNOWNS: The US channel is unconfirmed.";
    const b = parseFindingStructure(t);
    expect(b).toEqual([
      { type: "heading", text: "LENOVO — CONFIRMED POSITIVES" },
      { type: "prose", text: "TD SYNNEX is a directly authorized distributor." },
      { type: "heading", text: "REMAINING UNKNOWNS" },
      { type: "prose", text: "The US channel is unconfirmed." },
    ]);
  });

  it("parenthesized numbers become list items", () => {
    const t = "(1) The registry confirms the entity. (2) The domain is 20 years old. (3) No negative reputation was found.";
    expect(parseFindingStructure(t)).toEqual([
      {
        type: "list",
        items: [
          "The registry confirms the entity.",
          "The domain is 20 years old.",
          "No negative reputation was found.",
        ],
      },
    ]);
  });

  it("numbered 'N.' items at segment starts become list items (the Track-2 style)", () => {
    const t = "1. LENOVO: The evidence is exceptionally strong. 2. BOSCH: The relationship is EU-scoped.";
    expect(parseFindingStructure(t)).toEqual([
      { type: "list", items: ["LENOVO: The evidence is exceptionally strong.", "BOSCH: The relationship is EU-scoped."] },
    ]);
  });

  it("does NOT treat years or decimals as numbering", () => {
    const t = "Incorporated 2003. Revenue grew 2.5 times since 2019.";
    expect(parseFindingStructure(t)).toEqual([{ type: "prose", text: t }]);
  });

  it("labels inside a numbered item split into heading + content", () => {
    const t = "CONFIRMED POSITIVES: (1) A published MAP policy. (2) Broad B2C channels. REMAINING UNKNOWNS: The division split is unclear.";
    const b = parseFindingStructure(t);
    expect(b[0]).toEqual({ type: "heading", text: "CONFIRMED POSITIVES" });
    expect(b[1]).toEqual({ type: "list", items: ["A published MAP policy.", "Broad B2C channels."] });
    expect(b[2]).toEqual({ type: "heading", text: "REMAINING UNKNOWNS" });
    expect(b[3]).toEqual({ type: "prose", text: "The division split is unclear." });
  });

  it("LOSSLESS: every non-whitespace character survives, in order (markers and label colons consumed only)", () => {
    const t =
      "LENOVO — CONFIRMED POSITIVES: (1) Portal title 'Lenovo Authorized Distributor'. (2) UK 360 status. BOSCH — REMAINING UNKNOWNS: US locators omit TD SYNNEX; the Belgium listing is the only link.";
    const joined = flatten(parseFindingStructure(t));
    const expected =
      "LENOVO — CONFIRMED POSITIVES" +
      "Portal title 'Lenovo Authorized Distributor'." +
      "UK 360 status." +
      "BOSCH — REMAINING UNKNOWNS" +
      "US locators omit TD SYNNEX; the Belgium listing is the only link.";
    expect(noWs(joined)).toBe(noWs(expected));
  });

  it("mid-sentence capitalised acronyms are not headings", () => {
    const t = "The vendor TD SYNNEX CORPORATION appears in SEC filings. BBB lists the entity.";
    expect(parseFindingStructure(t)).toEqual([{ type: "prose", text: t }]);
  });
});
