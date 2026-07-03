import { describe, it, expect } from "vitest";
import { validateWeights, VALIDATION_VERSION } from "./weightValidation";
import type { SourceProfile } from "@/lib/research/source_profile";

const profiles = (m: Record<string, SourceProfile>) => m;
const prop = (evidence_id: string, proposed_weight_key: string, cited_source_ids: string[]) =>
  ({ evidence_id, proposed_weight_key, cited_source_ids });

describe("validateWeights firewall", () => {
  it("stamps validation_version on every record", () => {
    const r = validateWeights({ track: "supplier_identity", sourceProfileById: profiles({ s1: "government_record" }), proposals: [prop("e1", "government_registration", ["s1"])] });
    expect(r[0].validation_version).toBe(VALIDATION_VERSION);
  });
  it("grounding (first): an item citing no valid source id is rejected before any key check", () => {
    const r = validateWeights({ track: "supplier_identity", sourceProfileById: profiles({ s1: "government_record" }), proposals: [prop("e1", "totally_made_up", ["nope"])] });
    expect(r[0].gate).toBe("grounding");
    expect(r[0].rejection_reason).toBe("no_valid_citation");
  });
  it("registry: a key in no registry (but grounded) is rejected", () => {
    const r = validateWeights({ track: "supplier_identity", sourceProfileById: profiles({ s1: "government_record" }), proposals: [prop("e1", "totally_made_up", ["s1"])] });
    expect(r[0].rejection_reason).toBe("registry");
  });
  it("track: a key valid for a DIFFERENT track is rejected with 'track'", () => {
    const r = validateWeights({ track: "supplier_identity", sourceProfileById: profiles({ s1: "government_record" }), proposals: [prop("e1", "dealer_page_listed", ["s1"])] });
    expect(r[0].rejection_reason).toBe("track");
  });
  it("provenance: a forum source cannot earn a government key", () => {
    const r = validateWeights({ track: "supplier_identity", sourceProfileById: profiles({ s1: "forum" }), proposals: [prop("e1", "government_registration", ["s1"])] });
    expect(r[0].rejection_reason).toBe("provenance");
  });
  it("authority skipped for fixed-trust profile: government_record proposal is accepted", () => {
    const r = validateWeights({ track: "supplier_identity", sourceProfileById: profiles({ s1: "government_record" }), proposals: [prop("e1", "government_registration", ["s1"])] });
    expect(r[0].validated_weight_key).toBe("government_registration");
  });
  it("authority evaluated for variable-trust profile: forum negative_reputation (min low) is accepted", () => {
    const r = validateWeights({ track: "supplier_identity", sourceProfileById: profiles({ s1: "forum" }), proposals: [prop("e1", "negative_reputation", ["s1"])] });
    expect(r[0].validated_weight_key).toBe("negative_reputation");
  });

  // ── Corroboration gate — the fraud hard-fail key scam_reports_corroborated must NOT be triggerable by
  // a single low-authority source (MotoTec USA false hard_fail: one Facebook post → hard_fail veto). ──
  it("scam_reports_corroborated with a SINGLE cited source is REJECTED (corroboration gate)", () => {
    const r = validateWeights({ track: "supplier_identity", sourceProfileById: profiles({ s1: "social" }), proposals: [prop("e1", "scam_reports_corroborated", ["s1"])] });
    expect(r[0].validated_weight_key).toBeNull();
    expect(r[0].gate).toBe("corroboration");
    expect(r[0].rejection_reason).toBe("corroboration");
  });
  it("the same source cited twice does NOT satisfy corroboration (needs 2 DISTINCT sources)", () => {
    const r = validateWeights({ track: "supplier_identity", sourceProfileById: profiles({ s1: "social" }), proposals: [prop("e1", "scam_reports_corroborated", ["s1", "s1"])] });
    expect(r[0].gate).toBe("corroboration");
  });
  it("scam_reports_corroborated with TWO distinct valid sources validates (genuinely corroborated)", () => {
    const r = validateWeights({ track: "supplier_identity", sourceProfileById: profiles({ s1: "social", s2: "forum" }), proposals: [prop("e1", "scam_reports_corroborated", ["s1", "s2"])] });
    expect(r[0].validated_weight_key).toBe("scam_reports_corroborated");
  });
  it("the corroboration requirement is scoped to the fraud key — negative_reputation still validates from one source", () => {
    const r = validateWeights({ track: "supplier_identity", sourceProfileById: profiles({ s1: "social" }), proposals: [prop("e1", "negative_reputation", ["s1"])] });
    expect(r[0].validated_weight_key).toBe("negative_reputation");
  });
  it("UNKNOWN short-circuits to llm_returned_unknown (gate null)", () => {
    const r = validateWeights({ track: "supplier_identity", sourceProfileById: profiles({ s1: "government_record" }), proposals: [prop("e1", "UNKNOWN", ["s1"])] });
    expect(r[0].rejection_reason).toBe("llm_returned_unknown");
    expect(r[0].gate).toBeNull();
  });
  it("contradiction equal-authority: two whois domain-age buckets reject BOTH", () => {
    const r = validateWeights({
      track: "supplier_identity",
      sourceProfileById: profiles({ s1: "whois", s2: "whois" }),
      proposals: [prop("e1", "domain_age_5_plus", ["s1"]), prop("e2", "domain_age_2_5", ["s2"])],
    });
    expect(r.every((x) => x.validated_weight_key === null)).toBe(true);
    expect(r.every((x) => x.rejection_reason === "contradiction_equal_authority")).toBe(true);
  });
  it("contradiction hard_fail vs positive on same source: hard_fail wins", () => {
    const r = validateWeights({
      track: "supplier_identity",
      sourceProfileById: profiles({ s1: "government_record" }),
      proposals: [prop("e1", "government_registration", ["s1"]), prop("e2", "registration_fabricated", ["s1"])],
    });
    expect(r.find((x) => x.validated_weight_key)?.validated_weight_key).toBe("registration_fabricated");
    expect(r.find((x) => x.proposed_weight_key === "government_registration")?.rejection_reason).toBe("contradiction");
  });
  it("dedupes identical proposals (same key + same source)", () => {
    const r = validateWeights({
      track: "supplier_identity",
      sourceProfileById: profiles({ s1: "government_record" }),
      proposals: [prop("e1", "government_registration", ["s1"]), prop("e2", "government_registration", ["s1"])],
    });
    expect(r.filter((x) => x.validated_weight_key === "government_registration")).toHaveLength(1);
  });
});

describe("validateWeights — Track 2 (supply_chain_relationship)", () => {
  it("official_brand earns dealer_page_listed", () => {
    const r = validateWeights({ track: "supply_chain_relationship", sourceProfileById: profiles({ s1: "official_brand" }), proposals: [prop("e1", "dealer_page_listed", ["s1"])] });
    expect(r[0].validated_weight_key).toBe("dealer_page_listed");
    expect(r[0].rejection_reason).toBeNull();
  });
  it("a forum source cannot earn dealer_page_listed (provenance)", () => {
    const r = validateWeights({ track: "supply_chain_relationship", sourceProfileById: profiles({ s1: "forum" }), proposals: [prop("e1", "dealer_page_listed", ["s1"])] });
    expect(r[0].rejection_reason).toBe("provenance");
  });
  it("a Track 1 key is rejected on the Track 2 registry (track gate)", () => {
    const r = validateWeights({ track: "supply_chain_relationship", sourceProfileById: profiles({ s1: "government_record" }), proposals: [prop("e1", "government_registration", ["s1"])] });
    expect(r[0].rejection_reason).toBe("track");
  });
  it("grey_market_signals accepts a forum source (variable-trust)", () => {
    const r = validateWeights({ track: "supply_chain_relationship", sourceProfileById: profiles({ s1: "forum" }), proposals: [prop("e1", "grey_market_signals", ["s1"])] });
    expect(r[0].validated_weight_key).toBe("grey_market_signals");
  });
  it("loa_legitimate has NO Track 2 provenance config → firewall-rejected (LOA never scores in Track 2; ADR-T2-001)", () => {
    const r = validateWeights({ track: "supply_chain_relationship", sourceProfileById: profiles({ s1: "official_brand" }), proposals: [prop("e1", "loa_legitimate", ["s1"])] });
    expect(r[0].validated_weight_key).toBeNull();
    expect(r[0].rejection_reason).toBe("provenance");
  });
  it("dealer_page_listed accepts official_brand but REJECTS a vendor self-claim (official_company)", () => {
    const brand = validateWeights({ track: "supply_chain_relationship", sourceProfileById: profiles({ s1: "official_brand" }), proposals: [prop("e1", "dealer_page_listed", ["s1"])] });
    expect(brand[0].validated_weight_key).toBe("dealer_page_listed");
    const vendor = validateWeights({ track: "supply_chain_relationship", sourceProfileById: profiles({ s1: "official_company" }), proposals: [prop("e1", "dealer_page_listed", ["s1"])] });
    expect(vendor[0].rejection_reason).toBe("provenance"); // vendor self-claim is NOT a dealer-page listing
  });
  it("provenance gate accepts when a LOWER-authority cited source matches (the v1.1.0 per-source fix)", () => {
    // trade_press_connection allows news (medium); item cites registry (high, NOT allowed) + news (medium, allowed).
    // Old highest-authority-only logic picked registry → rejected; per-source logic accepts via news.
    const r = validateWeights({ track: "supply_chain_relationship", sourceProfileById: profiles({ s1: "registry", s2: "news" }), proposals: [prop("e1", "trade_press_connection", ["s1", "s2"])] });
    expect(r[0].validated_weight_key).toBe("trade_press_connection");
  });
  it("no_connection_found accepts an official source it examined (absence finding cites what it checked)", () => {
    const r = validateWeights({ track: "supply_chain_relationship", sourceProfileById: profiles({ s1: "official_brand" }), proposals: [prop("e1", "no_connection_found", ["s1"])] });
    expect(r[0].validated_weight_key).toBe("no_connection_found");
  });
});
