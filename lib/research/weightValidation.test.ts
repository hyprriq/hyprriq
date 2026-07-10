import { describe, it, expect } from "vitest";
import { validateWeights, VALIDATION_VERSION } from "./weightValidation";
import { deriveTrackSignal } from "./signals";
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

  // ── H7 (SO-2, firewall 1.3.0) — corroboration breadth: EVERY irreversible-veto key with
  // variable-trust profiles joins the ≥2-distinct-sources class. Two-sided per the standing rule:
  // the false-positive kill AND the true-positive survival are both locked. ──
  it("H7: single-source website_fraudulent is REJECTED at the corroboration gate", () => {
    const r = validateWeights({ track: "supplier_identity", sourceProfileById: profiles({ s1: "news" }), proposals: [prop("e1", "website_fraudulent", ["s1"])] });
    expect(r[0]).toMatchObject({ validated_weight_key: null, gate: "corroboration", rejection_reason: "corroboration" });
  });
  it("H7: website_fraudulent with TWO distinct valid sources validates AND still hard-fails", () => {
    const v = validateWeights({ track: "supplier_identity", sourceProfileById: profiles({ s1: "news", s2: "forum" }), proposals: [prop("e1", "website_fraudulent", ["s1", "s2"])] });
    expect(v[0].validated_weight_key).toBe("website_fraudulent");
    const found = v.filter((x) => x.validated_weight_key).map((x) => x.validated_weight_key as string);
    expect(deriveTrackSignal("supplier_identity", found).signal).toBe("hard_fail");
  });
  it("H7: single-source address_fraudulent is REJECTED at the corroboration gate", () => {
    const r = validateWeights({ track: "supplier_identity", sourceProfileById: profiles({ s1: "government_record" }), proposals: [prop("e1", "address_fraudulent", ["s1"])] });
    expect(r[0]).toMatchObject({ validated_weight_key: null, gate: "corroboration", rejection_reason: "corroboration" });
  });
  it("H7: address_fraudulent with TWO distinct valid sources validates AND still hard-fails", () => {
    const v = validateWeights({ track: "supplier_identity", sourceProfileById: profiles({ s1: "government_record", s2: "registry" }), proposals: [prop("e1", "address_fraudulent", ["s1", "s2"])] });
    expect(v[0].validated_weight_key).toBe("address_fraudulent");
    const found = v.filter((x) => x.validated_weight_key).map((x) => x.validated_weight_key as string);
    expect(deriveTrackSignal("supplier_identity", found).signal).toBe("hard_fail");
  });
  // ── Track 3 (SO-2, firewall 1.4.0, founder-corrected): ALL FOUR brand-risk vetoes require ≥2
  // distinct valid sources — including confirmed_amazon_restrictions (the single-source exception
  // was REVERSED: without Keepa, Track 3 cannot OBSERVE a gated listing, only read claims about
  // one; one confident listicle must never fire a do_not_rely-class veto). Two-sided per key. ──
  const T3_VETOES: [string, SourceProfile, SourceProfile][] = [
    ["active_ip_complaints", "news", "government_record"],
    ["cease_and_desist_distributed", "news", "forum"],
    ["confirmed_amazon_restrictions", "marketplace", "news"],
    ["b2b_only_confirmed", "official_brand", "official_brand"],
  ];
  for (const [key, p1, p2] of T3_VETOES) {
    it(`Track 3: single-source ${key} is REJECTED at the corroboration gate`, () => {
      const r = validateWeights({ track: "brand_risk_assessment", sourceProfileById: profiles({ s1: p1 }), proposals: [prop("e1", key, ["s1"])] });
      expect(r[0]).toMatchObject({ validated_weight_key: null, gate: "corroboration", rejection_reason: "corroboration" });
    });
    it(`Track 3: ${key} with TWO distinct valid sources validates AND hard-fails`, () => {
      const v = validateWeights({ track: "brand_risk_assessment", sourceProfileById: profiles({ s1: p1, s2: p2 }), proposals: [prop("e1", key, ["s1", "s2"])] });
      expect(v[0].validated_weight_key).toBe(key);
      const found = v.filter((x) => x.validated_weight_key).map((x) => x.validated_weight_key as string);
      expect(deriveTrackSignal("brand_risk_assessment", found).signal).toBe("hard_fail");
    });
  }
  it("Track 3: positive/soft keys validate single-source (corroboration scoped to the vetoes)", () => {
    const r = validateWeights({ track: "brand_risk_assessment", sourceProfileById: profiles({ s1: "official_brand", s2: "news" }), proposals: [
      prop("e1", "reseller_friendly", ["s1"]),
      prop("e2", "brand_enforcement_signals", ["s2"]),
    ] });
    expect(r[0].validated_weight_key).toBe("reseller_friendly");
    expect(r[1].validated_weight_key).toBe("brand_enforcement_signals");
  });

  // POSITIVE PATH — the conservative corroboration gate must NOT over-reject a GENUINE fraud vendor:
  // 2 corroborating sources → scam_reports_corroborated validates AND still drives a hard_fail verdict.
  it("genuine fraud (2 corroborating sources) validates scam_reports_corroborated AND still hard-fails", () => {
    const v = validateWeights({ track: "supplier_identity", sourceProfileById: profiles({ s1: "social", s2: "news" }), proposals: [prop("e1", "scam_reports_corroborated", ["s1", "s2"])] });
    expect(v[0].validated_weight_key).toBe("scam_reports_corroborated");
    const found = v.filter((x) => x.validated_weight_key).map((x) => x.validated_weight_key as string);
    expect(deriveTrackSignal("supplier_identity", found).signal).toBe("hard_fail");
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
