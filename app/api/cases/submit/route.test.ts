import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Sweep F6 (founder-approved 2026-07-14) — the submit route's FIRST test file, prioritized on
// the MONEY-PATH ordering: validation (incl. the 5-file cap) must reject BEFORE any credit
// deduction. Pre-F6 the cap was locked only at the pure-function level (uploads.test.ts); the
// route-side enforcement and the reject-before-charge ordering were unlocked — a reorder putting
// the charge above validation would have shipped silently. ──
const { auth, clientMaybeSingle, rpc, inngestSend } = vi.hoisted(() => ({
  auth: vi.fn().mockResolvedValue({ userId: "client_1" }),
  clientMaybeSingle: vi.fn(),
  rpc: vi.fn(),
  inngestSend: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth }));
vi.mock("@/lib/inngest/client", () => ({ inngest: { send: inngestSend } }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: { from: () => ({}), storage: { from: () => ({}) } } }));
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: clientMaybeSingle }) }) }),
    rpc,
  }),
}));

import { POST } from "./route";

const submit = (fileCount: number) => {
  const form = new FormData();
  form.set("vendor_name", "Acme Wholesale");
  form.set("brands", JSON.stringify(["Petzl"]));
  form.set("marketplace", "amazon_us");
  for (let i = 0; i < fileCount; i++) {
    // A REAL %PDF- header — the server sniffs content (2026-08-07); a truncated magic is rejected.
    form.append("file", new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34])], `doc${i + 1}.pdf`, { type: "application/pdf" }));
  }
  return POST(new Request("http://test/api/cases/submit", { method: "POST", body: form }));
};

beforeEach(() => {
  clientMaybeSingle.mockReset().mockResolvedValue({ data: null }); // stop the flow cheaply after validation
  rpc.mockClear(); inngestSend.mockClear();
});

describe("F6 — submit route: the file cap (2, ruled 2026-08-07) rejects BEFORE any credit charge", () => {
  it("THREE files → 400 with the cap message, and deduct_client_credits is NEVER called", async () => {
    const res = await submit(3);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(String(json.error)).toMatch(/2/); // the ONE constant's message names the cap
    expect(rpc).not.toHaveBeenCalled();      // no charge on a rejected submission — the money-path lock
    expect(inngestSend).not.toHaveBeenCalled();
  });

  it("TWO files pass the cap (the silent guardrail's boundary) and no charge happens before the client lookup", async () => {
    const res = await submit(2);
    expect(res.status).toBe(404); // client lookup (mocked null) — proves the cap passed, flow stopped pre-charge
    expect(rpc).not.toHaveBeenCalled();
  });

  it("missing vendor name → 400 pre-charge (validation order holds for every check)", async () => {
    const form = new FormData();
    form.set("brands", JSON.stringify(["Petzl"]));
    form.set("marketplace", "amazon_us");
    const res = await POST(new Request("http://test/api/cases/submit", { method: "POST", body: form }));
    expect(res.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
});

// ── PAST-DUE BLOCK (founder-ruled 2026-08-22): the Payment Policy sentence made true. The
// shapes deliberately covered beyond the ruled case: cancelled blocks too (the paid period has
// ended), trialling/cancelling do NOT block (cancelling keeps full access until period end, by
// the Refund Policy's own promise), and in every blocked case credits are PRESERVED — the charge
// RPC is never reached.
describe("past-due submissions pause (2026-08-22) — credits preserved, no case, no charge", () => {
  const client = (billing_status: string) => ({
    data: { plan_type: "growth_279", credits_available: 3, email: "c@x.com", billing_status },
  });

  it("past_due → 402 with plain copy naming the reason and the fix; no charge, no enqueue", async () => {
    clientMaybeSingle.mockResolvedValue(client("past_due"));
    const res = await submit(0);
    expect(res.status).toBe(402);
    const json = await res.json();
    expect(json.error).toBe("billing_past_due");
    expect(String(json.message)).toMatch(/credits are safe/i);
    expect(String(json.message)).toMatch(/Billing page/);
    expect(rpc).not.toHaveBeenCalled();
    expect(inngestSend).not.toHaveBeenCalled();
  });

  it("cancelled → 402 (the paid period has ended); no charge", async () => {
    clientMaybeSingle.mockResolvedValue(client("cancelled"));
    const res = await submit(0);
    expect(res.status).toBe(402);
    expect((await res.json()).error).toBe("billing_cancelled");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("cancelling does NOT block — full access until period end is the Refund Policy's own promise", async () => {
    clientMaybeSingle.mockResolvedValue(client("cancelling"));
    rpc.mockResolvedValue({ data: null, error: { message: "test-stop at the charge" } });
    const res = await submit(0);
    // The flow reaches the CHARGE (rpc called) — proof the billing gate passed; the mocked
    // charge failure then stops it with a controlled response, never a 402 billing block.
    expect(rpc).toHaveBeenCalled();
    expect(res.status).not.toBe(402);
  });

  it("active does NOT block", async () => {
    clientMaybeSingle.mockResolvedValue(client("active"));
    rpc.mockResolvedValue({ data: null, error: { message: "test-stop at the charge" } });
    const res = await submit(0);
    expect(rpc).toHaveBeenCalled();
    expect(res.status).not.toBe(402);
  });
});
