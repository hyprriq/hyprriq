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
