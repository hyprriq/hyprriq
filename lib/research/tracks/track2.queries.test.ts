import { describe, it, expect } from "vitest";
import { buildTrack2Requests } from "./track2.queries";
import type { TrackContext } from "@/lib/research/contracts";

const ctx = (over: Partial<TrackContext> = {}): TrackContext => ({
  case_id: "c1", vendor_name: "TD Synnex", vendor_website: null,
  brands_submitted: ["Lenovo", "Bosch"], marketplace: "amazon_us", plan_type: "growth_279", ...over,
});

describe("buildTrack2Requests", () => {
  it("parameterizes by vendor + brand, per brand", () => {
    const reqs = buildTrack2Requests(ctx());
    expect(reqs.some((r) => r.input === "TD Synnex authorized distributor Lenovo")).toBe(true);
    expect(reqs.some((r) => r.input === "TD Synnex authorized distributor Bosch")).toBe(true);
    expect(reqs.some((r) => r.input.includes("grey market"))).toBe(true);
  });
  it("emits one block of active queries per brand (6 active × 2 brands = 12)", () => {
    expect(buildTrack2Requests(ctx())).toHaveLength(12);
  });
  it("omits available:false stubs (brand_direct_api, distributor_registry)", () => {
    const inputs = buildTrack2Requests(ctx()).map((r) => r.input).join(" ");
    expect(inputs).not.toMatch(/direct.?api|distributor.registry/i);
  });
  it("no brands → no requests", () => {
    expect(buildTrack2Requests(ctx({ brands_submitted: [] }))).toHaveLength(0);
  });
});

// H4 — same lock for Track 2: brand terms stay, but the vendor is the RESOLVED entity.
describe("H4 — buildTrack2Requests researches the resolved entity", () => {
  it("with a confirmed resolved identity, every vendor-bearing query names the resolved entity, never the entered name", () => {
    const reqs = buildTrack2Requests(ctx({
      vendor_name: "Bosch",
      supplier_identity: {
        original_input: { name: "Bosch", website: "https://globaldist.com" },
        resolved_name: "Global Distribution LLC", resolved_domain: "globaldist.com",
        candidate_domains: [], registration_signals: [], identity_confidence: "high",
        identity_unconfirmed: false, resolution_method: "resolved_from_website", resolution_notes: "",
        resolution_audit: { winner: "globaldist.com", score: 0, runner_up: null, runner_up_score: 0, matched_by: [], warnings: [] },
      },
    }));
    expect(reqs.some((r) => r.input === "Global Distribution LLC authorized distributor Lenovo")).toBe(true);
    // brand terms survive; the entered vendor name appears ONLY where it IS the brand term
    const vendorBearing = reqs.filter((r) => !r.input.startsWith("Lenovo ") && !r.input.startsWith("Bosch "));
    for (const r of vendorBearing) expect(r.input).toContain("Global Distribution LLC");
  });
});
