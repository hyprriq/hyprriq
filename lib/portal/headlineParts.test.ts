import { describe, it, expect } from "vitest";
import { splitHeadline } from "./headlineParts";

// ── §3. Fixtures include the two REAL corpus headlines (the only delivered cases whose stored
// headline carries the seam) plus the shapes the corpus does not contain today: no qualifier, a
// dangling seam, a seam at position zero, and the alternate dash characters the engine may emit.

describe("§3 — the headline splits at the engine's own seam, losing nothing", () => {
  it("AWI-2607-022, verbatim: claim and condition separate cleanly", () => {
    const h = "TD SYNNEX is a verified, award-level Lenovo distributor with no material channel risk for new Lenovo products; Bosch resale authorization for the US Amazon channel is unconfirmed and faces documented enforcement risk. — subject to verification of Bosch authorization for US Amazon resale via TD SYNNEX.";
    const { claim, qualifier } = splitHeadline(h);
    expect(claim.endsWith("documented enforcement risk.")).toBe(true);
    expect(qualifier).toBe("Bosch authorization for US Amazon resale via TD SYNNEX.");
    expect(claim).not.toContain("subject to verification");
  });

  it("AWI-2608-034, verbatim opening: same seam, different case, no case-specific handling", () => {
    const h = "Stacker 2 is a real, long-established brand operated by a confirmed physical manufacturer — NVE Pharmaceuticals — that has undergone Chapter 11 bankruptcy; Black Jax has no verified supply chain identity in the current evidence record. — subject to verification of the Chapter 11 resolution status.";
    const { claim, qualifier } = splitHeadline(h);
    // ⚠ THE INTERESTING PART: this claim contains em-dashes of its own ("— NVE Pharmaceuticals —").
    // A naive "split on a dash" rule would cut the headline in the middle of the supplier's name.
    // The seam is anchored to the phrase, so the internal dashes survive untouched.
    expect(claim).toContain("— NVE Pharmaceuticals —");
    expect(qualifier).toBe("the Chapter 11 resolution status.");
  });

  it("no qualifier → the whole headline is the claim, unchanged", () => {
    const h = "The supplier is verified and no material channel risk was found.";
    expect(splitHeadline(h)).toEqual({ claim: h, qualifier: null });
  });

  it("nothing is ever lost: claim + qualifier reconstruct the original", () => {
    const h = "A claim here. — subject to verification of a condition here.";
    const { claim, qualifier } = splitHeadline(h);
    expect(`${claim} — subject to verification of ${qualifier}`).toBe(h);
  });

  it("a DANGLING seam degrades to no-split, never to a lost claim", () => {
    expect(splitHeadline("A claim here. — subject to verification of")).toEqual({ claim: "A claim here.", qualifier: null });
    expect(splitHeadline("A claim here. — subject to verification")).toEqual({ claim: "A claim here.", qualifier: null });
  });

  it("alternate dashes and casing the engine might emit", () => {
    expect(splitHeadline("A claim. – Subject To Verification Of x.").qualifier).toBe("x.");
    expect(splitHeadline("A claim. - subject to verification of x.").qualifier).toBe("x.");
  });

  it("a seam at position zero is not a split — there would be no claim left", () => {
    const h = "— subject to verification of everything.";
    expect(splitHeadline(h).claim).toBe(h);
    expect(splitHeadline(h).qualifier).toBeNull();
  });

  it("empty and whitespace headlines are safe", () => {
    expect(splitHeadline("")).toEqual({ claim: "", qualifier: null });
    expect(splitHeadline("   ")).toEqual({ claim: "", qualifier: null });
  });

  it("⛔ it is NOT a general dash splitter — ordinary parenthetical dashes survive", () => {
    const h = "The supplier — a Delaware corporation — is verified.";
    expect(splitHeadline(h)).toEqual({ claim: h, qualifier: null });
  });
});
