import { describe, it, expect } from "vitest";
import { buildTrack1Requests, TRACK1_CAPABILITIES } from "./track1.queries";
import type { TrackContext } from "@/lib/research/contracts";

const ctx = (over: Partial<TrackContext> = {}): TrackContext => ({
  case_id: "c1", vendor_name: "Meridian Wholesale Co.", vendor_website: "https://meridian-wholesale.example",
  brands_submitted: [], marketplace: "amazon_us", plan_type: "growth_279", ...over,
});

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
  it("omits domain_age when there is no website", () => {
    expect(buildTrack1Requests(ctx({ vendor_website: null })).some((r) => r.question === "domain_age")).toBe(false);
  });
});
