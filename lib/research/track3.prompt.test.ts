import { describe, it, expect } from "vitest";
import { buildTrack3Prompt, parseTrack3Output, BRAND_RISK_KEYS } from "./track3.prompt";

const src = (id: string) => ({ source_id: id, url: `https://x.example/${id}`, title: "t", snippet: "s" });

describe("Track 3 prompt (analyst-native, ruled veto definitions)", () => {
  const { system, user } = buildTrack3Prompt({ vendor_name: "Acme Corp", brands: ["Bosch"], research_alias: null }, [src("src_0")]);

  it("proposes ONLY the locked brand_risk keys (all 12 in the registry list)", () => {
    expect(BRAND_RISK_KEYS).toHaveLength(12);
    for (const k of BRAND_RISK_KEYS) expect(system).toContain(k);
  });

  it("carries the founder-ruled veto law: recency window, counterfeiter carve-out, absence ≠ policy, boilerplate exclusion", () => {
    expect(system).toContain("24 months");                    // Amendment 1 — both enforcement vetoes
    expect(system).toContain("counterfeiters");               // active_ip_complaints carve-out
    expect(system).toMatch(/absence of retail .* is NOT/i);   // b2b_only_confirmed carve-out
    expect(system).toContain("boilerplate");                  // cease_and_desist carve-out
    expect(system).toMatch(/never .*propose.* from absence|absence of evidence/i); // the spine
  });

  it("states its SUBJECT explicitly (Amendment 2: brand posture; vendor-directed actions are also Track 2's facet)", () => {
    expect(system).toMatch(/subject .*brand'?s posture/i);
    expect(system).toContain("investigated vendor");
  });

  it("demands the analyst quartet", () => {
    for (const f of ["most_likely", "alternative", "what_would_change_my_mind"]) expect(system).toContain(f);
  });

  it("user block names the brands and the vendor as context", () => {
    expect(user).toContain("Bosch");
    expect(user).toContain("Acme Corp");
  });
});

describe("parseTrack3Output (tolerant, H2 semantics)", () => {
  it("parses a valid payload with analyst_reading", () => {
    const p = parseTrack3Output({
      evidence_items: [{ evidence_id: "e1", brand: "Bosch", statement: "s", proposed_weight_key: "reseller_friendly", supporting_source_ids: ["src_0"], mapping_justification: "j", counter_evidence: "None found", certainty: "verified", confidence: "high" }],
      brand_risk_finding: "three-part finding",
      analyst_reading: { most_likely: "a", alternative: "b", confidence: "medium", what_would_change_my_mind: "c" },
      questions_to_ask: [{ question: "q", reason: "r", blocking_weight_key: "map_policy_present", priority: "medium", brand: "Bosch" }],
      reasoning_notes: "n", unknowns: [],
    });
    expect(p.parse_failed).toBeUndefined();
    expect(p.items[0].proposed_weight_key).toBe("reseller_friendly");
    expect(p.analyst_reading?.most_likely).toBe("a");
    expect(p.questions_to_ask[0].brand).toBe("Bosch");
  });

  it("unparseable output → parse_failed (a STATE, never a finding)", () => {
    expect(parseTrack3Output({ _parse_error: true }).parse_failed).toBe(true);
    expect(parseTrack3Output({ totally: "unrelated" }).parse_failed).toBe(true);
  });

  it("tolerates missing analyst_reading (advisory — absence never breaks parsing)", () => {
    const p = parseTrack3Output({ evidence_items: [], brand_risk_finding: "", questions_to_ask: [], reasoning_notes: "", unknowns: [] });
    expect(p.parse_failed).toBeUndefined();
    expect(p.analyst_reading).toBeNull();
  });
});
