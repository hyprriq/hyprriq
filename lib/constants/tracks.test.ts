import { describe, it, expect } from "vitest";
import { TRACKS, trackByNumber, requiredFindingTracks } from "./tracks";

describe("track registry", () => {
  it("has 6 tracks with unique keys/numbers", () => {
    expect(TRACKS).toHaveLength(6);
    expect(new Set(TRACKS.map((t) => t.track_key)).size).toBe(6);
    expect(new Set(TRACKS.map((t) => t.track_number)).size).toBe(6);
  });
  it("maps number to canonical key", () => {
    expect(trackByNumber(1).track_key).toBe("supplier_identity");
    expect(trackByNumber(0).track_key).toBe("intake_scope_guard");
  });
  it("throws on unknown track number", () => {
    expect(() => trackByNumber(9)).toThrow();
  });
  it("single_99 requires tracks 1,3,5; growth requires 1–5", () => {
    expect(requiredFindingTracks("single_99")).toEqual([1, 3, 5]);
    expect(requiredFindingTracks("growth_279")).toEqual([1, 2, 3, 4, 5]);
    expect(requiredFindingTracks("scale_499")).toEqual([1, 2, 3, 4, 5]);
  });
});
