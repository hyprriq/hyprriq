import { describe, it, expect } from "vitest";
import { TRACK3_CAPABILITIES, buildTrack3Requests } from "./track3.queries";
import type { TrackContext } from "@/lib/research/contracts";

const ctx = (brands: string[]): TrackContext => ({
  case_id: "c1", vendor_name: "Acme Corp", vendor_website: null,
  brands_submitted: brands, marketplace: "amazon_us", plan_type: "growth_279",
});

describe("Track 3 capability matrix + query builder (brand-scoped)", () => {
  it("Keepa is declared unavailable (OQ-A: fast-follow gate; keys inert until the plugin ships)", () => {
    const keepa = TRACK3_CAPABILITIES.find((c) => c.capability_key === "keepa_history");
    expect(keepa?.available).toBe(false);
    expect(keepa?.reason_unavailable).toContain("Keepa");
  });

  it("builds one query per (active capability × brand) — the BRAND is the subject, not the vendor", () => {
    const active = TRACK3_CAPABILITIES.filter((c) => c.available && c.question).length;
    const reqs = buildTrack3Requests(ctx(["Bosch", "Dell"]));
    expect(reqs).toHaveLength(active * 2);
    expect(reqs.every((r) => r.input.includes("Bosch") || r.input.includes("Dell"))).toBe(true);
    expect(reqs.some((r) => r.input.includes("Acme"))).toBe(false); // Amendment 2: brand posture, not the vendor
  });

  it("no brands → no queries (nothing to research)", () => {
    expect(buildTrack3Requests(ctx([]))).toEqual([]);
  });
});
