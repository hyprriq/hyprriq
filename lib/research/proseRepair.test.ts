import { describe, it, expect } from "vitest";
import { checkRepairInvariants } from "@/lib/research/proseRepair";

// The field the self-correcting loop would be asked to repair, in the shape the census found.
const ORIGINAL = "Regional portals in Indonesia and ANZ confirm authorization for Belgium (src_3).";
const GOOD = "Regional portals in Indonesia and ANZ support authorization for Belgium (src_3).";

describe("a faithful repair is allowed through", () => {
  it("passes when only the flagged verb changed", () => {
    expect(checkRepairInvariants(ORIGINAL, GOOD)).toEqual([]);
  });
});

describe("the five ruled invariants catch DELETION", () => {
  it("(1) refuses a dropped citation", () => {
    const r = checkRepairInvariants(ORIGINAL, "Regional portals in Indonesia and ANZ support authorization for Belgium.");
    expect(r.map((f) => f.invariant)).toContain("citations");
  });
  it("(2) refuses a dropped named entity", () => {
    const r = checkRepairInvariants(ORIGINAL, "Regional portals in Indonesia support authorization for Belgium (src_3).");
    expect(r.map((f) => f.invariant)).toContain("entities");
  });
  it("(4) refuses a dropped negation — the scope-flip guard", () => {
    const neg = "No documented authorization exists for Belgium (src_3), and portals confirm authorization.";
    const stripped = "Documented authorization exists for Belgium (src_3), and portals support authorization.";
    expect(checkRepairInvariants(neg, stripped).map((f) => f.invariant)).toContain("negation");
  });
  it("(5) refuses a collapsed field", () => {
    const r = checkRepairInvariants(ORIGINAL, "Portals (src_3).");
    expect(r.map((f) => f.invariant)).toContain("length");
  });
  it("refuses a repair that still trips the gate — you cannot fix banned language with banned language", () => {
    const r = checkRepairInvariants(ORIGINAL, "Regional portals in Indonesia and ANZ confirm authorization for Belgium (src_3)!");
    expect(r.map((f) => f.invariant)).toContain("still_blocked");
  });
});

// ── THE FINDING. This is the founder's own drift example, and it is the reason the sixth
// invariant exists. Documented as an executable test so the gap cannot be re-forgotten. ──
describe("⚠ the five are NOT sufficient — softening is substitution, not deletion", () => {
  const CLAIM = "No positive confirmation of authorization exists for Belgium (src_3).";
  const SOFTENED = "Authorization was not fully documented for Belgium (src_3).";

  it("all five ruled invariants PASS on the softened rewrite — citations, entities, numbers, negation, length", () => {
    const withoutSixth = checkRepairInvariants(CLAIM, SOFTENED, { localizedEdit: false });
    expect(withoutSixth).toEqual([]);          // <- the claim got weaker and nothing objected
  });

  it("the negation COUNT is identical on both sides — 'No' became 'not', so counting cannot see it", () => {
    const count = (s: string) => (s.match(/\b(?:no|not|never|without|absent)\b/gi) ?? []).length;
    expect(count(CLAIM)).toBe(1);
    expect(count(SOFTENED)).toBe(1);
  });

  it("the SIXTH invariant refuses it: the rewrite reached words the gate never flagged", () => {
    const r = checkRepairInvariants(CLAIM, SOFTENED);
    expect(r.map((f) => f.invariant)).toContain("localized_edit");
  });

  it("and it does not over-refuse: the faithful one-verb repair still passes with the sixth ON", () => {
    expect(checkRepairInvariants(ORIGINAL, GOOD)).toEqual([]);
  });
});

describe("escalation shape", () => {
  it("reports every failure at once, so the escalation record says what went wrong", () => {
    const r = checkRepairInvariants(ORIGINAL, "Portals confirm authorization.");
    expect(r.length).toBeGreaterThan(1);
    expect(r.every((f) => f.invariant && f.detail)).toBe(true);
  });
});
