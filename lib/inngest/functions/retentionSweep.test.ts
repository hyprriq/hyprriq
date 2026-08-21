import { describe, it, expect, vi, beforeEach } from "vitest";

// ── RETENTION SWEEP — fixture-locked, shapes-not-in-mind included: the flag OFF (default) does
// NOTHING; a storage failure skips the deleted_at stamp so tomorrow retries (never a stamped row
// with a live object); the founder/operator accounts are never dormancy-nagged; a duplicate
// notice counts as a skip (the unique key is the "once", the sweep fires forever).

const { state, storageRemove, filesUpdateEq, auditInsert, sendDormantNoticeEmail } = vi.hoisted(() => ({
  state: {
    dueFiles: { data: [] as unknown[], error: null as { message: string } | null },
    dormant: { data: [] as unknown[], error: null as { message: string } | null },
  },
  storageRemove: vi.fn().mockResolvedValue({ error: null }),
  filesUpdateEq: vi.fn().mockResolvedValue({ error: null }),
  auditInsert: vi.fn().mockResolvedValue({ error: null }),
  sendDormantNoticeEmail: vi.fn().mockResolvedValue({ sent: true }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === "uploaded_files") return {
        select: () => ({ lte: () => ({ is: () => ({ limit: () => Promise.resolve(state.dueFiles) }) }) }),
        update: () => ({ eq: filesUpdateEq }),
      };
      if (table === "clients") return { select: () => ({ eq: () => ({ lt: () => Promise.resolve(state.dormant) }) }) };
      return { insert: auditInsert };
    }),
    storage: { from: vi.fn(() => ({ remove: storageRemove })) },
  },
}));
vi.mock("@/lib/email/notify", () => ({ sendDormantNoticeEmail }));
vi.mock("@/lib/inngest/client", () => ({
  inngest: { createFunction: (_o: unknown, handler: (a: { step: unknown }) => unknown) => ({ handler }) },
}));

import { retentionSweep } from "./retentionSweep";
const run = () => (retentionSweep as unknown as { handler: (a: { step: unknown }) => Promise<Record<string, unknown>> }).handler({ step: {} });

beforeEach(() => {
  state.dueFiles = { data: [], error: null };
  state.dormant = { data: [], error: null };
  storageRemove.mockClear().mockResolvedValue({ error: null });
  filesUpdateEq.mockClear().mockResolvedValue({ error: null });
  auditInsert.mockClear();
  sendDormantNoticeEmail.mockClear().mockResolvedValue({ sent: true });
  delete process.env.RETENTION_SWEEP_ENABLED;
});

const file = (over: Record<string, unknown> = {}) => ({
  id: "f1", storage_path: "user_1/case_1/doc.pdf", file_name: "doc.pdf", client_id: "user_1", case_id: "case_1",
  delete_after: "2025-01-01T00:00:00Z", ...over,
});

describe("retention sweep", () => {
  it("⛔ OFF BY DEFAULT: without the env flag it deletes NOTHING", async () => {
    state.dueFiles = { data: [file()], error: null };
    const out = await run();
    expect(out).toEqual({ disabled: true });
    expect(storageRemove).not.toHaveBeenCalled();
    expect(filesUpdateEq).not.toHaveBeenCalled();
  });

  it("flag on: removes the storage object, stamps deleted_at, audits", async () => {
    process.env.RETENTION_SWEEP_ENABLED = "1";
    state.dueFiles = { data: [file()], error: null };
    const out = await run();
    expect(out.files_deleted).toBe(1);
    expect(storageRemove).toHaveBeenCalledWith(["user_1/case_1/doc.pdf"]);
    expect(filesUpdateEq).toHaveBeenCalledTimes(1);
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      action: "DELETE", new_value: expect.objectContaining({ retention_deletion: true }),
    }));
  });

  it("a storage failure SKIPS the stamp — tomorrow retries; never a stamped row with a live object", async () => {
    process.env.RETENTION_SWEEP_ENABLED = "1";
    state.dueFiles = { data: [file()], error: null };
    storageRemove.mockResolvedValue({ error: { message: "bucket unreachable" } });
    const out = await run();
    expect(out.files_failed).toBe(1);
    expect(out.files_deleted).toBe(0);
    expect(filesUpdateEq).not.toHaveBeenCalled();
  });

  it("dormant one-time clients get the notice; founder/operator roles never do", async () => {
    process.env.RETENTION_SWEEP_ENABLED = "1";
    state.dormant = { data: [
      { id: "user_a", email: "a@x.com", full_name: "A", plan_category: "one_time", role: "client" },
      { id: "user_f", email: "f@x.com", full_name: "F", plan_category: "one_time", role: "founder" },
    ], error: null };
    const out = await run();
    expect(out.dormant_notices).toBe(1);
    expect(sendDormantNoticeEmail).toHaveBeenCalledTimes(1);
    expect(sendDormantNoticeEmail).toHaveBeenCalledWith(expect.objectContaining({ clientId: "user_a" }));
  });

  it("a duplicate notice is a SKIP — the unique key is the 'once', the sweep can fire forever", async () => {
    process.env.RETENTION_SWEEP_ENABLED = "1";
    sendDormantNoticeEmail.mockResolvedValue({ sent: false, reason: "duplicate" });
    state.dormant = { data: [{ id: "user_a", email: "a@x.com", full_name: "A", plan_category: "one_time", role: "client" }], error: null };
    const out = await run();
    expect(out.dormant_skipped).toBe(1);
    expect(out.dormant_notices).toBe(0);
  });

  it("a read failure throws — Inngest retries; no partial silent sweep", async () => {
    process.env.RETENTION_SWEEP_ENABLED = "1";
    state.dueFiles = { data: [], error: { message: "boom" } };
    await expect(run()).rejects.toThrow(/uploaded_files read failed/);
  });
});
