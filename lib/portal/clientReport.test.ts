import { describe, it, expect } from "vitest";
import { stripInternalRefs, isClientQuestion, projectClientReport } from "./clientReport";

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
    expect(r.leading_interpretation).toBe("Reading cites and."); // refs gone; prose imperfection is the engine's, not invented
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
