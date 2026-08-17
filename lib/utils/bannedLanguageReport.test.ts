import { describe, it, expect } from "vitest";
import { locateBannedLanguage, summariseHits } from "@/lib/utils/bannedLanguageReport";
import { scanFindingsForBannedLanguage } from "@/lib/utils/banned-language";

// ── The locator must agree with the GATE, always. If it ever reports a label the gate does not
// block, the operator is sent to fix something that was never blocking; if it misses one, the
// operator is back to a dead end. Every test below pins one of those two directions. ──

// Verbatim from the 2026-08-17 gate census (abridged in length only) — the real shapes.
const REAL_TRACK2 = {
  brand_relationship_finding:
    "LENOVO — (1) VERIFIED POSITIVES: TD SYNNEX appears on Lenovo's partner locator. PRODUCT LINE SCOPE: Authorization is confirmed across multiple Samsung product lines. (3) WHAT THESE UNKNOWNS DO NOT IMPLY: absence is not evidence against the supplier.",
  auth_level_reasoning: "Regional portals in Indonesia and ANZ confirm authorization.",
  summary: "The pack is thin on Belgium.",
};

describe("the locator agrees with the delivery gate", () => {
  it("finds a hit for every label the gate blocks on, and no label the gate does not block", () => {
    const gate = scanFindingsForBannedLanguage(REAL_TRACK2);
    const found = [...new Set(locateBannedLanguage(REAL_TRACK2, "supply_chain_relationship").map((h) => h.label))];
    expect(found.sort()).toEqual(gate.sort());
  });

  it("clean findings produce no hits at all (the publish path must stay silent when it passes)", () => {
    const clean = {
      brand_relationship_finding: "The dealer locator listing supports current US authorization.",
      questions_to_ask: [{ question: "Can the distributor state which territories its authorization covers?" }],
    };
    expect(scanFindingsForBannedLanguage(clean)).toEqual([]);
    expect(locateBannedLanguage(clean, "supply_chain_relationship")).toEqual([]);
  });
});

describe("what the operator is actually told", () => {
  const hits = locateBannedLanguage(REAL_TRACK2, "supply_chain_relationship");

  it("names the FIELD, not just the record — the thing the old 422 could not do", () => {
    const wheres = hits.map((h) => h.where);
    expect(wheres).toContain("supply_chain_relationship › auth_level_reasoning");
    expect(wheres.some((w) => w.startsWith("supply_chain_relationship › brand_relationship_finding"))).toBe(true);
  });

  it("localises to the offending SENTENCE, not the whole field", () => {
    const h = hits.find((x) => x.where.endsWith("brand_relationship_finding"))!;
    expect(h.sentence).toContain("Authorization is confirmed across multiple Samsung product lines");
    expect(h.sentence).not.toContain("WHAT THESE UNKNOWNS DO NOT IMPLY"); // the clean parts stay out
  });

  it("carries a concrete reword, not a restatement of the ban", () => {
    const h = hits.find((x) => x.label === "confirms/certifies authorization")!;
    expect(h.fix).toMatch(/supports/i);
    expect(h.fix).toMatch(/documented|verified/i);
  });

  it("every rule gets guidance — an unlisted label falls back, never to an empty string", () => {
    const hit = locateBannedLanguage({ headline: "This supplier is fully legitimate." }, "synthesis")[0];
    expect(hit.label).toBe("fully legitimate");
    expect(hit.fix.length).toBeGreaterThan(20);
  });
});

describe("structure walking", () => {
  it("indexes into arrays so the bad question is identifiable among good ones", () => {
    // NOTE the first two strings are NOT hits and must not be reported: a request-voice question is
    // Module 8 doing its mandated job and the gate exempts it. The locator inherits that exemption
    // for free by asking the gate — it never re-implements a rule. The real census hits in this
    // array shape were on the `reason` field, which is our voice, and that is what must surface.
    const qs = [
      { question: "Can you provide the distributor agreement?" },
      { question: "Does the pack confirm authorization for Belgium?", reason: "Regional portals confirm authorization for the US only." },
    ];
    const hits = locateBannedLanguage(qs, "supply_chain_relationship");
    expect(hits).toHaveLength(1);
    expect(hits[0].where).toBe("supply_chain_relationship › [1].reason");
  });

  it("falls back to the field when a rule spans a sentence break (never drops the hit)", () => {
    // The passive rule reaches across the split; no single sentence reproduces it.
    const src = { the_real_risk: "Authorization is\nconfirmed for the US." };
    const hits = locateBannedLanguage(src, "synthesis");
    expect(hits).toHaveLength(1);
    expect(hits[0].sentence).toContain("Authorization is confirmed for the US");
  });

  it("dedupes a label repeated in one field, but keeps the same label in different fields", () => {
    const src = { a: "Regional portals confirm authorization. Other portals confirm authorization.", b: "Dealers confirm authorization." };
    const hits = locateBannedLanguage(src, "t");
    expect(hits.filter((h) => h.where === "t › b")).toHaveLength(1);
    expect(new Set(hits.map((h) => h.where)).size).toBe(2);
  });

  it("summarises for the audit row as label @ location", () => {
    expect(summariseHits(locateBannedLanguage({ x: "Dealers confirm authorization." }, "t")))
      .toBe("confirms/certifies authorization @ t › x");
  });
});
