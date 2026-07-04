import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the data layer + the Track 1 fn so the stage runs in isolation; deriveTrackSignal stays REAL
// (that is the integration we are locking — dedupe feeds the real signal math).
// vi.hoisted so the mock fns exist when the (hoisted) vi.mock factories run.
// H1: the cases mock also serves select (status read in stageFinalize) and a thenable eq (so
// `.update().eq()` can be awaited directly OR chained with `.not()` as in stageSetRunning /
// stagePersistIdentity); audit_log gets its own insert.
const {
  runTrack1, upsertTrackResult, getNextAttemptNumber, resolveSupplierIdentity, writeIntelligence,
  casesUpdate, casesEq, casesNot, statusMaybeSingle, auditInsert,
} = vi.hoisted(() => {
  const casesNot = vi.fn().mockResolvedValue({ error: null });
  // thenable: awaiting `.update().eq()` resolves; chaining `.not()` also works.
  const casesEq = vi.fn(() => ({
    not: casesNot,
    then: (resolve: (v: { error: null }) => void) => resolve({ error: null }),
  }));
  const casesUpdate = vi.fn(() => ({ eq: casesEq }));
  const statusMaybeSingle = vi.fn();
  const auditInsert = vi.fn().mockResolvedValue({ error: null });
  return {
    runTrack1: vi.fn(), upsertTrackResult: vi.fn(), getNextAttemptNumber: vi.fn(),
    resolveSupplierIdentity: vi.fn(), writeIntelligence: vi.fn(),
    casesUpdate, casesEq, casesNot, statusMaybeSingle, auditInsert,
  };
});
vi.mock("@/lib/data/track-results", () => ({ upsertTrackResult, getNextAttemptNumber }));
vi.mock("@/lib/data/intelligence", () => ({ writeIntelligence }));
vi.mock("@/lib/research/track1", () => ({ runTrack1 }));
vi.mock("@/lib/research/track05", () => ({ resolveSupplierIdentity }));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (table: string) =>
      table === "audit_log"
        ? { insert: auditInsert }
        : { update: casesUpdate, select: () => ({ eq: () => ({ maybeSingle: statusMaybeSingle }) }) },
  },
}));

import {
  stageFindingTrack, stageResolveIdentity, stageFinalize, stageResolveAttempt, stageSetRunning, stageMemoryWrite,
} from "./pipeline.steps";
import type { TrackContext, SupplierIdentity } from "@/lib/research/contracts";

const ctx: TrackContext = {
  case_id: "c1", vendor_name: "Acme", vendor_website: null,
  brands_submitted: [], marketplace: "amazon_us", plan_type: "growth_279",
};

const identity = (over: Partial<SupplierIdentity> = {}): SupplierIdentity => ({
  original_input: { name: "Acme", website: null }, resolved_name: "Acme", resolved_domain: null,
  candidate_domains: [], registration_signals: [], identity_confidence: "low",
  identity_unconfirmed: false, resolution_method: "unresolved", resolution_notes: "",
  resolution_audit: { winner: null, score: 0, runner_up: null, runner_up_score: 0, matched_by: [], warnings: [] }, ...over,
});

beforeEach(() => {
  upsertTrackResult.mockReset().mockResolvedValue({ error: null });
  getNextAttemptNumber.mockReset().mockResolvedValue(1);
  runTrack1.mockReset(); resolveSupplierIdentity.mockReset(); writeIntelligence.mockReset();
  casesUpdate.mockClear(); casesEq.mockClear(); casesNot.mockClear();
  auditInsert.mockClear();
  // default: a non-terminal case (finalize proceeds with the full update)
  statusMaybeSingle.mockReset().mockResolvedValue({ data: { status: "research_running" } });
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

// ── H1 — Case Investigation Ledger ──

describe("H1 attempt threading", () => {
  it("stageFindingTrack writes the ctx attempt_number onto the row", async () => {
    runTrack1.mockResolvedValue({ track_key: "supplier_identity", evidence_items: [], reasoning_notes: "n", unknowns: [], weight_validation: [], acquisition_failed: true });
    await stageFindingTrack({ ...ctx, attempt_number: 3 }, 1);
    expect(upsertTrackResult.mock.calls[0][0].attempt_number).toBe(3);
  });

  it("stageResolveAttempt returns the next attempt and audit-logs a re-investigation", async () => {
    getNextAttemptNumber.mockResolvedValueOnce(2);
    const attempt = await stageResolveAttempt("c1");
    expect(attempt).toBe(2);
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({ record_id: "c1", new_value: { reinvestigation_attempt: 2 } }));
  });

  it("stageResolveAttempt does NOT audit-log a first run", async () => {
    getNextAttemptNumber.mockResolvedValueOnce(1);
    await stageResolveAttempt("c1");
    expect(auditInsert).not.toHaveBeenCalled();
  });

  it("stageSetRunning guards the status flip so delivered/complete cases are untouched", async () => {
    await stageSetRunning("c1");
    expect(casesNot).toHaveBeenCalledWith("status", "in", "(delivered,complete)");
  });

  it("stageMemoryWrite fires on a first attempt", async () => {
    await stageMemoryWrite({ ...ctx, attempt_number: 1 }, "pass", false);
    expect(writeIntelligence).toHaveBeenCalledOnce();
  });

  it("stageMemoryWrite skips re-runs (attempt > 1) so the corpus never double-counts", async () => {
    await stageMemoryWrite({ ...ctx, attempt_number: 2 }, "pass", false);
    expect(writeIntelligence).not.toHaveBeenCalled();
  });
});

describe("H1 stageFinalize immutability (delivered cases are frozen)", () => {
  const args = { included: new Set([1, 2]), identityAcquisitionFailed: false, verdict: "do_not_rely", confidence_0_15: 3 };
  const lastUpdate = () => (casesUpdate.mock.calls as unknown as Record<string, unknown>[][])[0][0];

  it("on a DELIVERED case only reinvestigation_pending is set; verdict/status untouched", async () => {
    statusMaybeSingle.mockResolvedValueOnce({ data: { status: "delivered" } });
    await stageFinalize({ ...ctx, attempt_number: 2 }, args);
    expect(lastUpdate()).toEqual({ reinvestigation_pending: true });
  });

  it("on a COMPLETE case only reinvestigation_pending is set", async () => {
    statusMaybeSingle.mockResolvedValueOnce({ data: { status: "complete" } });
    await stageFinalize({ ...ctx, attempt_number: 2 }, args);
    expect(lastUpdate()).toEqual({ reinvestigation_pending: true });
  });

  it("on a non-delivered case the full case update proceeds as before", async () => {
    statusMaybeSingle.mockResolvedValueOnce({ data: { status: "research_running" } });
    await stageFinalize(ctx, { ...args, verdict: "verify_before_purchase", confidence_0_15: 7 });
    expect(lastUpdate()).toMatchObject({ status: "awaiting_review", verdict: "verify_before_purchase" });
  });
});
