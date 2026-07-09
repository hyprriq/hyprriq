import { describe, it, expect, vi, beforeEach } from "vitest";

const { gather, runModel } = vi.hoisted(() => ({ gather: vi.fn(), runModel: vi.fn() }));
vi.mock("@/lib/research/acquisition/orchestrator", () => ({ Orchestrator: class { gather = gather } }));
vi.mock("@/lib/ai/runModel", () => ({ runModel }));

import { resolveSupplierIdentity } from "./track05";
import type { TrackContext } from "@/lib/research/contracts";

const ctx = (over: Partial<TrackContext> = {}): TrackContext => ({
  case_id: "c1", vendor_name: "Acme Distributing", vendor_website: null,
  brands_submitted: [], marketplace: "amazon_us", plan_type: "growth_279", ...over,
});

const src = (url: string, profile: string) => ({
  url, title: "t", snippet: "s", raw: {},
  provenance: { provider: "Serper", provider_version: "v1", plugin: "serper", acquisition_method: "serper", source_profile: profile, source_type: "third_party", authority_score: "high", freshness_days: null, collected_at: "t", expires_at: "t", refresh_required: false },
});
const pack = (sources: unknown[]) => ({ pack: { schema_version: "1.0.0", case_id: "c1", track_key: "supplier_identity", sources, evidence_hash: "h", collected_at: "t" }, metrics: [] });
const model = (json: unknown) => ({ json, model_provider: "anthropic", model_version: "claude-sonnet-4-6", tokens: 10, cost_usd: 0, latency_ms: 1 });

beforeEach(() => { gather.mockReset(); runModel.mockReset(); });

describe("resolveSupplierIdentity", () => {
  it("provided website → high/provided WITHOUT calling orchestrator or model", async () => {
    const r = await resolveSupplierIdentity(ctx({ vendor_website: "https://www.acme-distributing.com" }));
    expect(r.resolution_method).toBe("provided");
    expect(r.identity_confidence).toBe("high");
    expect(r.resolved_domain).toBe("acme-distributing.com");
    expect(gather).not.toHaveBeenCalled();
    expect(runModel).not.toHaveBeenCalled();
  });

  it("website absent + one dominant candidate → resolved_dominant/high with resolved_domain", async () => {
    gather.mockResolvedValue(pack([
      src("https://opencorporates.com/acme", "registry"),        // → src_0 (registry_hit)
      src("https://acme-distributing.com/about", "official_company"), // → src_1 (self_identifies via host match)
    ]));
    runModel.mockResolvedValue(model({
      candidates: [{ domain: "acme-distributing.com", registration_hint: "LLC", address_hint: "TX", supporting_source_ids: ["src_0", "src_1"] }],
      reasoning_notes: "one dominant entity",
    }));
    const r = await resolveSupplierIdentity(ctx());
    expect(r.identity_confidence).toBe("high");
    expect(r.identity_unconfirmed).toBe(false);
    expect(r.resolved_domain).toBe("acme-distributing.com");
    expect(["resolved_dominant", "normalized"]).toContain(r.resolution_method);
    expect(r.original_input.name).toBe("Acme Distributing");
  });

  it("typo on a dominant entity resolves silently → normalized/high, original preserved", async () => {
    gather.mockResolvedValue(pack([
      src("https://opencorporates.com/tdsynnex", "registry"),
      src("https://tdsynnex.com/about", "official_company"),
    ]));
    runModel.mockResolvedValue(model({
      candidates: [{ domain: "tdsynnex.com", registration_hint: "NYSE: SNX", address_hint: "Fremont CA", supporting_source_ids: ["src_0", "src_1"] }],
    }));
    const r = await resolveSupplierIdentity(ctx({ vendor_name: "TD Synexx" }));
    expect(r.identity_confidence).toBe("high");
    expect(r.identity_unconfirmed).toBe(false);
    expect(r.resolution_method).toBe("normalized"); // fuzzy match absorbed the typo — not ambiguity
    expect(r.resolved_domain).toBe("tdsynnex.com");
    expect(r.original_input.name).toBe("TD Synexx");
  });

  it("website absent + two plausible candidates, no winner → ambiguous/low/unconfirmed", async () => {
    gather.mockResolvedValue(pack([src("https://opencorporates.com/x", "registry")]));
    runModel.mockResolvedValue(model({
      candidates: [
        { domain: "acme-one.com", supporting_source_ids: ["src_0"] },
        { domain: "acme-two.com", supporting_source_ids: ["src_0"] },
      ],
    }));
    const r = await resolveSupplierIdentity(ctx({ vendor_name: "Acme" }));
    expect(r.identity_unconfirmed).toBe(true);
    expect(r.resolved_domain).toBeNull();
    expect(["ambiguous", "unresolved"]).toContain(r.resolution_method);
  });

  // LOCKED REGRESSION (Track 0.5 required matrix — CRITICAL): a fake/nonexistent supplier must
  // NEVER yield a hallucinated domain or false confidence. Two honesty modes the model may take:
  it("fake supplier, model honestly returns no candidates → unresolved/low, NO domain, NOT high", async () => {
    gather.mockResolvedValue(pack([src("https://news.example/unrelated", "news")]));
    runModel.mockResolvedValue(model({ candidates: [], reasoning_notes: "no supporting evidence for this name" }));
    const r = await resolveSupplierIdentity(ctx({ vendor_name: "Zzqxwv Nonexistent Trading Co" }));
    expect(r.resolution_method).toBe("unresolved");
    expect(r.identity_confidence).not.toBe("high");
    expect(r.resolved_domain).toBeNull();
    expect(r.identity_unconfirmed).toBe(true);
  });
  it("fake supplier, model hallucinates ONE weak candidate (name only, no registry/self) → NOT resolved", async () => {
    gather.mockResolvedValue(pack([src("https://news.example/unrelated", "news")]));
    // The domain fuzzy-matches the (fake) name but nothing corroborates it → score 2 < threshold 4.
    runModel.mockResolvedValue(model({ candidates: [{ domain: "zzqxwv-trading.com", supporting_source_ids: ["src_0"] }] }));
    const r = await resolveSupplierIdentity(ctx({ vendor_name: "Zzqxwv Trading" }));
    expect(r.resolved_domain).toBeNull();      // no false-confidence domain
    expect(r.identity_confidence).not.toBe("high");
    expect(r.identity_unconfirmed).toBe(true);
  });

  // ── Spec-B — website-anchored resolution on name/website mismatch ──
  const domSrc = (domain: string, profile: string) => src(`https://${domain}/about`, profile);

  it("globaldist (name=Bosch, website=globaldist.com, brand=Bosch): resolves from WEBSITE, name_is_brand, identity HOLDS", async () => {
    // website research → dominant real entity on globaldist.com; nameIsBrand short-circuits name research.
    gather.mockResolvedValueOnce(pack([src("https://opencorporates.com/globaldist", "registry"), domSrc("globaldist.com", "official_company")]));
    runModel.mockResolvedValueOnce(model({ candidates: [
      { domain: "globaldist.com", entity_name: "Global Distribution LLC", registration_hint: "LLC", address_hint: "TX", supporting_source_ids: ["src_0", "src_1"] },
    ] }));
    const r = await resolveSupplierIdentity(ctx({ vendor_name: "Bosch", vendor_website: "globaldist.com", brands_submitted: ["Bosch"] }));
    expect(r.resolution_method).toBe("resolved_from_website");
    expect(r.resolved_name).toBe("Global Distribution LLC");
    expect(r.resolved_domain).toBe("globaldist.com");
    expect(r.resolution_confidence).toBe("high");
    expect(r.input_consistency).toBe("low");
    expect(r.identity_unconfirmed).toBe(false);          // NO verdict penalty
    expect(r.identity_discrepancy?.kind).toBe("name_is_brand");
    expect(r.identity_discrepancy?.entered_name).toBe("Bosch");
    expect(r.identity_discrepancy?.client_note).toContain("Global Distribution LLC");
    expect(gather).toHaveBeenCalledTimes(1);             // website only — name research skipped (brand)
  });

  it("multiple_entities (name and website resolve to DIFFERENT legit entities) → escalate, no auto-pick", async () => {
    // 1st gather/model = website (ABC Trading Canada); 2nd = name (ABC Trading) — both dominant, different.
    gather
      .mockResolvedValueOnce(pack([src("https://opencorporates.com/abc-ca", "registry"), domSrc("abctradingcanada.com", "official_company")]))
      .mockResolvedValueOnce(pack([src("https://opencorporates.com/abc", "registry"), domSrc("abctrading.com", "official_company")]));
    runModel
      .mockResolvedValueOnce(model({ candidates: [{ domain: "abctradingcanada.com", entity_name: "ABC Trading Canada", supporting_source_ids: ["src_0", "src_1"] }] }))
      .mockResolvedValueOnce(model({ candidates: [{ domain: "abctrading.com", entity_name: "ABC Trading", supporting_source_ids: ["src_0", "src_1"] }] }));
    const r = await resolveSupplierIdentity(ctx({ vendor_name: "ABC Trading", vendor_website: "abctradingcanada.com", brands_submitted: [] }));
    expect(r.identity_discrepancy?.kind).toBe("multiple_entities");
    expect(r.identity_unconfirmed).toBe(true);           // escalates → manual_override_required, NOT fraud
    expect(r.resolved_domain).toBeNull();
    expect(gather).toHaveBeenCalledTimes(2);
  });

  it("dead website (does not resolve to a real entity) → escalate website_dead, NEVER a fraud veto", async () => {
    gather.mockResolvedValueOnce(pack([src("https://news.example/x", "news")])); // no on-domain / registry corroboration
    runModel.mockResolvedValueOnce(model({ candidates: [] }));                    // model finds no entity for the domain
    const r = await resolveSupplierIdentity(ctx({ vendor_name: "Acme Corp", vendor_website: "parked-nothing.com", brands_submitted: [] }));
    expect(r.identity_discrepancy?.kind).toBe("website_dead");
    expect(r.identity_unconfirmed).toBe(true);
    expect(r.resolved_domain).toBeNull();
    expect(gather).toHaveBeenCalledTimes(1);             // name research skipped (website unresolved)
  });
});

// ── SB-1 (SO-1) — domain-mode anchor match. In website-anchored research the SUBJECT IS a domain,
// so "matches the subject" means anchor IDENTITY (canonicalDomain equality) — the fuzzy name↔label
// match structurally fails there (TLD-included subject vs TLD-stripped label = 3 edits vs tolerance
// 2: the confirmed root cause of the tdsynnex/globaldist website_dead false negatives). Two-sided:
// the anchor still must EARN dominance via registry_hit or self_identifies (identity alone = 2 < 4).
describe("SB-1 (SO-1) — domain-research anchor match", () => {
  const onDomain = (domain: string, profile: string) => src(`https://${domain}/about`, profile);

  it("live domain, anchor candidate + self-identification ONLY → resolves from website (the tdsynnex false negative dies)", async () => {
    gather
      .mockResolvedValueOnce(pack([onDomain("tdsynnex.com", "official_company")]))   // website research
      .mockResolvedValueOnce(pack([src("https://news.example/x", "news")]));         // name research (ambiguity check)
    runModel
      .mockResolvedValueOnce(model({ candidates: [{ domain: "tdsynnex.com", entity_name: "TD SYNNEX Corporation", supporting_source_ids: ["src_0"] }] }))
      .mockResolvedValueOnce(model({ candidates: [] }));                             // name resolves nothing → not ambiguous
    const r = await resolveSupplierIdentity(ctx({ vendor_name: "TD Synnex Corp", vendor_website: "tdsynnex.com" }));
    expect(r.resolution_method).toBe("resolved_from_website");
    expect(r.resolved_name).toBe("TD SYNNEX Corporation");
    expect(r.resolved_domain).toBe("tdsynnex.com");
    expect(r.identity_unconfirmed).toBe(false);
    expect(r.identity_discrepancy?.kind).toBe("name_website_mismatch");
  });

  it("anchor candidate cited by a registry source ONLY (candidate spelled www.…) → resolves via canonicalDomain identity", async () => {
    gather
      .mockResolvedValueOnce(pack([src("https://opencorporates.com/globaldist", "registry")]))
      .mockResolvedValueOnce(pack([src("https://news.example/x", "news")]));
    runModel
      .mockResolvedValueOnce(model({ candidates: [{ domain: "www.globaldist.com", entity_name: "Global Distribution LLC", supporting_source_ids: ["src_0"] }] }))
      .mockResolvedValueOnce(model({ candidates: [] }));
    const r = await resolveSupplierIdentity(ctx({ vendor_name: "Global Distribution", vendor_website: "globaldist.com" }));
    expect(r.resolution_method).toBe("resolved_from_website");
    expect(r.resolved_name).toBe("Global Distribution LLC");
    expect(r.resolved_domain).toBe("globaldist.com");
    expect(r.identity_unconfirmed).toBe(false);
  });

  it("anchor identity ALONE (no registry, no self-identification) still escalates website_dead — dominance must be EARNED", async () => {
    gather.mockResolvedValueOnce(pack([src("https://news.example/x", "news")]));
    runModel.mockResolvedValueOnce(model({ candidates: [{ domain: "parked-nothing.com", entity_name: "Some Name", supporting_source_ids: ["src_0"] }] }));
    const r = await resolveSupplierIdentity(ctx({ vendor_name: "Acme Corp", vendor_website: "parked-nothing.com" }));
    expect(r.identity_discrepancy?.kind).toBe("website_dead");
    expect(r.identity_unconfirmed).toBe(true);
    expect(r.resolved_domain).toBeNull();
    expect(gather).toHaveBeenCalledTimes(1); // website unresolved → name research skipped
  });

  it("a NON-anchor candidate earns no anchor bonus under domain research (no wrong-entity binding)", async () => {
    gather.mockResolvedValueOnce(pack([onDomain("othersite.com", "official_company")]));
    runModel.mockResolvedValueOnce(model({ candidates: [{ domain: "othersite.com", entity_name: "Other Site Inc", supporting_source_ids: ["src_0"] }] }));
    const r = await resolveSupplierIdentity(ctx({ vendor_name: "Acme Corp", vendor_website: "parked-nothing.com" }));
    expect(r.identity_discrepancy?.kind).toBe("website_dead"); // othersite self-identifies (2) but is NOT the anchor → never dominant here
    expect(r.resolved_domain).toBeNull();
  });
});

// H4 (SO-1) — the zero-research fast path is EXACT-only. A fuzzy near-miss (a typo — or a
// different company one letter away: Medline vs medlink.com) must VERIFY via the existing
// Spec-B website-anchored discovery instead of silently binding with high confidence.
describe("H4 (SO-1) — fast path exact-only", () => {
  it("a fuzzy (non-exact) name↔host near-miss runs website-anchored discovery (no silent bind)", async () => {
    gather.mockResolvedValue(pack([]));
    runModel.mockResolvedValue(model({ _parse_error: true }));
    await resolveSupplierIdentity(ctx({ vendor_name: "Medline", vendor_website: "https://medlink.com" }));
    expect(gather).toHaveBeenCalled(); // discovery ran — the pre-H4 behavior was zero research here
  });

  it("an EXACT match keeps the zero-research fast path (no cost added)", async () => {
    const r = await resolveSupplierIdentity(ctx({ vendor_name: "TD Synnex", vendor_website: "https://tdsynnex.com" }));
    expect(r.resolution_method).toBe("provided");
    expect(gather).not.toHaveBeenCalled();
    expect(runModel).not.toHaveBeenCalled();
  });
});
