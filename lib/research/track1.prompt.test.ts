import { describe, it, expect } from "vitest";
import { buildTrack1Prompt, parseTrack1Output, SUPPLIER_IDENTITY_KEYS } from "./track1.prompt";

describe("buildTrack1Prompt", () => {
  it("lists the allowed weight_keys + source ids, forbids browsing, requires counter_evidence + confidence", () => {
    const { system, user } = buildTrack1Prompt(
      { vendor_name: "Meridian", vendor_website: "x" },
      [{ source_id: "src_0", url: "u", title: "t", snippet: "s" }],
    );
    expect(system).toMatch(/do not browse/i);
    expect(system).toContain("UNKNOWN");
    expect(system).toMatch(/counter_evidence/);
    expect(system).toMatch(/confidence/);
    expect(system).toMatch(/contact/i); // phone/contact consistency instruction
    expect(SUPPLIER_IDENTITY_KEYS.every((k) => system.includes(k))).toBe(true);
    expect(user).toContain("src_0");
  });
  it("keeps fraud (scam_reports_corroborated) distinct from operational negative_reputation + reseller-scoped scams", () => {
    const { system } = buildTrack1Prompt({ vendor_name: "MotoTec", vendor_website: null }, []);
    expect(system).toMatch(/scam_reports_corroborated/);
    expect(system).toMatch(/multiple independent/i);                 // corroboration requirement
    expect(system).toMatch(/operational|reputational/i);             // route bad-reviews → negative_reputation
    expect(system).toMatch(/third-party reseller|reseller.*not.*vendor|not.*this vendor/i); // reseller-scoped exclusion
  });
});

describe("parseTrack1Output", () => {
  it("parses well-formed items incl. counter_evidence + confidence", () => {
    const out = parseTrack1Output({ evidence_items: [
      { evidence_id: "t1_e1", statement: "x", proposed_weight_key: "government_registration", supporting_source_ids: ["src_0"], mapping_justification: "j", counter_evidence: "None found", certainty: "verified", confidence: "high" },
    ], reasoning_notes: "n", unknowns: [] });
    expect(out.items).toHaveLength(1);
    expect(out.items[0].confidence).toBe("high");
    expect(out.items[0].counter_evidence).toBe("None found");
  });
  it("degrades to empty on malformed JSON (never throws)", () => {
    const out = parseTrack1Output({ _raw: "not json", _parse_error: true });
    expect(out.items).toEqual([]);
    expect(out.reasoning_notes).toMatch(/could not parse/i);
  });
  it("keeps an UNKNOWN proposed key and defaults missing confidence to low", () => {
    const out = parseTrack1Output({ evidence_items: [
      { evidence_id: "t1_e1", statement: "x", proposed_weight_key: "UNKNOWN", supporting_source_ids: [], mapping_justification: "unsure", certainty: "unknown" },
    ] });
    expect(out.items[0].proposed_weight_key).toBe("UNKNOWN");
    expect(out.items[0].confidence).toBe("low");
  });
});
