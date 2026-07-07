import { describe, it, expect, vi, beforeEach } from "vitest";

// H6 — profiles are ROLLUPS of the intelligence_events ledger. The compute fns are pure (tested
// directly); writeIntelligence's GATING (event always; rollups only on fresh insert + confirmed
// identity) is locked with the events module + supabase mocked.
const { buildInvestigationEvent, recordInvestigationEvent, fromCalls, selectChainResult, upsertByTable, auditInsert } = vi.hoisted(() => {
  const fromCalls: string[] = [];
  const selectChainResult: { data: unknown[]; error: { message: string } | null } = { data: [], error: null };
  const upsertByTable: Record<string, ReturnType<typeof vi.fn>> = {};
  const auditInsert = vi.fn().mockResolvedValue({ error: null });
  return {
    buildInvestigationEvent: vi.fn(),
    recordInvestigationEvent: vi.fn(),
    fromCalls, selectChainResult, upsertByTable, auditInsert,
  };
});
vi.mock("@/lib/data/intelligence-events", () => ({ buildInvestigationEvent, recordInvestigationEvent }));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      fromCalls.push(table);
      if (table === "audit_log") return { insert: auditInsert };
      if (!upsertByTable[table]) upsertByTable[table] = vi.fn().mockResolvedValue({ error: null });
      const chain: Record<string, unknown> = {};
      chain.eq = vi.fn(() => chain);
      chain.contains = vi.fn(() => chain);
      chain.then = (resolve: (v: typeof selectChainResult) => void) => resolve(selectChainResult);
      return { select: vi.fn(() => chain), upsert: upsertByTable[table] };
    },
  },
}));

import { computeVendorRollup, computeBrandRollup, writeIntelligence, type LedgerEvent } from "./intelligence";
import type { TrackContext } from "@/lib/research/contracts";

const ev = (over: Partial<LedgerEvent>): LedgerEvent => ({
  case_id: "c1", attempt_number: 1, entered_name: "TD Synnex", resolved_name: "TD Synnex",
  vendor_name_normalized: "td synnex", resolved_domain: "tdsynnex.com",
  identity_unconfirmed: false, identity_failed: false,
  brands: ["Lenovo"], brands_normalized: ["lenovo"],
  signals: { supplier_identity: "pass" }, verdict: "usable_with_conditions",
  created_at: "2026-07-06T10:00:00Z", ...over,
});

describe("computeVendorRollup (profiles are RECOMPUTABLE from the ledger — one fn, all sites)", () => {
  it("case_count = DISTINCT cases, never attempts (B6)", () => {
    const r = computeVendorRollup("td synnex", [
      ev({ case_id: "c1", attempt_number: 1 }), ev({ case_id: "c1", attempt_number: 2 }), ev({ case_id: "c2" }),
    ]);
    expect(r.case_count).toBe(2);
  });
  it("merges brands + aliases; carries resolved_domain; risk_history is per-event, chronological", () => {
    const r = computeVendorRollup("td synnex", [
      ev({ case_id: "c1", entered_name: "TD Synexx", brands_normalized: ["lenovo"], created_at: "2026-07-01T00:00:00Z" }),
      ev({ case_id: "c2", brands_normalized: ["microsoft"], created_at: "2026-07-02T00:00:00Z" }),
    ]);
    expect(r.known_brand_relationships).toEqual(["lenovo", "microsoft"]);
    expect(r.entered_names).toEqual(["TD Synexx"]);
    expect(r.resolved_domain).toBe("tdsynnex.com");
    expect(r.risk_history).toHaveLength(2);
    expect(r.risk_history[0]).toMatchObject({ case_id: "c1", attempt_number: 1, signal: "pass", verdict: "usable_with_conditions" });
    expect(r.vendor_name).toBe("TD Synnex");
    expect(r.last_reviewed_at).toBe("2026-07-02T00:00:00Z");
  });
  it("overall_risk_signal = latest event WITH an identity signal (a null run never erases history)", () => {
    const r = computeVendorRollup("td synnex", [
      ev({ signals: { supplier_identity: "flag" }, created_at: "2026-07-01T00:00:00Z" }),
      ev({ case_id: "c2", signals: {}, created_at: "2026-07-02T00:00:00Z" }),
    ]);
    expect(r.overall_risk_signal).toBe("flag");
  });
});

describe("computeBrandRollup", () => {
  it("case_count = distinct cases naming the brand; display name from the latest event", () => {
    const r = computeBrandRollup("lenovo", [
      ev({ case_id: "c1", brands: ["Lenovo"], brands_normalized: ["lenovo"] }),
      ev({ case_id: "c1", attempt_number: 2, brands: ["Lenovo"], brands_normalized: ["lenovo"] }),
      ev({ case_id: "c3", brands: ["Lenovo"], brands_normalized: ["lenovo"] }),
    ]);
    expect(r.case_count).toBe(2);
    expect(r.brand_name).toBe("Lenovo");
    expect(r.brand_name_normalized).toBe("lenovo");
  });
});

describe("writeIntelligence gating (H6: event always; rollups only on fresh insert + confirmed identity)", () => {
  const ctx = { case_id: "c1", vendor_name: "TD Synnex", brands_submitted: ["Lenovo"] } as unknown as TrackContext;
  const args = { signals: {}, verdict: "source_clear", identityFailed: false, identityUnconfirmed: false };
  const confirmedEvent = ev({});

  beforeEach(() => {
    fromCalls.length = 0;
    selectChainResult.data = []; selectChainResult.error = null;
    auditInsert.mockClear();
    for (const k of Object.keys(upsertByTable)) upsertByTable[k].mockClear();
    buildInvestigationEvent.mockReset().mockReturnValue(confirmedEvent);
    recordInvestigationEvent.mockReset().mockResolvedValue({ inserted: true, error: null });
  });

  it("fresh insert + confirmed → rollups fetch the ledger", async () => {
    const r = await writeIntelligence(ctx, args);
    expect(recordInvestigationEvent).toHaveBeenCalledWith(confirmedEvent);
    expect(fromCalls).toContain("intelligence_events"); // rollup fetch fired
    expect(r.degraded).toBe(false);
  });
  it("replay (inserted:false) → NO rollup work", async () => {
    recordInvestigationEvent.mockResolvedValue({ inserted: false, error: null });
    await writeIntelligence(ctx, args);
    expect(fromCalls).not.toContain("intelligence_events");
  });
  it("unconfirmed identity → event recorded, profiles untouched (AT-3 unit backstop)", async () => {
    buildInvestigationEvent.mockReturnValue(ev({ identity_unconfirmed: true }));
    await writeIntelligence(ctx, args);
    expect(recordInvestigationEvent).toHaveBeenCalledOnce();
    expect(fromCalls).not.toContain("intelligence_events");
    expect(fromCalls).not.toContain("vendor_intelligence");
  });
  it("identity failed (H2 class) → event recorded, profiles untouched", async () => {
    buildInvestigationEvent.mockReturnValue(ev({ identity_failed: true }));
    await writeIntelligence(ctx, args);
    expect(fromCalls).not.toContain("vendor_intelligence");
  });
  it("loud-but-non-fatal contract: an event write error → audit_log row + degraded:true", async () => {
    recordInvestigationEvent.mockResolvedValue({ inserted: false, error: "down" });
    const r = await writeIntelligence(ctx, args);
    expect(auditInsert).toHaveBeenCalledOnce();
    expect(r.degraded).toBe(true);
  });
  it("rollup upsert lands on vendor_intelligence when the ledger has confirmed events", async () => {
    selectChainResult.data = [ev({})];
    await writeIntelligence(ctx, args);
    expect(upsertByTable["vendor_intelligence"]).toHaveBeenCalledWith(
      expect.objectContaining({ vendor_name_normalized: "td synnex", case_count: 1 }),
      { onConflict: "vendor_name_normalized" },
    );
    expect(upsertByTable["brand_intelligence"]).toHaveBeenCalledWith(
      expect.objectContaining({ brand_name_normalized: "lenovo", case_count: 1 }),
      { onConflict: "brand_name_normalized" },
    );
  });
});
