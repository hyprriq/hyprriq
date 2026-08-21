import { describe, it, expect } from "vitest";
import { validateWeights } from "./weightValidation";
import type { ProposedMapping } from "./weightValidation";
import type { SourceProfile } from "@/lib/research/source_profile";

// ── GATE ⑧ — POLARITY (firewall v1.8.0, founder-ruled 2026-08-21). Every fixture below is a shape
// the polarity census MEASURED in the stored corpus (docs/POLARITY_CENSUS_2026-08-21.md) — plus the
// shapes deliberately NOT in mind when the gate was drafted (the absence-semantics keys, the
// undeclared fallback, the veto keys). The gate is a CONSISTENCY check: it rejects only when the
// model's own declaration contradicts its key's sign or subject. Undeclared skips — the schema-less
// fallback parse must never zero a track.

const profiles = (m: Record<string, SourceProfile>) => m;
const prop = (
  evidence_id: string, proposed_weight_key: string, cited_source_ids: string[],
  decl?: { polarity?: ProposedMapping["declared_polarity"]; subject?: boolean },
): ProposedMapping => ({
  evidence_id, proposed_weight_key, cited_source_ids,
  declared_polarity: decl?.polarity, declared_subject_is_target: decl?.subject,
});

describe("gate ⑧ polarity — sign contradictions (the census's strict class)", () => {
  it("AWI-2608-043 shape: a FAVORABLE statement under negative_reputation (−3) is rejected", () => {
    const r = validateWeights({
      track: "supplier_identity", sourceProfileById: profiles({ s1: "social" }),
      proposals: [prop("e1", "negative_reputation", ["s1"], { polarity: "favorable", subject: true })],
    });
    expect(r[0].validated_weight_key).toBeNull();
    expect(r[0].gate).toBe("polarity");
    expect(r[0].rejection_reason).toBe("polarity");
  });

  it("AWI-2608-034 shape: an ADVERSE statement under government_registration (+4) is rejected — credit for something bad", () => {
    const r = validateWeights({
      track: "supplier_identity", sourceProfileById: profiles({ s1: "government_record" }),
      proposals: [prop("e1", "government_registration", ["s1"], { polarity: "adverse", subject: true })],
    });
    expect(r[0].validated_weight_key).toBeNull();
    expect(r[0].gate).toBe("polarity");
  });

  it("AWI-2607-031 E5 shape: a NEUTRAL_ABSENCE statement under brand_enforcement_signals (−3) is rejected — the −3 fired on nothing", () => {
    const r = validateWeights({
      track: "brand_risk_assessment", sourceProfileById: profiles({ s1: "news" }),
      proposals: [prop("e1", "brand_enforcement_signals", ["s1"], { polarity: "neutral_absence", subject: true })],
    });
    expect(r[0].validated_weight_key).toBeNull();
    expect(r[0].gate).toBe("polarity");
  });

  it("a correctly-declared item passes: ADVERSE under negative_reputation, FAVORABLE under government_registration", () => {
    const neg = validateWeights({
      track: "supplier_identity", sourceProfileById: profiles({ s1: "social" }),
      proposals: [prop("e1", "negative_reputation", ["s1"], { polarity: "adverse", subject: true })],
    });
    expect(neg[0].validated_weight_key).toBe("negative_reputation");
    const pos = validateWeights({
      track: "supplier_identity", sourceProfileById: profiles({ s1: "government_record" }),
      proposals: [prop("e1", "government_registration", ["s1"], { polarity: "favorable", subject: true })],
    });
    expect(pos[0].validated_weight_key).toBe("government_registration");
  });
});

describe("gate ⑧ polarity — subject inversion (the census's larger class, ruled IN)", () => {
  it("TD-Synnex shape: correct polarity but subject_is_target=false is rejected — the vendor as VICTIM of impersonation is not the vendor's reputation", () => {
    const r = validateWeights({
      track: "supplier_identity", sourceProfileById: profiles({ s1: "forum" }),
      proposals: [prop("e1", "negative_reputation", ["s1"], { polarity: "adverse", subject: false })],
    });
    expect(r[0].validated_weight_key).toBeNull();
    expect(r[0].gate).toBe("polarity");
  });

  it("ecosystem shape: grey_market_signals about the brand's market generally (subject false) is rejected", () => {
    const r = validateWeights({
      track: "supply_chain_relationship", sourceProfileById: profiles({ s1: "forum" }),
      proposals: [prop("e1", "grey_market_signals", ["s1"], { polarity: "adverse", subject: false })],
    });
    expect(r[0].validated_weight_key).toBeNull();
    expect(r[0].gate).toBe("polarity");
  });

  it("subject undeclared (undefined) is NOT a rejection on its own — only an explicit false is", () => {
    const r = validateWeights({
      track: "supplier_identity", sourceProfileById: profiles({ s1: "social" }),
      proposals: [prop("e1", "negative_reputation", ["s1"], { polarity: "adverse" })],
    });
    expect(r[0].validated_weight_key).toBe("negative_reputation");
  });
});

describe("gate ⑧ polarity — absence-semantics keys (shapes NOT in mind when the gate was drafted)", () => {
  it("no_enforcement_found (+2, an absence finding by MEANING) accepts neutral_absence — without this the gate would systematically kill a legitimate key", () => {
    const r = validateWeights({
      track: "brand_risk_assessment", sourceProfileById: profiles({ s1: "official_brand" }),
      proposals: [prop("e1", "no_enforcement_found", ["s1"], { polarity: "neutral_absence", subject: true })],
    });
    expect(r[0].validated_weight_key).toBe("no_enforcement_found");
  });

  it("no_enforcement_found also accepts favorable (its registry sign)", () => {
    const r = validateWeights({
      track: "brand_risk_assessment", sourceProfileById: profiles({ s1: "official_brand" }),
      proposals: [prop("e1", "no_enforcement_found", ["s1"], { polarity: "favorable", subject: true })],
    });
    expect(r[0].validated_weight_key).toBe("no_enforcement_found");
  });

  it("no_connection_found (0) with neutral_absence passes; declared FAVORABLE it is rejected — a statement affirming a connection does not belong under an absence key", () => {
    const ok = validateWeights({
      track: "supply_chain_relationship", sourceProfileById: profiles({ s1: "official_brand" }),
      proposals: [prop("e1", "no_connection_found", ["s1"], { polarity: "neutral_absence", subject: true })],
    });
    expect(ok[0].validated_weight_key).toBe("no_connection_found");
    const bad = validateWeights({
      track: "supply_chain_relationship", sourceProfileById: profiles({ s1: "official_brand" }),
      proposals: [prop("e1", "no_connection_found", ["s1"], { polarity: "favorable", subject: true })],
    });
    expect(bad[0].validated_weight_key).toBeNull();
    expect(bad[0].gate).toBe("polarity");
  });
});

describe("gate ⑧ polarity — veto keys and the fallback path", () => {
  it("a hard-fail veto key requires ADVERSE: declared favorable it is rejected before it can veto anything", () => {
    const r = validateWeights({
      track: "supplier_identity", sourceProfileById: profiles({ s1: "social", s2: "news" }),
      proposals: [prop("e1", "scam_reports_corroborated", ["s1", "s2"], { polarity: "favorable", subject: true })],
    });
    expect(r[0].validated_weight_key).toBeNull();
    expect(r[0].gate).toBe("polarity");
  });

  it("a correctly-declared veto still validates (adverse + subject true, corroborated)", () => {
    const r = validateWeights({
      track: "supplier_identity", sourceProfileById: profiles({ s1: "social", s2: "news" }),
      proposals: [prop("e1", "scam_reports_corroborated", ["s1", "s2"], { polarity: "adverse", subject: true })],
    });
    expect(r[0].validated_weight_key).toBe("scam_reports_corroborated");
  });

  it("UNDECLARED skips the gate entirely — the schema-less fallback parse must never zero a track", () => {
    const r = validateWeights({
      track: "supplier_identity", sourceProfileById: profiles({ s1: "social" }),
      proposals: [prop("e1", "negative_reputation", ["s1"])],
    });
    expect(r[0].validated_weight_key).toBe("negative_reputation");
    expect(r[0].gate).toBeNull();
  });

  it("the gate runs AFTER provenance — a wrong-profile proposal still reports the provenance gate, not polarity", () => {
    const r = validateWeights({
      track: "supply_chain_relationship", sourceProfileById: profiles({ s1: "forum" }),
      proposals: [prop("e1", "dealer_page_listed", ["s1"], { polarity: "adverse", subject: true })],
    });
    expect(r[0].gate).toBe("provenance");
  });
});
