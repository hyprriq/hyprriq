import { describe, it, expect } from "vitest";
import { buildInitialTrackRows } from "./orchestrator";

const intake = { vendor_name: "Acme LLC", brands_submitted: ["Milwaukee"], has_document: true };

describe("buildInitialTrackRows", () => {
  it("produces rows with a UNIFORM key set (PostgREST bulk-insert requires identical keys)", () => {
    const rows = buildInitialTrackRows("case-1", "growth_279", intake);
    const keySets = rows.map((r) => Object.keys(r).sort().join(","));
    expect(new Set(keySets).size).toBe(1); // every row has the same keys, else PGRST102
  });
  it("includes the plan's tracks: single_99 → 0,1,3,5; growth → all six", () => {
    expect(buildInitialTrackRows("c", "single_99", intake).map((r) => r.track_number)).toEqual([0, 1, 3, 5]);
    expect(buildInitialTrackRows("c", "growth_279", intake)).toHaveLength(6);
  });
  it("track_0 is approved intake; finding tracks are manual_required/pending", () => {
    const rows = buildInitialTrackRows("c", "single_99", intake);
    const t0 = rows.find((r) => r.track_number === 0)!;
    expect(t0.founder_review_status).toBe("approved");
    expect(t0.manual_review_required).toBe(false);
    expect(t0.manual_review_reason).toBeNull();
    expect(t0.compiled_findings_json).not.toBeNull();
    const t1 = rows.find((r) => r.track_number === 1)!;
    expect(t1.founder_review_status).toBe("pending");
    expect(t1.manual_review_required).toBe(true);
    expect(t1.compiled_findings_json).toBeNull();
  });
});
