import { describe, it, expect } from "vitest";
import { buildTrack2Prompt, parseTrack2Output, SUPPLY_CHAIN_KEYS } from "./track2.prompt";

describe("buildTrack2Prompt", () => {
  const { system, user } = buildTrack2Prompt(
    { vendor_name: "TD Synnex", brands: ["Lenovo", "Bosch"] },
    [{ source_id: "src_0", url: "u", title: "t", snippet: "s" }],
  );
  it("forbids browsing and lists the 9 Track 2 keys (loa_legitimate excluded)", () => {
    expect(system).toMatch(/do not browse/i);
    expect(SUPPLY_CHAIN_KEYS.every((k) => system.includes(k))).toBe(true);
    expect(system).not.toContain("loa_legitimate");
  });
  it("carries brand-isolation, LOA-exclusion, B2B, and UNKNOWN instructions", () => {
    expect(system).toMatch(/brand isolation/i);
    expect(system).toMatch(/LOA/);
    expect(system).toMatch(/B2B/i);
    expect(system).toContain("UNKNOWN");
  });
  it("generalizes B2B (no hard-coded brand examples) and carries the refinement rules", () => {
    expect(system).not.toMatch(/Milwaukee|Dell|Nike/);
    expect(system).toMatch(/DIRECT vs INDIRECT/i);
    expect(system).toMatch(/GEOGRAPHIC SCOPE/i);
    expect(system).toMatch(/MARKETPLACE RESTRICTIONS/i);
    expect(system).toMatch(/PRESERVE CONTRADICTIONS/i);
    expect(system).toMatch(/sufficient public evidence/i);
  });
  it("lists each submitted brand for separate analysis", () => {
    expect(user).toContain("Lenovo");
    expect(user).toContain("Bosch");
    expect(user).toContain("src_0");
  });
  it("ADR-T2-002: carries lane discipline, three-part structure, per-brand naming, and the procurement prohibition", () => {
    expect(system).toContain("brand_relationship_finding");
    expect(system).toMatch(/do not assess.*(legitimacy|identity)/i);        // legitimacy lane handed off
    expect(system).toMatch(/confirmed positives/i);                          // positives-first
    expect(system).toMatch(/what those unknowns do not imply/i);             // three-part structure
    expect(system).toMatch(/name each (submitted )?brand/i);                 // per-brand naming
    expect(system).toMatch(/never.*(recommend|imply).*(buy|purchase)/i);     // no purchase recommendation
    expect(system).toMatch(/questions_to_ask.*brand|brand.*questions_to_ask/i); // brand on questions
  });
  it("hard-requires a brand-tagged question for every stated unknown (no zero-question cases with open gaps)", () => {
    expect(system).toMatch(/for each remaining unknown/i);
    expect(system).toMatch(/emit a corresponding questions_to_ask/i);
    expect(system).toMatch(/never return an empty questions_to_ask/i);
  });
  it("ADR-T2-002 (D2): tells the model the identity is already resolved so it does not re-litigate it", () => {
    const p = buildTrack2Prompt(
      { vendor_name: "TD Synexx", brands: ["Microsoft"], identity: { confidence: "high", resolved_name: "TD SYNNEX Corporation" } },
      [{ source_id: "src_0", url: "u", title: "t", snippet: "s" }],
    );
    expect(p.user).toMatch(/identity.*(resolved|settled)/i);
    expect(p.user).toContain("high");
  });
});

describe("parseTrack2Output", () => {
  it("parses brand-isolated items + rich questions + advisory fields", () => {
    const out = parseTrack2Output({
      evidence_items: [
        { evidence_id: "t2_e1", brand: "Lenovo", statement: "x", proposed_weight_key: "dealer_page_listed", supporting_source_ids: ["src_0"], mapping_justification: "j", counter_evidence: "None found", certainty: "verified", confidence: "high" },
      ],
      auth_level: "A", auth_level_reasoning: "on dealer page", b2b_only_detected: true, b2b_only_brands: ["Lenovo"],
      questions_to_ask: [{ question: "Can you confirm your Lenovo distribution?", reason: "no direct confirmation", blocking_weight_key: "dealer_page_listed", priority: "high" }],
      reasoning_notes: "n", unknowns: [],
    });
    expect(out.items).toHaveLength(1);
    expect(out.items[0].brand).toBe("Lenovo");
    expect(out.auth_level).toBe("A");
    expect(out.b2b_only_brands).toEqual(["Lenovo"]);
    expect(out.questions_to_ask[0].blocking_weight_key).toBe("dealer_page_listed");
    expect(out.questions_to_ask[0].priority).toBe("high");
  });
  it("defaults question priority to medium when absent", () => {
    const out = parseTrack2Output({ evidence_items: [], questions_to_ask: [{ question: "q", reason: "r", blocking_weight_key: "k" }] });
    expect(out.questions_to_ask[0].priority).toBe("medium");
  });
  it("ADR-T2-002: parses brand_relationship_finding and per-question brand", () => {
    const out = parseTrack2Output({
      evidence_items: [],
      brand_relationship_finding: "Lenovo: confirmed authorized distributor. Bosch: no verified relationship — additional verification required.",
      questions_to_ask: [
        { question: "Confirm Bosch authorization?", reason: "r", blocking_weight_key: "k", priority: "high", brand: "Bosch" },
        { question: "Vendor-level q", reason: "r", blocking_weight_key: "k" }, // no brand → defaults ""
      ],
    });
    expect(out.brand_relationship_finding).toContain("Lenovo");
    expect(out.questions_to_ask[0].brand).toBe("Bosch");
    expect(out.questions_to_ask[1].brand).toBe("");
  });
  it("degrades to empty on malformed JSON (never throws)", () => {
    const out = parseTrack2Output({ _parse_error: true });
    expect(out.items).toEqual([]);
    expect(out.auth_level).toBeNull();
    expect(out.reasoning_notes).toMatch(/could not parse/i);
  });
  it("drops malformed questions (no question text under any key)", () => {
    const out = parseTrack2Output({ evidence_items: [], questions_to_ask: [{ reason: "x" }, { question: "ok" }] });
    expect(out.questions_to_ask).toHaveLength(1);
  });
  it("TOLERATES string-shaped questions (never silently drops actionable gaps)", () => {
    const out = parseTrack2Output({ evidence_items: [], questions_to_ask: ["Confirm the SupplyOn portal listing for Bosch?", "Verify the Bosch sub-brand list?"] });
    expect(out.questions_to_ask).toHaveLength(2);
    expect(out.questions_to_ask[0].question).toContain("SupplyOn");
    expect(out.questions_to_ask[0].brand).toBe("");
    expect(out.questions_to_ask[0].priority).toBe("medium");
  });
  it("TOLERATES the alternate {text, why} object shape", () => {
    const out = parseTrack2Output({ evidence_items: [], questions_to_ask: [{ text: "Confirm distributor chain?", why: "no direct evidence", brand: "Bosch" }] });
    expect(out.questions_to_ask).toHaveLength(1);
    expect(out.questions_to_ask[0].question).toBe("Confirm distributor chain?");
    expect(out.questions_to_ask[0].reason).toBe("no direct evidence");
    expect(out.questions_to_ask[0].brand).toBe("Bosch");
  });
});

describe("H2 — parse_failed flag (Track 2)", () => {
  it("marks parse failure explicitly on _parse_error and invalid shapes", () => {
    expect(parseTrack2Output({ _parse_error: true }).parse_failed).toBe(true);
    expect(parseTrack2Output(null).parse_failed).toBe(true);
  });
  it("does NOT mark a valid-but-empty response as failed", () => {
    expect(parseTrack2Output({ evidence_items: [], reasoning_notes: "n", unknowns: [] }).parse_failed).toBeUndefined();
  });
});
