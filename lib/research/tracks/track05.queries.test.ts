import { describe, it, expect } from "vitest";
import { buildIdentityRequests, TRACK05_CAPABILITIES } from "./track05.queries";
import type { TrackContext } from "@/lib/research/contracts";

const ctx = (over: Partial<TrackContext> = {}): TrackContext => ({
  case_id: "c1", vendor_name: "TD Synexx", vendor_website: null,
  brands_submitted: [], marketplace: "amazon_us", plan_type: "growth_279", ...over,
});

describe("TRACK05_CAPABILITIES", () => {
  it("declares identity-discovery capabilities reusing existing routable questions", () => {
    const active = TRACK05_CAPABILITIES.filter((c) => c.available).map((c) => c.capability_key);
    expect(active).toEqual(expect.arrayContaining(["business_registry", "official_site", "address_verification"]));
    // out-of-scope integrations are declared but unavailable (no DUNS/VAT this phase)
    const stubs = TRACK05_CAPABILITIES.filter((c) => !c.available).map((c) => c.capability_key);
    expect(stubs).toEqual(expect.arrayContaining(["duns_registry", "vat_gst_registry"]));
  });
  it("every unavailable capability has a null plugin and a reason", () => {
    for (const c of TRACK05_CAPABILITIES.filter((c) => !c.available)) {
      expect(c.plugin).toBeNull();
      expect(typeof c.reason_unavailable).toBe("string");
    }
  });
});

describe("buildIdentityRequests", () => {
  it("emits identity-discovery requests keyed to the vendor name", () => {
    const reqs = buildIdentityRequests(ctx());
    const qs = reqs.map((r) => r.question);
    expect(qs).toEqual(expect.arrayContaining(["business_registry", "linkedin_presence", "address_verification"]));
    // every query string carries the vendor name
    expect(reqs.every((r) => r.input.includes("TD Synexx"))).toBe(true);
  });
  it("only routes through questions the serper/native plugins already handle (no frozen-union change)", () => {
    const routable = new Set([
      "business_registry", "linkedin_presence", "bbb_listing", "address_verification",
      "contact_consistency", "scam_reports",
    ]);
    expect(buildIdentityRequests(ctx()).every((r) => routable.has(r.question))).toBe(true);
  });
  it("returns no requests when the vendor name is blank", () => {
    expect(buildIdentityRequests(ctx({ vendor_name: null }))).toEqual([]);
  });
});
