import { describe, it, expect } from "vitest";
import { evaluateReportReady } from "./founder-review";
import type { TrackResultRow } from "@/lib/data/track-results";

const row = (
  n: number,
  status: TrackResultRow["founder_review_status"],
  hasFindings: boolean,
): TrackResultRow => ({
  id: String(n), case_id: "c", track: `track_${n}`, track_key: "x", track_number: n,
  source_mode: "manual_override", compiled_findings_json: hasFindings ? { ok: true } : null,
  confidence_score: null, confidence_band: null, finding_certainty: null,
  founder_review_status: status, manual_review_required: false, manual_review_reason: null,
  manual_notes: null, attempt_number: 1,
});

describe("evaluateReportReady", () => {
  it("true when all required (1,3,5) approved/edited with findings", () => {
    const rows = [row(1, "approved", true), row(3, "edited", true), row(5, "approved", true)];
    expect(evaluateReportReady("single_99", rows)).toBe(true);
  });
  it("false when a required track is still pending", () => {
    const rows = [row(1, "approved", true), row(3, "pending", true), row(5, "approved", true)];
    expect(evaluateReportReady("single_99", rows)).toBe(false);
  });
  it("false when a required track lacks findings", () => {
    const rows = [row(1, "approved", true), row(3, "approved", false), row(5, "approved", true)];
    expect(evaluateReportReady("single_99", rows)).toBe(false);
  });
  it("growth requires all five finding tracks", () => {
    const rows = [1, 2, 3, 4].map((n) => row(n, "approved", true)); // missing track 5
    expect(evaluateReportReady("growth_279", rows)).toBe(false);
  });
});
