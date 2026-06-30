import { describe, it, expect } from "vitest";
import { resolveIdentity } from "./identityResolver";

const cand = (domain: string, o: Partial<{ name_match: boolean; registry_hit: boolean; address_consistent: boolean; self_identifies: boolean }> = {}) =>
  ({ domain, name_match: false, registry_hit: false, address_consistent: false, self_identifies: false, ...o });

describe("resolveIdentity", () => {
  it("provided website → high confidence, method 'provided', resolved_domain = host", () => {
    const r = resolveIdentity({ vendor_name: "TD Synnex", vendor_website: "https://www.tdsynnex.com", candidates: [] });
    expect(r.resolution_method).toBe("provided");
    expect(r.identity_confidence).toBe("high");
    expect(r.resolved_domain).toBe("tdsynnex.com");
    expect(r.identity_unconfirmed).toBe(false);
  });
  it("one dominant candidate → resolved_dominant / high", () => {
    const r = resolveIdentity({ vendor_name: "Acme Distributing", vendor_website: null, candidates: [
      cand("acme-distributing.com", { name_match: true, registry_hit: true, self_identifies: true }),
      cand("acme-blog.net", {}),
    ] });
    expect(r.resolution_method).toBe("resolved_dominant");
    expect(r.identity_confidence).toBe("high");
    expect(r.resolved_domain).toBe("acme-distributing.com");
  });
  it("two plausible candidates, no clear winner → ambiguous / low / unconfirmed / no domain", () => {
    const r = resolveIdentity({ vendor_name: "Acme", vendor_website: null, candidates: [
      cand("acme-one.com", { name_match: true, registry_hit: true }),
      cand("acme-two.com", { name_match: true, registry_hit: true }),
    ] });
    expect(r.resolution_method).toBe("ambiguous");
    expect(r.identity_unconfirmed).toBe(true);
    expect(r.resolved_domain).toBeNull();
  });
  it("a single WEAK candidate below threshold does NOT resolve (conservative)", () => {
    const r = resolveIdentity({ vendor_name: "Acme", vendor_website: null, candidates: [cand("maybe-acme.com", { name_match: true })] });
    expect(r.resolved_domain).toBeNull();
    expect(r.identity_unconfirmed).toBe(true);
  });
  it("no candidates → unresolved / low / unconfirmed", () => {
    const r = resolveIdentity({ vendor_name: "Ghost Co", vendor_website: null, candidates: [] });
    expect(r.resolution_method).toBe("unresolved");
    expect(r.identity_unconfirmed).toBe(true);
  });
  it("typo on a dominant entity resolves silently — high, NOT ambiguity; original preserved (point 5)", () => {
    // "TD Synexx" (typo) → one dominant well-evidenced candidate. The fuzzy name-match (Task 6 signal
    // derivation) already absorbed the typo, so here name_match=true → dominant → high, no escalation.
    const r = resolveIdentity({ vendor_name: "TD Synexx", vendor_website: null, candidates: [
      cand("tdsynnex.com", { name_match: true, registry_hit: true, self_identifies: true, address_consistent: true }),
    ] });
    expect(r.identity_confidence).toBe("high");
    expect(r.identity_unconfirmed).toBe(false);
    expect(["normalized", "resolved_dominant"]).toContain(r.resolution_method);
    expect(r.original_input.name).toBe("TD Synexx"); // raw client input preserved regardless of resolution
  });
});
