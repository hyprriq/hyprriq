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
    const r = await resolveSupplierIdentity(ctx({ vendor_name: "TD Synnex Distribution", vendor_website: "tdsynnex.com" }));
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

  // SB-1 AT-1 correction (founder live check, 2026-07-09): globaldist.com actually belongs to a
  // DIFFERENT company (openborder) — the wrong domain was entered weeks ago (real site:
  // globalcloseouts.net). The resolver's escalation was CORRECT all along. This locks the
  // wrong-domain behavior post-fix: anchor identity resolves the domain to ITS OWN entity — it can
  // NEVER confer the entered name's identity on someone else's domain (resolved_name comes only
  // from the LLM-discovered entity FOR that domain, and the client note names that entity).
  it("wrong domain entered: anchor resolves to the domain's ACTUAL entity, never the entered supplier", async () => {
    gather
      .mockResolvedValueOnce(pack([onDomain("globaldist.com", "official_company")]))
      .mockResolvedValueOnce(pack([src("https://news.example/x", "news")]));
    runModel
      .mockResolvedValueOnce(model({ candidates: [{ domain: "globaldist.com", entity_name: "Openborder Inc", supporting_source_ids: ["src_0"] }] }))
      .mockResolvedValueOnce(model({ candidates: [] })); // entered name resolves nothing this pass
    const r = await resolveSupplierIdentity(ctx({ vendor_name: "Global Distributors", vendor_website: "globaldist.com" }));
    expect(r.resolved_name).toBe("Openborder Inc");                       // the domain's real entity
    expect(r.resolved_name).not.toBe("Global Distributors");              // NEVER the entered name
    expect(r.identity_discrepancy?.kind).toBe("name_website_mismatch");
    expect(r.identity_discrepancy?.client_note).toContain("Openborder Inc"); // the client is TOLD whose site this is
    expect(r.identity_discrepancy?.entered_name).toBe("Global Distributors");
  });

  // SB-2 — the TD Synexx class end-to-end: name research resolves the SAME domain under a variant
  // entity string → domain-first comparator routes to resolve_from_website (was: false multiple_entities).
  it("SB-2: typo name resolving the anchor's own domain → resolved_from_website, not false ambiguity", async () => {
    gather
      .mockResolvedValueOnce(pack([onDomain("tdsynnex.com", "official_company")]))
      .mockResolvedValueOnce(pack([src("https://opencorporates.com/td", "registry"), onDomain("tdsynnex.com", "official_company")]));
    runModel
      .mockResolvedValueOnce(model({ candidates: [{ domain: "tdsynnex.com", entity_name: "TD SYNNEX Corporation", supporting_source_ids: ["src_0"] }] }))
      .mockResolvedValueOnce(model({ candidates: [{ domain: "tdsynnex.com", entity_name: "TD SYNNEX", supporting_source_ids: ["src_0", "src_1"] }] })); // same domain, variant string
    const r = await resolveSupplierIdentity(ctx({ vendor_name: "TD Synexx", vendor_website: "tdsynnex.com" }));
    expect(r.resolution_method).toBe("resolved_from_website");
    expect(r.resolved_name).toBe("TD SYNNEX Corporation");
    expect(r.resolved_domain).toBe("tdsynnex.com");
    expect(r.identity_unconfirmed).toBe(false);
    expect(r.identity_discrepancy?.kind).toBe("name_website_mismatch");   // disclosed, never silent
  });

  it("wrong domain entered AND the entered name resolves its own entity elsewhere → multiple_entities escalate", async () => {
    gather
      .mockResolvedValueOnce(pack([onDomain("globaldist.com", "official_company")]))
      .mockResolvedValueOnce(pack([src("https://opencorporates.com/gd", "registry"), onDomain("globalcloseouts.net", "official_company")]));
    runModel
      .mockResolvedValueOnce(model({ candidates: [{ domain: "globaldist.com", entity_name: "Openborder Inc", supporting_source_ids: ["src_0"] }] }))
      .mockResolvedValueOnce(model({ candidates: [{ domain: "globalcloseouts.net", entity_name: "Global Distributors LLC", supporting_source_ids: ["src_0", "src_1"] }] }));
    const r = await resolveSupplierIdentity(ctx({ vendor_name: "Global Distributors", vendor_website: "globaldist.com" }));
    expect(r.identity_discrepancy?.kind).toBe("multiple_entities");
    expect(r.identity_unconfirmed).toBe(true);                            // two real entities → human decides
    expect(r.resolved_domain).toBeNull();
  });

  it("a NON-anchor candidate earns no anchor bonus under domain research (no wrong-entity binding)", async () => {
    gather.mockResolvedValueOnce(pack([onDomain("othersite.com", "official_company")]));
    runModel.mockResolvedValueOnce(model({ candidates: [{ domain: "othersite.com", entity_name: "Other Site Inc", supporting_source_ids: ["src_0"] }] }));
    const r = await resolveSupplierIdentity(ctx({ vendor_name: "Acme Corp", vendor_website: "parked-nothing.com" }));
    expect(r.identity_discrepancy?.kind).toBe("website_dead"); // othersite self-identifies (2) but is NOT the anchor → never dominant here
    expect(r.resolved_domain).toBeNull();
  });
});

// ── SB-1 (SO-2, OQ-A/OQ-C) — llm_failed instrumentation: a model failure is a STATE, never a
// website finding. Infra failures carry NO client-facing discrepancy (OQ-A ruling: "our API failure
// is never a claim about their business"); a failed ambiguity check escalates rather than failing
// open (OQ-C ruling, the H7 OQ-A precedent). Every research call is recorded in resolution_research.
describe("SB-1 (SO-2) — Track 0.5 llm_failed instrumentation", () => {
  it("website research call THROWS → escalates truthfully with NO website_dead client note (OQ-A)", async () => {
    gather.mockResolvedValueOnce(pack([src("https://news.example/x", "news")]));
    runModel.mockRejectedValueOnce(new Error("429"));
    const r = await resolveSupplierIdentity(ctx({ vendor_name: "Acme Corp", vendor_website: "tdsynnex.com" }));
    expect(r.identity_unconfirmed).toBe(true);
    expect(r.resolution_method).toBe("unresolved");
    expect(r.identity_discrepancy).toBeNull();                     // OQ-A: our failure — no client note
    expect(r.resolution_research).toMatchObject([{ subject: "tdsynnex.com", role: "website", sources: 1, llm_failed: true }]);
    expect(r.resolution_notes).toContain("model call failed");
    expect(gather).toHaveBeenCalledTimes(1);                       // name research never runs
  });

  it("website research returns unparseable output → same state (H2: BOTH failure classes are llm_failed)", async () => {
    gather.mockResolvedValueOnce(pack([src("https://news.example/x", "news")]));
    runModel.mockResolvedValueOnce(model({ totally: "unrelated" }));
    const r = await resolveSupplierIdentity(ctx({ vendor_name: "Acme Corp", vendor_website: "tdsynnex.com" }));
    expect(r.identity_discrepancy).toBeNull();
    expect(r.resolution_research?.[0]?.llm_failed).toBe(true);
    expect(r.identity_unconfirmed).toBe(true);
  });

  it("website research pack has ZERO sources → could-not-research state; the model is never asked", async () => {
    gather.mockResolvedValueOnce(pack([]));
    const r = await resolveSupplierIdentity(ctx({ vendor_name: "Acme Corp", vendor_website: "tdsynnex.com" }));
    expect(runModel).not.toHaveBeenCalled();
    expect(r.identity_discrepancy).toBeNull();
    expect(r.resolution_research).toMatchObject([{ subject: "tdsynnex.com", role: "website", sources: 0, llm_failed: false }]);
    expect(r.identity_unconfirmed).toBe(true);
    expect(r.resolution_notes).toContain("no sources");
  });

  it("OQ-C: website RESOLVES but the name ambiguity-check call fails → escalate, never fail open", async () => {
    gather
      .mockResolvedValueOnce(pack([src("https://tdsynnex.com/about", "official_company")]))
      .mockResolvedValueOnce(pack([src("https://news.example/x", "news")]));
    runModel
      .mockResolvedValueOnce(model({ candidates: [{ domain: "tdsynnex.com", entity_name: "TD SYNNEX Corporation", supporting_source_ids: ["src_0"] }] }))
      .mockRejectedValueOnce(new Error("boom"));
    const r = await resolveSupplierIdentity(ctx({ vendor_name: "TD Synnex Distribution", vendor_website: "tdsynnex.com" }));
    expect(r.identity_unconfirmed).toBe(true);
    expect(r.resolved_domain).toBeNull();
    expect(r.identity_discrepancy).toBeNull();                     // OQ-A applies here too
    expect(r.resolution_research).toMatchObject([
      { subject: "tdsynnex.com", role: "website", sources: 1, llm_failed: false },
      { subject: "TD Synnex Distribution", role: "name", sources: 1, llm_failed: true },
    ]);
    expect(r.resolution_notes).toContain("ambiguity check");
  });

  it("name-only discovery: model call fails → unresolved as today, now with the failure RECORDED truthfully", async () => {
    gather.mockResolvedValueOnce(pack([src("https://news.example/x", "news")]));
    runModel.mockRejectedValueOnce(new Error("500"));
    const r = await resolveSupplierIdentity(ctx()); // no website
    expect(r.identity_unconfirmed).toBe(true);
    expect(r.resolution_method).toBe("unresolved");
    expect(r.resolution_research).toMatchObject([{ subject: "Acme Distributing", role: "name", sources: 1, llm_failed: true }]);
    expect(r.resolution_notes).toContain("model call failed");
  });

  it("successful runs record llm_failed:false per call; the zero-research fast path records []", async () => {
    const fast = await resolveSupplierIdentity(ctx({ vendor_name: "TD Synnex", vendor_website: "https://tdsynnex.com" }));
    expect(fast.resolution_research).toEqual([]);
    gather
      .mockResolvedValueOnce(pack([src("https://tdsynnex.com/about", "official_company")]))
      .mockResolvedValueOnce(pack([src("https://news.example/x", "news")]));
    runModel
      .mockResolvedValueOnce(model({ candidates: [{ domain: "tdsynnex.com", entity_name: "TD SYNNEX Corporation", supporting_source_ids: ["src_0"] }] }))
      .mockResolvedValueOnce(model({ candidates: [] }));
    const r = await resolveSupplierIdentity(ctx({ vendor_name: "TD Synnex Distribution", vendor_website: "tdsynnex.com" }));
    expect(r.resolution_research).toMatchObject([
      { subject: "tdsynnex.com", role: "website", sources: 1, llm_failed: false },
      { subject: "TD Synnex Distribution", role: "name", sources: 1, llm_failed: false },
    ]);
  });
});

// ── SB-2 (SO-4 + OQ-C) — the inner resolver audits ride the research records (the score/margin
// data SB-1's stop-rule asked for but the anchored path never persisted), and unresolved notes
// self-describe resolved_name (OQ-C ruling: fix the READING experience, don't null the field).
describe("SB-2 (SO-4/OQ-C) — carried audits + unresolved-notes clarifier", () => {
  const onDomain = (domain: string, profile: string) => src(`https://${domain}/about`, profile);

  it("the anchored branch persists the INNER resolver audits — earned dominance finally on the record", async () => {
    gather
      .mockResolvedValueOnce(pack([onDomain("tdsynnex.com", "official_company")]))
      .mockResolvedValueOnce(pack([src("https://news.example/x", "news")]));
    runModel
      .mockResolvedValueOnce(model({ candidates: [{ domain: "tdsynnex.com", entity_name: "TD SYNNEX Corporation", supporting_source_ids: ["src_0"] }] }))
      .mockResolvedValueOnce(model({ candidates: [] }));
    const r = await resolveSupplierIdentity(ctx({ vendor_name: "Bulk Electronics Wholesale Vendor", vendor_website: "tdsynnex.com" }));
    const website = r.resolution_research?.find((x) => x.role === "website");
    expect(website?.audit?.winner).toBe("tdsynnex.com");
    expect(website?.audit?.score).toBeGreaterThanOrEqual(4);
    const name = r.resolution_research?.find((x) => x.role === "name");
    expect(name?.audit?.winner).toBeNull(); // honest: the name resolved nothing this pass
  });

  it("unresolved identities carry the OQ-C clarifier on every unconfirmed path", async () => {
    // anchored research FAILURE (llm_failed; no client note per OQ-A)
    gather.mockResolvedValueOnce(pack([src("https://news.example/x", "news")]));
    runModel.mockRejectedValueOnce(new Error("429"));
    const fail = await resolveSupplierIdentity(ctx({ vendor_name: "Acme Corp", vendor_website: "tdsynnex.com" }));
    expect(fail.resolution_notes).toContain("research subject, not a confirmed resolution");
    // anchored website_dead escalation
    gather.mockResolvedValueOnce(pack([src("https://news.example/x", "news")]));
    runModel.mockResolvedValueOnce(model({ candidates: [] }));
    const dead = await resolveSupplierIdentity(ctx({ vendor_name: "Acme Corp", vendor_website: "parked-nothing.com" }));
    expect(dead.identity_unconfirmed).toBe(true);
    expect(dead.resolution_notes).toContain("research subject, not a confirmed resolution");
    // name-only unresolved
    gather.mockResolvedValueOnce(pack([src("https://news.example/x", "news")]));
    runModel.mockResolvedValueOnce(model({ candidates: [] }));
    const un = await resolveSupplierIdentity(ctx({ vendor_name: "Zzqxwv Nonexistent Trading Co" }));
    expect(un.identity_unconfirmed).toBe(true);
    expect(un.resolution_notes).toContain("research subject, not a confirmed resolution");
  });
});

// ── SB-3 (SO-1, founder-signed) — the fast path's "exact" widened to suffix-normalized-identical
// via SB-2's entityNameMatch (ZERO edit-distance: legal-suffix noise stops counting as a difference;
// the H4 anti-silent-bind guarantee holds — typos and different-stem companies still verify).
describe("SB-3 — suffix-aware zero-research fast path", () => {
  it("the recorded irony dies: 'TD SYNNEX Corporation' + tdsynnex.com takes the fast path, zero research", async () => {
    const r = await resolveSupplierIdentity(ctx({ vendor_name: "TD SYNNEX Corporation", vendor_website: "https://www.tdsynnex.com" }));
    expect(r.resolution_method).toBe("provided");
    expect(r.resolution_research).toEqual([]);                 // the cost win, SQL-visible
    expect(r.identity_discrepancy ?? null).toBeNull();          // no mismatch note for a CORRECT input
    expect(r.resolution_notes).toContain("corporate-suffix normalization"); // OQ-A record
    expect(gather).not.toHaveBeenCalled();
    expect(runModel).not.toHaveBeenCalled();
  });

  it("multi-suffix names strip cleanly: 'Acme Co Ltd' + acme.com fast-paths", async () => {
    const r = await resolveSupplierIdentity(ctx({ vendor_name: "Acme Co Ltd", vendor_website: "acme.com" }));
    expect(r.resolution_method).toBe("provided");
    expect(gather).not.toHaveBeenCalled();
  });

  it("a token-exact match records NO normalization note (OQ-A scopes the note to the suffix path)", async () => {
    const r = await resolveSupplierIdentity(ctx({ vendor_name: "TD Synnex", vendor_website: "https://tdsynnex.com" }));
    expect(r.resolution_method).toBe("provided");
    expect(r.resolution_notes).not.toContain("corporate-suffix normalization");
  });

  it("H4 LOCK re-proven: the TD Synexx TYPO still verifies via discovery (zero edit tolerance)", async () => {
    gather.mockResolvedValue(pack([]));
    runModel.mockResolvedValue(model({ _parse_error: true }));
    await resolveSupplierIdentity(ctx({ vendor_name: "TD Synexx", vendor_website: "tdsynnex.com" }));
    expect(gather).toHaveBeenCalled(); // stem differs — no silent bind
  });

  it("H4 LOCK re-proven: Medline + medlink.com (different-stem company) still verifies via discovery", async () => {
    gather.mockResolvedValue(pack([]));
    runModel.mockResolvedValue(model({ _parse_error: true }));
    await resolveSupplierIdentity(ctx({ vendor_name: "Medline Inc", vendor_website: "https://medlink.com" }));
    expect(gather).toHaveBeenCalled(); // suffix strip does not rescue a different stem
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
