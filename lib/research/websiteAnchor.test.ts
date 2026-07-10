import { describe, it, expect } from "vitest";
import { decideWebsiteAnchored, entityNameMatch, clientNote, type EntityResolution } from "./websiteAnchor";

// SB-2 (SO-1) — EntityResolution carries the resolved domain (the comparator's identity anchor);
// null = unresolved or (defensively) domain-less. Helper default null keeps pre-SB-2 tests meaningful.
const dom = (entity_name: string | null, resolved = true, confidence: "high" | "medium" | "low" = "high", resolved_domain: string | null = null): EntityResolution =>
  ({ resolved, entity_name, confidence, resolved_domain });

// ── PG-1 timing OQ, RULED (founder, 2026-07-11): KEEP the pre-delivery render — the identity note
// is a data-correction prompt, not a finding; its value is being EARLY (the globaldist-class catch),
// and the retractability worry dissolved with SB-2's comparator fix. THE CONDITION, locked here:
// every identity client_note must carry an explicit confirm/correct INVITATION, so a future copy
// edit can never turn a provisional prompt into a bare assertion.
describe("PG-1 condition — every identity client_note invites confirm/correct", () => {
  const kinds = ["name_is_brand", "name_website_mismatch", "multiple_entities", "website_dead", "dba"] as const;
  it("all kinds (including the default template) carry the invitation", () => {
    for (const k of kinds) {
      const note = clientNote(k, "Acme Corp", "Other Entity Inc", "Name Entity LLC");
      expect(note, `${k} must invite confirm/correct`).toMatch(/contact us|please confirm/i);
    }
  });
});

// SB-2 (SO-1) — the type carries the domain; threading from the resolver is proven end-to-end by
// the track05 routing tests (Task 2).
describe("SB-2 (SO-1) — EntityResolution carries resolved_domain", () => {
  it("resolved_domain rides the resolution", () => {
    expect(dom("TD SYNNEX Corporation", true, "high", "tdsynnex.com").resolved_domain).toBe("tdsynnex.com");
    expect(dom(null, false).resolved_domain).toBeNull();
  });
});

// ── SB-2 (SO-2, OQ-A) — domain-first comparator. Domains carry identity; name strings speak only
// when domains are silent. SO-2's two founder-locked conditions are the first two tests below.
describe("SB-2 (SO-2) — domain-first ambiguity comparator", () => {
  it("CONDITION 1 (one-directional narrowing): same domain, different name strings → resolves WITH the mismatch note — never silently (the TD Synexx false ambiguity dies)", () => {
    const d = decideWebsiteAnchored({
      entered_name: "TD Synexx", provided_host: "tdsynnex.com", brands: [],
      website: dom("TD SYNNEX Corporation", true, "high", "tdsynnex.com"),
      name: dom("TD SYNNEX", true, "high", "tdsynnex.com"), // same company, variant string, SAME domain
    });
    expect(d.outcome).toBe("resolve_from_website");
    expect(d.resolved_name).toBe("TD SYNNEX Corporation");
    expect(d.identity_discrepancy).not.toBeNull();                          // never silent —
    expect(d.identity_discrepancy.kind).toBe("name_website_mismatch");      // the disclosure note
    expect(d.identity_discrepancy.client_note).toContain("TD SYNNEX Corporation");
  });

  it("CONDITION 2 (conscience lock): genuinely different companies on different domains still escalate (Medline/medlink)", () => {
    const d = decideWebsiteAnchored({
      entered_name: "Medline", provided_host: "medlink.com", brands: [],
      website: dom("Medlink Inc", true, "high", "medlink.com"),
      name: dom("Medline Industries", true, "high", "medline.com"),
    });
    expect(d.outcome).toBe("escalate");
    expect(d.identity_discrepancy.kind).toBe("multiple_entities");
    expect(d.identity_unconfirmed).toBe(true);
  });

  // SB-2 (SO-3) — the OQ-B founder-ruled EXACT copy (2026-07-10): an EARNED finding stated
  // unhedged, about the INPUTS, with the precise denial ("not a finding AGAINST either business").
  it("multiple_entities client note is the OQ-B-ruled copy, naming both entities", () => {
    const d = decideWebsiteAnchored({
      entered_name: "Medline", provided_host: "medlink.com", brands: [],
      website: dom("Medlink Inc", true, "high", "medlink.com"),
      name: dom("Medline Industries", true, "high", "medline.com"),
    });
    expect(d.identity_discrepancy.client_note).toBe(
      "Identity clarification: The supplier name \"Medline\" resolves to Medline Industries in public sources, while the website you provided belongs to Medlink Inc. Our research found these to be two different businesses, and we could not determine which is your intended supplier. This reflects what we found about the two inputs you provided — it is not a finding against either business. Please contact us to confirm your intended supplier before relying on the findings.",
    );
  });

  it("OQ-A: a name-string match does NOT override a domain conflict — domains differ ⇒ escalate", () => {
    const d = decideWebsiteAnchored({
      entered_name: "Acme Corp", provided_host: "acme-supply.com", brands: [],
      website: dom("Acme Corporation", true, "high", "acme-supply.com"),
      name: dom("Acme Corporation", true, "high", "acme.com"), // identical entity string, different domain
    });
    expect(d.outcome).toBe("escalate");
    expect(d.identity_discrepancy.kind).toBe("multiple_entities"); // the lookalike/impersonation shape — a human looks
  });

  it("defensive domain-absent fallback: suffix-normalized name equality decides sameness", () => {
    const same = decideWebsiteAnchored({
      entered_name: "TD Synexx", provided_host: "tdsynnex.com", brands: [],
      website: dom("TD SYNNEX Corporation", true, "high", "tdsynnex.com"),
      name: dom("TD SYNNEX", true, "high", null), // resolved but domain-less (defensive shape)
    });
    expect(same.outcome).toBe("resolve_from_website");
    const diff = decideWebsiteAnchored({
      entered_name: "Medline", provided_host: "medlink.com", brands: [],
      website: dom("Medlink Inc", true, "high", "medlink.com"),
      name: dom("Medline Industries", true, "high", null),
    });
    expect(diff.outcome).toBe("escalate");
    expect(diff.identity_discrepancy.kind).toBe("multiple_entities");
  });
});

describe("SB-2 — entityNameMatch (corporate-suffix-normalized comparison, fallback tier only)", () => {
  it("strips trailing corporate suffixes before comparing", () => {
    expect(entityNameMatch("TD SYNNEX", "TD SYNNEX Corporation")).toBe(true);
    expect(entityNameMatch("Acme Co Ltd", "Acme")).toBe(true);            // multi-suffix
    expect(entityNameMatch("Global Distribution LLC", "Global Distribution")).toBe(true);
  });
  it("genuinely different names stay different", () => {
    expect(entityNameMatch("Medline Industries", "Medlink Inc")).toBe(false);
    expect(entityNameMatch("Openborder Inc", "Global Distributors LLC")).toBe(false);
  });
  it("never strips a name to nothing (a company literally named a suffix word)", () => {
    expect(entityNameMatch("Limited", "Limited")).toBe(true);
    expect(entityNameMatch("Limited", "Acme Limited")).toBe(false);
  });
});

describe("decideWebsiteAnchored (Spec-B branches 2a/2b/2c + name_is_brand)", () => {
  it("globaldist / name_is_brand: client typed a brand → resolve from website, identity HOLDS, no penalty", () => {
    const d = decideWebsiteAnchored({
      entered_name: "Bosch", provided_host: "globaldist.com", brands: ["Bosch"],
      website: dom("Global Distribution LLC"), name: null,
    });
    expect(d.outcome).toBe("resolve_from_website");
    expect(d.identity_discrepancy.kind).toBe("name_is_brand");
    expect(d.resolved_name).toBe("Global Distribution LLC");
    expect(d.resolved_domain).toBe("globaldist.com");
    expect(d.resolution_confidence).toBe("high");
    expect(d.input_consistency).toBe("low");
    expect(d.identity_unconfirmed).toBe(false);          // NO verdict penalty
    expect(d.identity_discrepancy.client_note).toContain("Global Distribution LLC");
    expect(d.identity_discrepancy.entered_name).toBe("Bosch");
  });

  it("name_website_mismatch (name is NOT a brand): resolve from website, input_consistency low", () => {
    const d = decideWebsiteAnchored({
      entered_name: "Acme Corp", provided_host: "globaldist.com", brands: [],
      website: dom("Global Distribution LLC"), name: null,
    });
    expect(d.outcome).toBe("resolve_from_website");
    expect(d.identity_discrepancy.kind).toBe("name_website_mismatch");
    expect(d.identity_unconfirmed).toBe(false);
  });

  it("multiple_entities: name AND website each resolve to different legit entities → ESCALATE, no auto-pick", () => {
    const d = decideWebsiteAnchored({
      entered_name: "ABC Trading", provided_host: "abctradingcanada.com", brands: [],
      website: dom("ABC Trading Canada"), name: dom("ABC Trading"),
    });
    expect(d.outcome).toBe("escalate");
    expect(d.identity_discrepancy.kind).toBe("multiple_entities");
    expect(d.identity_unconfirmed).toBe(true);           // conservative escalation, NOT fraud
    expect(d.resolved_domain).toBeNull();
  });

  it("name_is_brand PRECEDENCE: even if the brand-name also resolves an entity, resolve from website (not ambiguous)", () => {
    const d = decideWebsiteAnchored({
      entered_name: "Bosch", provided_host: "globaldist.com", brands: ["Bosch"],
      website: dom("Global Distribution LLC"), name: dom("Robert Bosch GmbH"), // brand resolves, but it's a brand
    });
    expect(d.outcome).toBe("resolve_from_website");
    expect(d.identity_discrepancy.kind).toBe("name_is_brand");
  });

  it("website_dead: website does not resolve to a real entity → ESCALATE, never fraud", () => {
    const d = decideWebsiteAnchored({
      entered_name: "Acme Corp", provided_host: "parked-nothing.com", brands: [],
      website: dom(null, false), name: null,
    });
    expect(d.outcome).toBe("escalate");
    expect(d.identity_discrepancy.kind).toBe("website_dead");
    expect(d.identity_unconfirmed).toBe(true);
    expect(d.resolved_domain).toBeNull();
  });

  // SB-1 (SO-3) — the OQ-B founder-ruled EXACT copy (2026-07-09). The bar, now standing: the note
  // states OUR limitation, never a conclusion about the supplier or its website.
  it("website_dead client note is the OQ-B-ruled copy — our limitation, never a supplier conclusion", () => {
    const d = decideWebsiteAnchored({
      entered_name: "Acme Corp", provided_host: "parked-nothing.com", brands: [],
      website: dom(null, false), name: null,
    });
    expect(d.identity_discrepancy.client_note).toBe(
      "Identity clarification: In this pass, we were unable to independently verify the website associated with \"Acme Corp\" from public sources. This reflects a limit of our verification in this investigation, not a finding about the supplier or its website. If you can confirm the supplier's official website, contact us and we will re-verify.",
    );
  });

  it("never emits a fraud key — the decision only sets identity fields + a flag", () => {
    const d = decideWebsiteAnchored({ entered_name: "Bosch", provided_host: "globaldist.com", brands: ["Bosch"], website: dom("Global Distribution LLC"), name: null });
    // sanity: the decision object carries no weight_key / veto surface at all
    expect(Object.keys(d)).not.toContain("weight_key");
    expect(d.resolution_method).toBe("resolved_from_website");
  });
});
