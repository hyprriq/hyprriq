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
    form.append("file", new File([new Uint8Array([37, 80, 68, 70])], `doc${i + 1}.pdf`, { type: "application/pdf" }));
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
