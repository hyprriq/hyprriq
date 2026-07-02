import { describe, it, expect } from "vitest";
import { buildTrack1Requests, TRACK1_CAPABILITIES } from "./track1.queries";
import type { TrackContext, SupplierIdentity } from "@/lib/research/contracts";

const ctx = (over: Partial<TrackContext> = {}): TrackContext => ({
  case_id: "c1", vendor_name: "Meridian Wholesale Co.", vendor_website: "https://meridian-wholesale.example",
  brands_submitted: [], marketplace: "amazon_us", plan_type: "growth_279", ...over,
});

const si = (resolved_domain: string | null): SupplierIdentity => ({
  original_input: { name: "Meridian Wholesale Co.", website: null }, resolved_name: "Meridian Wholesale Co.",
  resolved_domain, candidate_domains: [], registration_signals: [], identity_confidence: resolved_domain ? "high" : "low",
  identity_unconfirmed: !resolved_domain, resolution_method: resolved_domain ? "resolved_dominant" : "unresolved",
  resolution_notes: "", resolution_audit: { winner: resolved_domain, score: 0, runner_up: null, runner_up_score: 0, matched_by: [], warnings: [] },
});

const domainAge = (c: TrackContext) => buildTrack1Requests(c).find((r) => r.question === "domain_age")?.input;

describe("TRACK1_CAPABILITIES", () => {
  it("declares the six active capabilities and six unavailable future stubs", () => {
    const active = TRACK1_CAPABILITIES.filter((c) => c.available).map((c) => c.capability_key);
    expect(active).toEqual(expect.arrayContaining(["domain_age", "business_registry", "linkedin_presence", "bbb_listing", "address_verification", "scam_reports"]));
    const stubs = TRACK1_CAPABILITIES.filter((c) => !c.available).map((c) => c.capability_key);
    expect(stubs).toEqual(expect.arrayContaining(["secretary_of_state_direct", "duns_registry", "vat_gst_registry", "google_business_profile", "import_records", "trademark_registry"]));
  });
  it("every unavailable capability has a null plugin and a reason", () => {
    for (const c of TRACK1_CAPABILITIES.filter((c) => !c.available)) {
      expect(c.plugin).toBeNull();
      expect(typeof c.reason_unavailable).toBe("string");
    }
  });
});

describe("buildTrack1Requests", () => {
  it("emits requests only for available capabilities", () => {
    const reqs = buildTrack1Requests(ctx());
    const qs = reqs.map((r) => r.question);
    expect(qs).toEqual(expect.arrayContaining(["business_registry", "linkedin_presence", "bbb_listing", "address_verification", "scam_reports"]));
    // none of the stub capability_keys leak into requests
    expect(qs).not.toContain("secretary_of_state_direct");
  });
  it("includes a domain_age request using the website host", () => {
    expect(buildTrack1Requests(ctx()).find((r) => r.question === "domain_age")?.input).toBe("meridian-wholesale.example");
  });
  it("omits domain_age when there is no website AND no resolved identity", () => {
    expect(buildTrack1Requests(ctx({ vendor_website: null })).some((r) => r.question === "domain_age")).toBe(false);
  });

  // OQ-2 retrofit — Track 1 consumes the Track 0.5 resolved_domain:
  it("gains domain_age from resolved_domain when the website is BLANK (strictly additive)", () => {
    expect(domainAge(ctx({ vendor_website: null, supplier_identity: si("meridian-wholesale.com") }))).toBe("meridian-wholesale.com");
  });
  it("prefers the high-confidence resolved_domain over the raw website", () => {
    expect(domainAge(ctx({ vendor_website: "https://old-site.example", supplier_identity: si("meridian-wholesale.com") }))).toBe("meridian-wholesale.com");
  });
  it("falls back to the website host when identity did not resolve (resolved_domain null)", () => {
    expect(domainAge(ctx({ supplier_identity: si(null) }))).toBe("meridian-wholesale.example");
  });
  it("still omits domain_age when neither a website nor a resolved_domain exists", () => {
    expect(domainAge(ctx({ vendor_website: null, supplier_identity: si(null) }))).toBeUndefined();
  });
});
