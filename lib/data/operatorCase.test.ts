import { describe, it, expect, vi, beforeEach } from "vitest";

const { houseRow, caseInsert, auditInsert, casesUpdate, send, rpcSpy, storageUpload, uploadedFilesInsert } = vi.hoisted(() => ({
  houseRow: vi.fn().mockResolvedValue({ data: { id: "operator-house" } }),
  caseInsert: vi.fn().mockResolvedValue({ data: { id: "case-1", case_number: "AWI-9" }, error: null }),
  auditInsert: vi.fn().mockResolvedValue({ error: null }),
  casesUpdate: vi.fn().mockResolvedValue({ error: null }),
  send: vi.fn().mockResolvedValue({}),
  rpcSpy: vi.fn(),
  storageUpload: vi.fn().mockResolvedValue({ error: null }),
  uploadedFilesInsert: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock("@/lib/supabase/admin", () => {
  const selChain: Record<string, unknown> = {};
  Object.assign(selChain, { select: vi.fn(() => selChain), eq: vi.fn(() => selChain), maybeSingle: () => houseRow() });
  const insChain = { insert: vi.fn(() => ({ select: vi.fn(() => ({ single: () => caseInsert() })) })), update: vi.fn(() => ({ eq: () => casesUpdate() })), ...selChain };
  return { supabaseAdmin: {
    from: vi.fn((t: string) => (t === "audit_log" ? { insert: auditInsert } : t === "cases" ? insChain : t === "uploaded_files" ? { insert: uploadedFilesInsert } : selChain)),
    rpc: rpcSpy,
    storage: { from: vi.fn(() => ({ upload: storageUpload })) },
  } };
});
vi.mock("@/lib/inngest/client", () => ({ inngest: { send } }));

import { runOperatorCase } from "./operatorCase";

const input = (over = {}) => ({
  operator_id: "op-1", plan_type: "scale_499" as const, vendor_name: "Acme", vendor_website: null,
  brands: ["Bosch"], marketplace: "amazon_us", notes: null, client_name: "Jane D", company_name: "JD LLC", ...over,
});

beforeEach(() => {
  houseRow.mockResolvedValue({ data: { id: "operator-house" } });
  send.mockReset(); send.mockResolvedValue({});
  storageUpload.mockReset(); storageUpload.mockResolvedValue({ error: null });
  caseInsert.mockClear(); auditInsert.mockClear(); rpcSpy.mockClear(); uploadedFilesInsert.mockClear();
});

describe("run-a-case — the credit-bypass path (distinct, audited, provenance-queryable)", () => {
  it("creates the case with origin=operator + operator_meta, enqueues the SAME pipeline event, and NEVER touches a credit RPC", async () => {
    const r = await runOperatorCase(input());
    expect(r.error).toBeNull();
    expect(rpcSpy).not.toHaveBeenCalled(); // THE deliberate hole: absence of the call, provable
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ name: "pipeline/run-case" }));
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      actor_id: "op-1", actor_type: "admin",
      new_value: expect.objectContaining({ operator_run: true, credit_bypassed: true, client_name: "Jane D" }),
    }));
  });

  it("fails LOUD when the house row is not seeded (migration first — never mis-attribute)", async () => {
    houseRow.mockResolvedValue({ data: null });
    const r = await runOperatorCase(input());
    expect(r.error).toMatch(/not seeded/);
    expect(send).not.toHaveBeenCalled();
  });

  it("enforces the plan brand cap (the code guard, not just UI)", async () => {
    const r = await runOperatorCase(input({ brands: ["a", "b", "c", "d", "e", "f"] }));
    expect(r.error).toMatch(/brand cap/);
  });

  it("enqueue failure: no refund needed (none taken), case cancelled, error reported truthfully", async () => {
    send.mockRejectedValue(new Error("inngest down"));
    const r = await runOperatorCase(input());
    expect(r.error).toMatch(/enqueue failed/);
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  // ── ADMIN CLOSE-OUT (2026-08-11) — operator document upload: same bucket, same table, same
  // pipeline consumption (documentPack reads uploaded_files by case_id only). Attribution is the
  // house row; uploads land BEFORE enqueue so the pipeline can never race an empty pack. ──
  describe("document upload (operator path)", () => {
    const doc = { name: "invoice.pdf", buffer: Buffer.from("x"), mime: "application/pdf", kind: "pdf" as const, size: 1 };

    it("uploads to case-documents under the house prefix and records uploaded_files with house attribution", async () => {
      const r = await runOperatorCase(input(), [doc]);
      expect(r.error).toBeNull();
      expect(storageUpload).toHaveBeenCalledTimes(1);
      expect(storageUpload.mock.calls[0][0]).toMatch(/^operator-house\/case-1\//);
      expect(uploadedFilesInsert).toHaveBeenCalledWith(expect.objectContaining({
        case_id: "case-1", client_id: "operator-house", file_name: "invoice.pdf", file_type: "invoice_pdf",
      }));
      expect(send).toHaveBeenCalled();
    });

    it("a failed upload is non-fatal — no uploaded_files row, case still enqueues", async () => {
      storageUpload.mockResolvedValue({ error: { message: "bucket down" } });
      const r = await runOperatorCase(input(), [doc]);
      expect(r.error).toBeNull();
      expect(uploadedFilesInsert).not.toHaveBeenCalled();
      expect(send).toHaveBeenCalled();
    });

    it("uploads happen BEFORE the pipeline enqueue (no race with documentPack)", async () => {
      const order: string[] = [];
      storageUpload.mockImplementation(async () => { order.push("upload"); return { error: null }; });
      send.mockImplementation(async () => { order.push("enqueue"); return {}; });
      await runOperatorCase(input(), [doc]);
      expect(order).toEqual(["upload", "enqueue"]);
    });

    it("no documents → zero storage calls (unchanged path)", async () => {
      await runOperatorCase(input());
      expect(storageUpload).not.toHaveBeenCalled();
    });
  });
});
