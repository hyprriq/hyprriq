import { describe, it, expect } from "vitest";
import { researchIdentityFor } from "./researchIdentity";
import type { TrackContext, SupplierIdentity } from "@/lib/research/contracts";

const ctx: TrackContext = {
  case_id: "c1", vendor_name: "Acme", vendor_website: null,
  brands_submitted: [], marketplace: "amazon_us", plan_type: "growth_279",
};

const identity = (over: Partial<SupplierIdentity> = {}): SupplierIdentity => ({
  original_input: { name: "Acme", website: null }, resolved_name: "Acme", resolved_domain: null,
  candidate_domains: [], registration_signals: [], identity_confidence: "high",
  identity_unconfirmed: false, resolution_method: "provided", resolution_notes: "",
  resolution_audit: { winner: null, score: 0, runner_up: null, runner_up_score: 0, matched_by: [], warnings: [] }, ...over,
});

// H4 — one shared selector decides WHO the tracks investigate (the H3 one-function-all-sites rule).
describe("researchIdentityFor", () => {
  it("uses the RESOLVED entity when identity is confirmed, with the entered name as alias", () => {
    const r = researchIdentityFor({
      ...ctx, vendor_name: "Bosch",
      supplier_identity: identity({ resolved_name: "Global Distribution LLC", resolved_domain: "globaldist.com", resolution_method: "resolved_from_website" }),
    });
    expect(r.name).toBe("Global Distribution LLC");
    expect(r.alias).toBe("Bosch");
    expect(r.domain).toBe("globaldist.com");
  });

  it("matched path: resolved == entered → no alias noise", () => {
    const r = researchIdentityFor({
      ...ctx, vendor_name: "TD Synnex",
      supplier_identity: identity({ resolved_name: "TD Synnex", resolved_domain: "tdsynnex.com" }),
    });
    expect(r.name).toBe("TD Synnex");
    expect(r.alias).toBeNull();
  });

  it("alias comparison is normalization-aware (suffix/case differences are not an alias)", () => {
    const r = researchIdentityFor({
      ...ctx, vendor_name: "TD Synnex LLC",
      supplier_identity: identity({ resolved_name: "TD SYNNEX" }),
    });
    expect(r.alias).toBeNull(); // normalizeName collapses both to the same key
  });

  it("SO-2: unconfirmed identity → entered name (case escalates; research aids the human)", () => {
    const r = researchIdentityFor({
      ...ctx, vendor_name: "Acme",
      supplier_identity: identity({ resolved_name: "Something Else", identity_unconfirmed: true, resolution_method: "ambiguous" }),
    });
    expect(r.name).toBe("Acme");
    expect(r.alias).toBeNull();
  });

  it("no identity at all (defensive) → entered name", () => {
    expect(researchIdentityFor({ ...ctx, vendor_name: "Acme", supplier_identity: undefined }).name).toBe("Acme");
  });
});
