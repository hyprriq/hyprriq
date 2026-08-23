import { describe, it, expect } from "vitest";
import { stripInternalRefs } from "./clientReport";
import { findInternalTokens } from "./clientTokenCheckpoint";

// ── THE MARKER RULING, FIXTURE-LOCKED (founder-locked 2026-08-22, item 1) ────────────────────
// Written from a CORPUS CENSUS, not from imagination: every "leak" case below is a real string
// that reached a real client surface, and every "must survive" case is real client content the
// same corpus carries. The rule was measured before it was written.

describe("leaks the census found on DELIVERED reports — all must be stripped", () => {
  const REAL_LEAKS: [string, string, string][] = [
    ["AWI-2608-033 — RG in a lone parenthetical",
     "No authorization document naming Bulk Buy America has been reviewed (RG02). Grey-market stock remains a risk.",
     "RG02"],
    ["AWI-2608-038 — hyphenated A-NNN, the form A\d{2} could not match",
     "Whether any equivalent documentation exists is unresolved (A-010). An undisclosed tier is possible.",
     "A-010"],
    ["AWI-2608-039 — two unknown vocabularies in one group",
     "Any change that would affect the scope of the supply relationship (A-014, RG-002)",
     "A-014"],
    ["AWI-2608-039 — A-NNN pair",
     "Its 2019 digital distribution policy shift (A-009, A-013)",
     "A-009"],
  ];
  for (const [label, input, marker] of REAL_LEAKS) {
    it(label, () => {
      const out = stripInternalRefs(input);
      expect(out).not.toContain(marker);
      expect(findInternalTokens(out)).toEqual([]);
      expect(out.length).toBeGreaterThan(20); // stripped, never emptied
    });
  }
});

describe("MIXED groups keep their real words — the token goes, the meaning stays", () => {
  it("(A10, unresolved) becomes (unresolved), never an empty bracket", () => {
    const out = stripInternalRefs("The account may already be gated on Amazon (A10, unresolved), which would make the inventory unsellable.");
    expect(out).toContain("(unresolved)");
    expect(out).not.toContain("A10");
  });

  it("(E2, Brand Risk; A2) keeps the area name and drops both markers", () => {
    const out = stripInternalRefs("Enforcement targets counterfeiters rather than resellers (E2, Brand Risk; A2). No action was found.");
    expect(out).toContain("Brand Risk");
    expect(out).not.toMatch(/\bE2\b|\bA2\b/);
  });

  it("a group of only markers is removed whole, leaving clean grammar", () => {
    const out = stripInternalRefs("The inventory path is undocumented (A8, RG1), so the buyer cannot establish origin.");
    expect(out).toBe("The inventory path is undocumented, so the buyer cannot establish origin.");
  });
});

describe("⛔ REAL CLIENT CONTENT THE CENSUS FOUND — a general shape rule would corrupt these", () => {
  it("SEC filing names survive byte for byte (the collision that keeps this vocabulary enumerated)", () => {
    const s = "Legitimacy: 30-year-old domain, active SEC filings (S-1, S-3, 10-K), consistent HQ address.";
    expect(stripInternalRefs(s)).toBe(s);
  });

  it("an Amazon ASIN survives — it is the client's own product identifier", () => {
    const s = "Additional SKUs may expand beyond B007EARF3O in the same category.";
    expect(stripInternalRefs(s)).toBe(s);
  });

  it("product and platform names that look token-shaped survive (PS5, PS4, B12)", () => {
    for (const s of [
      "No evidence supports that relationship extending to PS5 or other current hardware.",
      "Whether it references current PlayStation hardware (PS5) or remains limited to legacy PS4.",
      "Energy pills and B12 vitamin shots on Amazon across Health & Household.",
    ]) expect(stripInternalRefs(s)).toBe(s);
  });

  it("a model number that merely resembles a marker is untouched when it is the client's own text", () => {
    const s = "The EV-2000 charger and the E-40 mount ship together.";
    expect(stripInternalRefs(s)).toBe(s);
  });

  it("a genuine parenthetical of words is never touched", () => {
    const s = "The distributor (a publicly traded company, NYSE: SNX) filed on time.";
    expect(stripInternalRefs(s)).toBe(s);
  });
});

describe("the checkpoint backstop — presence only, in the two measured-clean prefixes", () => {
  it("refuses bare A-NN and RG-NN, the shapes that reached delivered reports", () => {
    for (const s of ["Assertions A9 and A10 remain unresolved.", "Gap RG-002 was not closed.", "See A-014 for detail."]) {
      expect(findInternalTokens(s).length, s).toBeGreaterThan(0);
    }
  });

  it("does NOT refuse the collisions the census proved legitimate", () => {
    for (const s of [
      "active SEC filings (S-1, S-3, 10-K)",
      "SKUs beyond B007EARF3O",
      "the PS5 and PS4 lines",
      "B12 vitamin shots",
      "the EV-2000 charger",
    ]) expect(findInternalTokens(s), s).toEqual([]);
  });

  it("the guards hold: A-1000 is not A-1, and a marker glued to an identifier does not fire", () => {
    expect(findInternalTokens("model A-1000 shipped")).toEqual([]);
    expect(findInternalTokens("SKU XA10B")).toEqual([]);
  });
});
