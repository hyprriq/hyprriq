import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Sweep fix F3 (founder-approved 2026-07-14; H1 integrity weight) — the review route's FIRST
// test file. Request Further Investigation pre-flipped status to research_running with NO
// delivered-guard, so the re-run's finalize saw a non-delivered status and overwrote the live
// verdict/status of a DELIVERED case through the NORMAL flow (delivered_at/delivered_attempt
// stranded). The fix: guard the pre-flip; the enqueue stays (a delivered case still gets its
// genuine new attempt + reinvestigation_pending per H1). ──
const { auth, caseMaybeSingle, roleMaybeSingle, casesUpdate, casesNot, casesEq, auditInsert, inngestSend } = vi.hoisted(() => {
  const casesNot = vi.fn();
  const casesEq = vi.fn();
  const chain: Record<string, unknown> = {};
  Object.assign(chain, {
    not: casesNot.mockImplementation(() => chain),
    eq: casesEq.mockImplementation(() => chain),
    then: (resolve: (v: { error: null }) => void) => resolve({ error: null }),
  });
  return {
    auth: vi.fn().mockResolvedValue({ userId: "admin_1" }),
    caseMaybeSingle: vi.fn(),
    roleMaybeSingle: vi.fn().mockResolvedValue({ data: { role: "admin" } }),
    casesUpdate: vi.fn(() => chain),
    casesNot, casesEq,
    auditInsert: vi.fn().mockResolvedValue({ error: null }),
    inngestSend: vi.fn().mockResolvedValue(undefined),
  };
});
vi.mock("@clerk/nextjs/server", () => ({ auth }));
vi.mock("@/lib/inngest/client", () => ({ inngest: { send: inngestSend } }));
vi.mock("@/lib/data/track-results", () => ({ getCaseTrackResults: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/data/outcomes", () => ({ seedCaseOutcome: vi.fn().mockResolvedValue({ error: null }) }));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === "audit_log") return { insert: auditInsert };
      if (table === "clients") return { select: () => ({ eq: () => ({ maybeSingle: roleMaybeSingle }) }) };
      // cases
      return {
        select: () => ({ eq: () => ({ maybeSingle: caseMaybeSingle }) }),
        update: casesUpdate,
      };
    },
  },
}));

import { POST } from "./route";

const caseRow = (status: string) => ({
  id: "c1", case_number: "AWI-1", status, verdict: "source_clear", vendor_name: "Acme",
  vendor_website: null, brands_submitted: [], brands_confirmed: null, marketplace: "amazon_us",
  plan_type: "growth_279", supplier_identity: null,
});

const rfi = () =>
  POST(
    new Request("http://test/api/admin/cases/c1/review", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "request_investigation", reason: "client asked for more evidence" }),
    }),
    { params: Promise.resolve({ id: "c1" }) },
  );

beforeEach(() => {
  caseMaybeSingle.mockReset();
  casesUpdate.mockClear(); casesNot.mockClear(); casesEq.mockClear();
  auditInsert.mockClear(); inngestSend.mockClear();
});

describe("F3 — Request Further Investigation respects the H1 freeze", () => {
  it("on a DELIVERED case: re-run is enqueued, but the status pre-flip is delivered-guarded and the response says the record stays frozen", async () => {
    caseMaybeSingle.mockResolvedValue({ data: caseRow("delivered") });
    const res = await rfi();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(inngestSend).toHaveBeenCalledOnce(); // the genuine new attempt still runs (H1 semantics)
    // the status update carries the same delivered-guard every other write site has
    expect(casesNot).toHaveBeenCalledWith("status", "in", "(delivered,complete)");
    expect(json.status).toBe("delivered"); // the live record stays frozen; reinvestigation_pending flags on completion
  });

  it("on a NON-delivered case: status flips to research_running as before (two-sided)", async () => {
    caseMaybeSingle.mockResolvedValue({ data: caseRow("awaiting_review") });
    const res = await rfi();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(inngestSend).toHaveBeenCalledOnce();
    expect(casesNot).toHaveBeenCalledWith("status", "in", "(delivered,complete)");
    expect(json.status).toBe("research_running");
  });
});
