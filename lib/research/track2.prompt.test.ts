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
  it("degrades to empty on malformed JSON (never throws)", () => {
    const out = parseTrack2Output({ _parse_error: true });
    expect(out.items).toEqual([]);
    expect(out.auth_level).toBeNull();
    expect(out.reasoning_notes).toMatch(/could not parse/i);
  });
  it("drops malformed questions (missing question text)", () => {
    const out = parseTrack2Output({ evidence_items: [], questions_to_ask: [{ reason: "x" }, { question: "ok" }] });
    expect(out.questions_to_ask).toHaveLength(1);
  });
});
