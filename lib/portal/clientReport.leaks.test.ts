import { describe, it, expect } from "vitest";
import { cleanClientProse } from "./clientReport";

// ═══════════════════════════════════════════════════════════════════════════════════════════
// §1 — THE LEAK CLASSES. FIXTURES DERIVED FROM THE CORPUS (scripts/token-leak-sweep.ts),
// NOT FROM IMAGINATION.
//
// STANDING RULE 2026-08-18: "a fixture that only carries the shape the rule was written for
// proves nothing about the shapes it wasn't." The P0 survived "verified weeks ago" precisely
// because every fixture in clientReport.test.ts was PARENTHESISED. Every string below is real
// prose from a real stored case, named with its case number so it can be re-checked against the
// row it came from. When these disagree with the code, re-run the sweep before trusting either.
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("§1 Class 1 — src_N in the shapes the corpus actually contains, not the one we imagined", () => {
  it("sentence-initial subject: the sentence is DROPPED, never mangled into a subject-less wreck", () => {
    // AWI-2606-011, verbatim. Stripping alone would ship " lists 'Bosch' on TD SYNNEX Belgium's…"
    expect(cleanClientProse("src_4 lists 'Bosch' on TD SYNNEX Belgium's vendor page without specifying the division."))
      .toBe("");
  });

  it("ALL-CAPS label + token subject (the engine's actual section shape) is dropped whole", () => {
    // AWI-2606-009, verbatim.
    const s = "MARKETPLACE RESTRICTIONS: src_38 (Reddit, LegalAdviceUK) discusses a consumer's laptop warranty being voided due to an unauthorized reseller — this is a general consumer anecdote unrelated to TD SYNNEX and carries no weight.";
    expect(cleanClientProse(s)).toBe("");
  });

  it("after a connector word: tokens go, the sentence keeps its subject and reads", () => {
    expect(cleanClientProse("Sources src_6 and src_7 confirm the Belgian entity is active."))
      .toBe("Sources confirm the Belgian entity is active.");
  });

  it("the en-dash RANGE that no hand-written fixture set contained (28 of 169 occurrences)", () => {
    expect(cleanClientProse("The distributor list is corroborated across four filings src_3–src_6 without contradiction."))
      .toBe("The distributor list is corroborated across four filings without contradiction.");
  });

  it("bare inline", () => {
    expect(cleanClientProse("The Delaware incorporation src_12 is confirmed by the SEC filing."))
      .toBe("The Delaware incorporation is confirmed by the SEC filing.");
  });
});

describe("§1 Class 1 — THE P0 ITSELF: one unknown token shape must not disable the match beside it", () => {
  // AWI-2608-034 decision_snapshot.leading_interpretation, verbatim — the exact bytes delivered to
  // a client account. The old matcher required EVERY group member to be a known token, so the
  // unrecognised A05/A08 defeated it and carried three EV ids into the most-read field on the page.
  const p0 = "The Stacker 2 brand is NVE's own product line, distributed through major mass retail including Walmart across more than 8 countries, and NVE exhibited at the 2026 NACS Show — indicating the company has not ceased operations (EV-001, EV-004, EV-005, A05, A08).";

  it("strips the whole mixed citation, leaving the finding intact and no orphaned bracket", () => {
    const out = cleanClientProse(p0);
    expect(out).toBe("The Stacker 2 brand is NVE's own product line, distributed through major mass retail including Walmart across more than 8 countries, and NVE exhibited at the 2026 NACS Show — indicating the company has not ceased operations.");
    expect(out).not.toMatch(/EV-\d{3}|A\d{2}|\(\s*,/);
  });

  // ⚠ KNOWN RESIDUE, RECORDED DELIBERATELY — NOT A PASSING TEST DRESSED UP AS ONE.
  // AWI-2608-032 carries "(A10, unresolved)": a bracket mixing an internal citation token with a
  // real word, so the all-tokens group matcher correctly declines it and A10 SURVIVES the cleaner.
  // The cleaner is not widened to strip bare A-NN, because `A10` collides with real product model
  // numbers exactly as `E-40` does — and this file has already been bitten once today by a strip
  // that was wider than its evidence. Stopping this occurrence is the presence checkpoint's job,
  // and whether the checkpoint asserts bare A-NN at all is a FOUNDER RULING (collision risk vs.
  // leak risk), not a call this module gets to make quietly.
  // ── EXPECTATION CHANGED BY RULING (2026-08-22), not bent to fit a build. This case previously
  // asserted the OPPOSITE — that a marker mixed with real words was deliberately LEFT for the
  // checkpoint. The corpus census then measured what that trade actually cost: 17 markers on a
  // client surface across 4 cases, three of them ALREADY DELIVERED. The founder ruled the leaks
  // closed, so the mixed group now loses its marker and KEEPS its word: the meaning survives,
  // the citation does not. The old string is kept verbatim as the fixture so the change of
  // behaviour is legible in the diff rather than hidden behind a reworded test.
  it("a token mixed with real words loses the TOKEN and keeps the WORD (was: left for the checkpoint)", () => {
    const s = "The seller account may already be gated for Sterilite on Amazon (A10, unresolved), which would make the inventory unsellable.";
    const out = cleanClientProse(s);
    expect(out).not.toContain("A10");
    expect(out).toContain("(unresolved)");
    expect(out).toBe("The seller account may already be gated for Sterilite on Amazon (unresolved), which would make the inventory unsellable.");
  });
});

describe("§1 Class 1 — the bare vocabulary stays ANCHORED (a false strip is the worse failure)", () => {
  it("leaves bare product model numbers alone — E-40 / EV-2000 are the client's own products", () => {
    const s = "The listing covers the E-40 controller and the EV-2000 charger.";
    expect(cleanClientProse(s)).toBe(s);
  });

  it("still strips those shapes INSIDE a pure-token bracket, where they are citations by construction", () => {
    expect(cleanClientProse("Documented enforcement (E10 and E11) exists on the record."))
      .toBe("Documented enforcement exists on the record.");
  });
});

describe("§1 Class 2 — dev-era stub provenance (47 occurrences, 19 cases, one shape)", () => {
  it("drops the stub sentence, UUID and all", () => {
    // AWI-2606-003, verbatim.
    expect(cleanClientProse("stub track_1 for case 7e2bd898-59d2-4e81-ac4f-a44717b09a99")).toBe("");
  });

  it("keeps the findings around it", () => {
    expect(cleanClientProse("stub track_1 for case 7e2bd898-59d2-4e81-ac4f-a44717b09a99. The registry filing confirms the entity."))
      .toBe("The registry filing confirms the entity.");
  });

  it("does NOT drop a sentence merely because it carries an id-shaped string", () => {
    const s = "The buyer should confirm order 7e2bd898-59d2-4e81-ac4f-a44717b09a99 with the supplier directly.";
    expect(cleanClientProse(s)).toBe(s);
  });
});

describe("§1 Class 3 — retired 'dimension' vocabulary, substituted with grammar intact", () => {
  it("the ruled target: the scoring-unit sense", () => {
    // AWI-2607-022, verbatim.
    expect(cleanClientProse("no documents were provided for review — dimension excluded from scoring (absence, not a finding)"))
      .toBe("no documents were provided for review — assessment area excluded from scoring (absence, not a finding)");
  });

  it("⚠ THE COMPOUND CASE — a bare substitution would ship 'assessment assessment areas'", () => {
    // AWI-2607-030, verbatim. This sentence is why the compound rule must run first, and it is
    // not visible in any single other occurrence of the word.
    expect(cleanClientProse("All five major assessment dimensions (reseller policy, Amazon gating, IP enforcement, C&D history, channel type) require direct investigation."))
      .toBe("All five major assessment areas (reseller policy, Amazon gating, IP enforcement, C&D history, channel type) require direct investigation.");
  });

  it("'verification dimensions' collapses rather than doubling", () => {
    // AWI-2607-019, verbatim opening.
    expect(cleanClientProse("The evidence pack strongly supports legitimate vendor identity across all major verification dimensions."))
      .toBe("The evidence pack strongly supports legitimate vendor identity across all major assessment areas.");
  });

  it("the ordinary-English sense substitutes to grammatical prose (corpus-checked, not assumed)", () => {
    // AWI-2608-034 and SEED-VALIDATE-T1-1782631228537, verbatim fragments. The word carries a
    // non-retired sense in this corpus; the ruling is still "substitute", and these prove the
    // substitution does not produce nonsense in that sense.
    expect(cleanClientProse("A buyer cannot assess any other dimension of vendor legitimacy for that brand."))
      .toBe("A buyer cannot assess any other assessment area of vendor legitimacy for that brand.");
    expect(cleanClientProse("Overwhelming evidence of legitimacy across all evaluated dimensions."))
      .toBe("Overwhelming evidence of legitimacy across all evaluated assessment areas.");
  });

  it("preserves sentence-initial capitalisation", () => {
    expect(cleanClientProse("Dimension not yet available — excluded from scoring"))
      .toBe("Assessment area not yet available — excluded from scoring");
  });
});
