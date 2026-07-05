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
  it("website_fraudulent is VENDOR-legitimacy only — not brand affiliation / name-vs-website mismatch", () => {
    const { system } = buildTrack1Prompt({ vendor_name: "Bosch", vendor_website: "globaldist.com" }, []);
    expect(system).toMatch(/deception about the vendor/i);                       // vendor-scope, not brand
    expect(system).toMatch(/impersonates a different real company/i);           // impersonation = posing as another co
    expect(system).toMatch(/unconfirmed brand affiliation is never vendor fraud/i); // the principle
    expect(system).toMatch(/data-entry|identity[- ]resolution/i);              // name≠website → identity discrepancy
    expect(system).toMatch(/vendor identity holds/i);                          // real operating site → pass on identity
    expect(system).toMatch(/Track 2\/Track 3|Track 2\/3/);                     // affiliation is Track 2/3's lane
  });
  it("registration_fabricated requires AFFIRMATIVE fabrication evidence — not-found/inactive/other-entity → UNKNOWN", () => {
    const { system } = buildTrack1Prompt({ vendor_name: "Acme", vendor_website: null }, []);
    expect(system).toMatch(/registration_fabricated/);
    expect(system).toMatch(/nonexistent|forged|contradicted/i);      // affirmative fabrication only
    expect(system).toMatch(/not found|cannot verify/i);              // absence → UNKNOWN
    expect(system).toMatch(/dissolved|inactive/i);                   // dissolved-but-real → not fabricated
    expect(system).toMatch(/parent|dba|different.*entity/i);         // different/parent/DBA → not fabricated
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

describe("H2 — parse_failed flag (model failure is a state, never empty findings)", () => {
  it("marks parse failure explicitly on _parse_error", () => {
    expect(parseTrack1Output({ _parse_error: true }).parse_failed).toBe(true);
  });
  it("marks parse failure on structurally invalid output (null / missing evidence_items)", () => {
    expect(parseTrack1Output(null).parse_failed).toBe(true);
    expect(parseTrack1Output({ reasoning_notes: "hi" }).parse_failed).toBe(true);
  });
  it("does NOT mark a valid-but-empty response as failed (legitimate found-nothing)", () => {
    expect(parseTrack1Output({ evidence_items: [], reasoning_notes: "nothing found", unknowns: [] }).parse_failed).toBeUndefined();
  });
});
