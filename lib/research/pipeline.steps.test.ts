import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the data layer + the Track 1 fn so the stage runs in isolation; deriveTrackSignal stays REAL
// (that is the integration we are locking — dedupe feeds the real signal math).
// vi.hoisted so the mock fns exist when the (hoisted) vi.mock factories run.
const { runTrack1, upsertTrackResult } = vi.hoisted(() => ({ runTrack1: vi.fn(), upsertTrackResult: vi.fn() }));
vi.mock("@/lib/data/track-results", () => ({ upsertTrackResult }));
vi.mock("@/lib/research/track1", () => ({ runTrack1 }));

import { stageFindingTrack } from "./pipeline.steps";

const ctx = {
  case_id: "c1", vendor_name: "Acme", vendor_website: null,
  brands_submitted: [], marketplace: "amazon_us", plan_type: "growth_279",
} as const;

beforeEach(() => { upsertTrackResult.mockReset().mockResolvedValue({ error: null }); runTrack1.mockReset(); });

describe("stageFindingTrack", () => {
  it("dedupes evidence_types before deriving the signal (anti-double-count preserved)", async () => {
    // Same weight_key from TWO sources — must score ONCE.
    runTrack1.mockResolvedValue({
      track_key: "supplier_identity",
      evidence_items: [
        { evidence_id: "e1", weight_key: "government_registration", statement: "", certainty: "verified", source_type: "government_record", source_url: null, claimant: "x", claimant_benefits: false, supports: "supplier_identity" },
        { evidence_id: "e2", weight_key: "government_registration", statement: "", certainty: "verified", source_type: "government_record", source_url: null, claimant: "x", claimant_benefits: false, supports: "supplier_identity" },
      ],
      reasoning_notes: "n", unknowns: [], weight_validation: [], acquisition_failed: false,
    });

    const r = await stageFindingTrack(ctx, 1);

    expect(r.acquisition_failed).toBe(false);
    expect(r.signal).toBeDefined();
    expect(upsertTrackResult).toHaveBeenCalledOnce();
    const row = upsertTrackResult.mock.calls[0][0];
    // the duplicated key collapses to a single applied weight (the dedupe), not two
    expect(row.evidence_weights_applied).toHaveLength(1);
  });

  it("acquisition failure → n_a, manual_review_required, no scoring", async () => {
    runTrack1.mockResolvedValue({
      track_key: "supplier_identity", evidence_items: [], reasoning_notes: "no sources",
      unknowns: [], weight_validation: [], acquisition_failed: true,
    });
    const r = await stageFindingTrack(ctx, 1);
    expect(r.signal).toBe("n_a");
    expect(r.acquisition_failed).toBe(true);
    const row = upsertTrackResult.mock.calls[0][0];
    expect(row.manual_review_required).toBe(true);
    expect(row.track_verdict_signal).toBe("n_a");
  });
});
