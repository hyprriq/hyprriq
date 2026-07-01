import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the data layer + the Track 1 fn so the stage runs in isolation; deriveTrackSignal stays REAL
// (that is the integration we are locking — dedupe feeds the real signal math).
// vi.hoisted so the mock fns exist when the (hoisted) vi.mock factories run.
const { runTrack1, upsertTrackResult, resolveSupplierIdentity, casesUpdate, casesEq } = vi.hoisted(() => {
  const casesEq = vi.fn().mockResolvedValue({ error: null });
  const casesUpdate = vi.fn(() => ({ eq: casesEq }));
  return { runTrack1: vi.fn(), upsertTrackResult: vi.fn(), resolveSupplierIdentity: vi.fn(), casesUpdate, casesEq };
});
vi.mock("@/lib/data/track-results", () => ({ upsertTrackResult }));
vi.mock("@/lib/research/track1", () => ({ runTrack1 }));
vi.mock("@/lib/research/track05", () => ({ resolveSupplierIdentity }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: { from: () => ({ update: casesUpdate }) } }));

import { stageFindingTrack, stageResolveIdentity, stageFinalize } from "./pipeline.steps";
import type { TrackContext, SupplierIdentity } from "@/lib/research/contracts";

const ctx: TrackContext = {
  case_id: "c1", vendor_name: "Acme", vendor_website: null,
  brands_submitted: [], marketplace: "amazon_us", plan_type: "growth_279",
};

const identity = (over: Partial<SupplierIdentity> = {}): SupplierIdentity => ({
  original_input: { name: "Acme", website: null }, resolved_name: "Acme", resolved_domain: null,
  candidate_domains: [], registration_signals: [], identity_confidence: "low",
  identity_unconfirmed: false, resolution_method: "unresolved", resolution_notes: "", ...over,
});

beforeEach(() => {
  upsertTrackResult.mockReset().mockResolvedValue({ error: null });
  runTrack1.mockReset(); resolveSupplierIdentity.mockReset();
  casesUpdate.mockClear(); casesEq.mockClear().mockResolvedValue({ error: null });
});

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

describe("stageResolveIdentity", () => {
  it("returns the SupplierIdentity from resolveSupplierIdentity", async () => {
    const resolved = identity({ resolved_domain: "tdsynnex.com", identity_confidence: "high", resolution_method: "provided" });
    resolveSupplierIdentity.mockResolvedValue(resolved);
    expect(await stageResolveIdentity(ctx)).toBe(resolved);
    expect(resolveSupplierIdentity).toHaveBeenCalledWith(ctx);
  });
});

describe("stageFinalize identity escalation", () => {
  const args = (over: object) => ({ included: new Set([1, 2]), identityAcquisitionFailed: false, verdict: "verify_before_purchase", confidence_0_15: 7, ...over });
  // casesUpdate's impl takes no params, so its call tuple is empty at the type level — read the update via a cast.
  const lastUpdate = () => (casesUpdate.mock.calls as unknown as Record<string, unknown>[][])[0][0];

  it("an unconfirmed identity escalates the case to manual_override_required", async () => {
    await stageFinalize(ctx, args({ identityUnconfirmed: true }));
    expect(lastUpdate().status).toBe("manual_override_required");
  });
  it("a confirmed identity leaves the case at awaiting_review", async () => {
    await stageFinalize(ctx, args({ identityUnconfirmed: false }));
    expect(lastUpdate().status).toBe("awaiting_review");
  });
});
