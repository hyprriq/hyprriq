import { describe, it, expect } from "vitest";
import { decideWebsiteAnchored, type EntityResolution } from "./websiteAnchor";

// SB-2 (SO-1) — EntityResolution carries the resolved domain (the comparator's identity anchor);
// null = unresolved or (defensively) domain-less. Helper default null keeps pre-SB-2 tests meaningful.
const dom = (entity_name: string | null, resolved = true, confidence: "high" | "medium" | "low" = "high", resolved_domain: string | null = null): EntityResolution =>
  ({ resolved, entity_name, confidence, resolved_domain });

// SB-2 (SO-1) — the type carries the domain; threading from the resolver is proven end-to-end by
// the track05 routing tests (Task 2).
describe("SB-2 (SO-1) — EntityResolution carries resolved_domain", () => {
  it("resolved_domain rides the resolution", () => {
    expect(dom("TD SYNNEX Corporation", true, "high", "tdsynnex.com").resolved_domain).toBe("tdsynnex.com");
    expect(dom(null, false).resolved_domain).toBeNull();
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
