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

  // ── RULING 1 (founder, 2026-07-11) — the fidelity pass, each line locked: ──
  it("A1: recency is an OPERATION — date check, ongoing exception, NAMED downgrade target on BOTH enforcement vetoes, undated = outside", () => {
    expect(system).toMatch(/check each cited source'?s date/i);
    expect(system).toContain("not documented as ongoing");
    const demotions = system.match(/brand_enforcement_signals at most/g) ?? [];
    expect(demotions.length).toBeGreaterThanOrEqual(2); // both veto rows name the target (was loose: "downgrade")
    expect(system).toMatch(/undated/i);
  });
  it("A2/H5: own-voice vocabulary ban — guarantee/risk-free/brand-approved/safe never in our voice", () => {
    expect(system).toContain("'guarantee', 'risk-free', 'brand-approved'");
  });
  it("A3: authorization framing stripped — Track 3 never confirms or denies authorization", () => {
    expect(system).toMatch(/never (confirm|frame|deny)[\s\S]*authoriz/i);
    expect(system).toContain("AUTHORIZATION IS NOT YOUR QUESTION");
  });
  it("A4: every proposal echoes its subject — brand + facet in mapping_justification", () => {
    expect(system).toContain("brand-posture facet");
    expect(system).toMatch(/mapping_justification[\s\S]{0,40}NAME the brand/i);
  });
  it("A5: worked near-miss examples land in UNKNOWN (or the named downgrade)", () => {
    expect(system).toContain("WORKED EXAMPLES");
    expect(system).toMatch(/counterfeit/i);
    expect(system).toContain("reserve the right");
    expect(system).toMatch(/no retail or marketplace presence/i);
  });
  it("fresh-eyes: homonym discipline — a name match alone is not the brand", () => {
    expect(system).toContain("HOMONYM DISCIPLINE");
    expect(system).toContain("a name match alone is not the brand");
  });
  it("fresh-eyes: Keepa keys require marketplace-history DATA — commentary about history is not it", () => {
    expect(system).toMatch(/commentary about price or seller history is not that data/i);
  });
  it("clarity: confirmed_amazon_restrictions is present-tense — the artifact exists NOW", () => {
    expect(system).toMatch(/OBSERVABLY exists now/i);
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
