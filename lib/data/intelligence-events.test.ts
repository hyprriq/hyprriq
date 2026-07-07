import { describe, it, expect, vi, beforeEach } from "vitest";
const insert = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: { from: vi.fn(() => ({ insert })) } }));
import { buildInvestigationEvent, recordInvestigationEvent } from "./intelligence-events";
import type { TrackContext, SupplierIdentity } from "@/lib/research/contracts";

const identity = (over: Partial<SupplierIdentity>): SupplierIdentity => ({
  original_input: { name: "TD Synexx", website: null }, resolved_name: "TD Synnex", resolved_domain: "tdsynnex.com",
  candidate_domains: [], registration_signals: [], identity_confidence: "high",
  identity_unconfirmed: false, resolution_method: "resolved_dominant", resolution_notes: "",
  resolution_audit: { winner: "tdsynnex.com", score: 3, runner_up: null, runner_up_score: 0, matched_by: ["name_match"], warnings: [] },
  ...over,
});
const ctx: TrackContext = {
  case_id: "case-1", vendor_name: "TD Synexx", vendor_website: null, attempt_number: 2,
  brands_submitted: ["Lenovo", "Bosch GmbH"], marketplace: "amazon_us", plan_type: "growth_279",
  supplier_identity: identity({}),
};

describe("buildInvestigationEvent (pure — the ledger row is derived ONCE, via researchIdentityFor)", () => {
  it("records the RESOLVED identity, normalized keys, signals, verdict", () => {
    const ev = buildInvestigationEvent(ctx, {
      signals: { supplier_identity: "pass", brand_relationship: "infer" }, verdict: "usable_with_conditions",
      identityFailed: false, identityUnconfirmed: false,
    });
    expect(ev).toMatchObject({
      case_id: "case-1", attempt_number: 2, event_type: "investigation_completed",
      entered_name: "TD Synexx", resolved_name: "TD Synnex", vendor_name_normalized: "td synnex",
      resolved_domain: "tdsynnex.com", identity_unconfirmed: false, identity_failed: false,
      brands: ["Lenovo", "Bosch GmbH"], brands_normalized: ["lenovo", "bosch gmbh"],
      verdict: "usable_with_conditions",
    });
    expect(ev.signals).toEqual({ supplier_identity: "pass", brand_relationship: "infer" });
  });
  it("unconfirmed identity → keyed on the ENTERED name (researchIdentityFor), flag recorded as truth", () => {
    const ev = buildInvestigationEvent(
      { ...ctx, supplier_identity: identity({ identity_unconfirmed: true }) },
      { signals: {}, verdict: "verify_before_purchase", identityFailed: false, identityUnconfirmed: true },
    );
    expect(ev.resolved_name).toBe("TD Synexx"); // SO-2 semantics: what was actually researched
    expect(ev.vendor_name_normalized).toBe("td synexx");
    expect(ev.identity_unconfirmed).toBe(true);
  });
  it("missing attempt_number defaults to 1", () => {
    const ev = buildInvestigationEvent({ ...ctx, attempt_number: undefined }, {
      signals: {}, verdict: null, identityFailed: false, identityUnconfirmed: false,
    });
    expect(ev.attempt_number).toBe(1);
  });
});

describe("recordInvestigationEvent (idempotent append)", () => {
  beforeEach(() => insert.mockReset());
  it("inserted on first write", async () => {
    insert.mockResolvedValue({ error: null });
    expect(await recordInvestigationEvent({} as never)).toEqual({ inserted: true, error: null });
  });
  it("23505 duplicate (Inngest replay) → inserted:false, NO error (already recorded)", async () => {
    insert.mockResolvedValue({ error: { code: "23505", message: "dup" } });
    expect(await recordInvestigationEvent({} as never)).toEqual({ inserted: false, error: null });
  });
  it("real DB error surfaces", async () => {
    insert.mockResolvedValue({ error: { code: "XX000", message: "down" } });
    expect((await recordInvestigationEvent({} as never)).error).toBe("down");
  });
});
