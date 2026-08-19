import { describe, it, expect } from "vitest";
import {
  stripInternalRefs, stripInternalRefsDeep, isClientQuestion, projectClientReport,
  substituteInternalDimensionNames, dropSourceDisposalSentences, cleanClientProse,
  dropBankCoordinateSentences, cleanClientFindingJson,
} from "./clientReport";

// ── CLIENT REPORT PROJECTION (full-build brief §2) — the Decision Snapshot finally reaches the
// client, through a projection that (a) filters M8 on STRUCTURE, not a blocklist, and (b) strips
// internal evidence references (src_N / E01 / EV-005) that are known to leak into narrative prose.

describe("stripInternalRefs — internal evidence tokens never reach a client surface", () => {
  it("removes a single src_N parenthetical", () => {
    expect(stripInternalRefs("explicitly uses the title 'Lenovo Authorized Distributor' (src_40)."))
      .toBe("explicitly uses the title 'Lenovo Authorized Distributor'.");
  });

  it("removes grouped evidence ids (E04, E05)", () => {
    expect(stripInternalRefs("blocking reports (E04, E05) indicate restrictions."))
      .toBe("blocking reports indicate restrictions.");
  });

  it("removes EV-NNN ranges with 'through'", () => {
    expect(stripInternalRefs("Every US-facing locator reviewed omits TD SYNNEX (EV-011 through EV-014)."))
      .toBe("Every US-facing locator reviewed omits TD SYNNEX.");
  });

  it("removes mixed groups with 'and'", () => {
    expect(stripInternalRefs("documented enforcement (E10 and E11) exists."))
      .toBe("documented enforcement exists.");
  });

  it("leaves genuine parentheticals alone", () => {
    const s = "Bosch divisions (e.g., Power Tools, Home Appliances, HVAC) vary.";
    expect(stripInternalRefs(s)).toBe(s);
    const s2 = "publicly traded (NYSE: SNX) distributor";
    expect(stripInternalRefs(s2)).toBe(s2);
  });

  it("leaves prose years and plain numbers alone", () => {
    const s = "incorporated 2003 as SYNNEX Corp (2026 filing pending).";
    expect(stripInternalRefs(s)).toBe(s);
  });

  it("normalizes doubled spaces left behind", () => {
    expect(stripInternalRefs("a (src_1) b")).toBe("a b");
  });
});

describe("stripInternalRefsDeep — the per-area findings path (founder ruling 2026-08-13: client side only)", () => {
  it("strips every string value in a projected findings object, including nested arrays", () => {
    const projected = {
      summary: "Confirmed via portal (src_40).",
      brand_risk_finding: "Enforcement documented (E10, E11).",
      identity_scope_note: "Assessed separately (EV-005).",
      evidence_count: 7,
    };
    expect(stripInternalRefsDeep(projected)).toEqual({
      summary: "Confirmed via portal.",
      brand_risk_finding: "Enforcement documented.",
      identity_scope_note: "Assessed separately.",
      evidence_count: 7,
    });
  });

  it("strips strings inside arrays of objects (questions_to_ask shape)", () => {
    const v = stripInternalRefsDeep({ qs: [{ question: "Confirm the LOA (src_3)?", reason: "See (E01)." }] }) as {
      qs: { question: string; reason: string }[];
    };
    expect(v.qs[0]).toEqual({ question: "Confirm the LOA?", reason: "See." });
  });

  it("leaves null and non-string values untouched", () => {
    expect(stripInternalRefsDeep(null)).toBeNull();
    expect(stripInternalRefsDeep({ a: 3, b: true })).toEqual({ a: 3, b: true });
  });
});

// ── FOUNDER RULING 2026-08-13 (ratified): Rule 1 — source-disposal sentence filter; Rule 2 —
// track-name SUBSTITUTION (never deletion). Rule 3 (method-discipline narration) LEFT ALONE.
describe("Rule 2 — substituteInternalDimensionNames (substitute, never delete)", () => {
  it("substitutes the ruled example: out of scope for Track 2", () => {
    expect(substituteInternalDimensionNames("Any such assessment is out of scope for Track 2."))
      .toBe("Any such assessment is out of scope for the Supply-Chain Relationship assessment.");
  });

  it("covers every internal dimension number, not only those seen so far", () => {
    expect(substituteInternalDimensionNames("Track 1 confirmed it")).toBe("the Supplier Legitimacy assessment confirmed it");
    expect(substituteInternalDimensionNames("a Track 3 concern")).toBe("a Brand Risk concern");
  });

  it("article-preceded references substitute the bare area name — no doubled article, nothing deleted", () => {
    expect(substituteInternalDimensionNames("this is a Track 2 brand-affiliation data point, not a vendor identity finding"))
      .toBe("this is a Supply-Chain Relationship brand-affiliation data point, not a vendor identity finding");
  });

  it("substitutes snake_case dimension names (M9 prose carries documentation_review)", () => {
    expect(substituteInternalDimensionNames("The documentation_review dimension was not assessed in this evaluation."))
      .toBe("The Documentation Review dimension was not assessed in this evaluation.");
    expect(substituteInternalDimensionNames("per supply_chain_relationship and brand_risk_assessment"))
      .toBe("per Supply-Chain Relationship and Brand Risk");
  });

  it("covers Track 0 / 0.5 / 4 / 5 / 6", () => {
    expect(substituteInternalDimensionNames("Track 0.5 resolved it; Track 0 accepted it; Track 4 read it; Track 5 checked it; Track 6 flagged it."))
      .toBe("supplier identity resolution resolved it; intake accepted it; the Documentation Review assessment read it; the Sourcing Logic check checked it; the category compliance review flagged it.");
  });

  it("never touches ordinary prose or the word Track in shipping contexts", () => {
    const s = "Track your case in your portal.";
    expect(substituteInternalDimensionNames(s)).toBe(s);
  });
});

describe("Rule 1 — dropSourceDisposalSentences (the AWI-2607-031 disposal log)", () => {
  const log =
    "The Gazzetta Ufficiale source returned no extractable content and was not used. " +
    "The Gandelli SRL source is an unrelated entity and was not used. " +
    "The Trustpilot source concerns a different company and was excluded.";

  it("drops all three disposal sentences from the live example", () => {
    expect(dropSourceDisposalSentences(`${log} The registry filing confirms the entity.`))
      .toBe("The registry filing confirms the entity.");
  });

  it("keeps findings prose that merely mentions sources", () => {
    const s = "Evidence across government registrations, SEC filings, and BBB profiles confirms the entity. Primary sources were weighted most heavily.";
    expect(dropSourceDisposalSentences(s)).toBe(s);
  });

  it("keeps Rule-3 method-discipline narration (ruled: leave alone)", () => {
    const s = "Homonym discipline was applied: all Bosch sources were verified to concern Robert Bosch GmbH or its subsidiaries, not an unrelated entity.";
    expect(dropSourceDisposalSentences(s)).toBe(s);
  });

  it("empty result when the whole text is a disposal log", () => {
    expect(dropSourceDisposalSentences(log)).toBe("");
  });
});

describe("cleanClientProse — the composed client-projection pass (strip refs → substitute → drop disposal)", () => {
  it("cleans the full AWI-2607-031 shape end to end", () => {
    const raw =
      "Gandelli S.R.L. is registered in Brescia (src_2). " +
      "The Gazzetta Ufficiale source (src_8) returned no extractable content and was not used. " +
      "This is a Track 2 brand-affiliation data point, not a vendor identity finding.";
    expect(cleanClientProse(raw)).toBe(
      "Gandelli S.R.L. is registered in Brescia. " +
      "This is a Supply-Chain Relationship brand-affiliation data point, not a vendor identity finding.",
    );
  });
});

describe("stub-headline guard + bank-coordinate filter (founder-approved 2026-08-14)", () => {
  it("a stub/short headline is treated as absent — the Summary fallback renders", () => {
    const r = projectClientReport({ headline: "stub", the_real_risk: "", leading_interpretation: "", what_to_verify: [], what_to_monitor: [] }, [], [])!;
    expect(r.headline).toBe("");
  });

  it("a real headline passes untouched and untruncated", () => {
    const h = "Supplier verified for one brand; authorization for the second is unconfirmed. — subject to verification";
    const r = projectClientReport({ headline: h, what_to_monitor: [] }, [], [])!;
    expect(r.headline).toBe(h);
  });

  it("drops the AWI-2607-031 bank-coordinate sentence, keeps the findings around it", () => {
    const t = "The stated grand total is arithmetically consistent with the line items. Bank payment details (IBAN IT06Y0810234870000000002609, Cassa Rurale Valsugana e Tesino) are provided. One branded product is present.";
    expect(dropBankCoordinateSentences(t)).toBe("The stated grand total is arithmetically consistent with the line items. One branded product is present.");
  });

  it("cleanClientFindingJson applies the bank filter ONLY to Documentation Review", () => {
    const j = { summary: "Payment details (IBAN IT06Y0810234870000000002609) are provided. The rest stands here." };
    const doc = cleanClientFindingJson(j, "documentation_review") as { summary: string };
    const brand = cleanClientFindingJson(j, "brand_risk_assessment") as { summary: string };
    expect(doc.summary).toBe("The rest stands here.");
    expect(brand.summary).toContain("IBAN");
  });
});

describe("isClientQuestion — STRUCTURAL filter, no blocklist", () => {
  it("keeps a real question", () => {
    expect(isClientQuestion("Can you provide a current Bosch-issued authorization letter?")).toBe(true);
  });

  it("drops the AWI-2607-022 leak: an internal status line with no question mark", () => {
    expect(isClientQuestion("documentation_review: no documents were provided for review")).toBe(false);
  });

  it("drops empty / whitespace entries", () => {
    expect(isClientQuestion("")).toBe(false);
    expect(isClientQuestion("   ")).toBe(false);
  });
});

describe("projectClientReport — the exact field list that crosses, nothing else", () => {
  const snapshot = {
    headline: "Headline with a ref (EV-005) inside. — subject to verification of X",
    the_real_risk: "The operative risk (E08, E09) is real.",
    leading_interpretation: "Reading cites (src_40) and (EV-010).",
    what_to_verify: ["Q one?", "documentation_review: no documents were provided for review"],
    what_to_monitor: ["Watch the MAP documents (E08, E09) for changes."],
    // a field that must NOT cross:
    internal_extra: "never",
  };

  it("carries exactly headline / real risk / leading interpretation / monitor / questions", () => {
    const r = projectClientReport(snapshot, ["Q one?", "documentation_review: no documents were provided for review"], [])!;
    expect(Object.keys(r).sort()).toEqual(["headline", "leading_interpretation", "questions", "the_real_risk", "what_to_monitor"]);
  });

  it("strips internal refs from every prose field, keeps the load-bearing headline qualifier untruncated", () => {
    const r = projectClientReport(snapshot, [], [])!;
    expect(r.headline).toBe("Headline with a ref inside. — subject to verification of X");
    expect(r.the_real_risk).toBe("The operative risk is real.");
    // ⚠ EXPECTATION CHANGED 2026-08-18 (§1, founder-ruled "grammar must survive the strip").
    // Was "Reading cites and." — the stranded connector is now repaired. The residue itself is
    // NOT dropped: telling this two-word wreck from the real two-word finding "Enforcement
    // documented." needs grammar analysis the cleaner deliberately does not do, and deleting a
    // client's finding is the worse of the two errors. The engine's imperfection stands.
    expect(r.leading_interpretation).toBe("Reading cites.");
    expect(r.what_to_monitor).toEqual(["Watch the MAP documents for changes."]);
  });

  it("filters M8 structurally and merges analyst-added questions source-tagged", () => {
    const r = projectClientReport(snapshot, ["Q one?", "documentation_review: no documents were provided for review"], [
      { question: "Analyst asks this too?", source: "additional" },
    ])!;
    expect(r.questions).toEqual([
      { question: "Q one?", source: "system" },
      { question: "Analyst asks this too?", source: "additional" },
    ]);
  });

  it("null snapshot → null", () => {
    expect(projectClientReport(null, [], [])).toBeNull();
  });
});
