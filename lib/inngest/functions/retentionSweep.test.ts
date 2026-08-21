import { describe, it, expect, vi, beforeEach } from "vitest";

// ── RETENTION SWEEP — fixture-locked, shapes-not-in-mind included. The load-bearing invariants:
// the flag OFF (default) does NOTHING · the WARNING IS THE GATE — nothing deletes until the
// client's warning has been on record ≥30 days, so first activation warns and waits instead of
// deleting unannounced · no FROZEN documentation_review pack → no deletion, ever (rejudge must
// survive) · a storage failure skips the deleted_at stamp so tomorrow retries · founder/operator
// accounts are never dormancy-nagged · a duplicate send is a skip, never an error.

const { state, storageRemove, filesUpdateEq, auditInsert, sendDormantNoticeEmail, sendRetentionWarningEmail } = vi.hoisted(() => ({
  state: {
    warnLedger: { data: [] as unknown[], error: null as { message: string } | null },
    filesQueue: [] as { data: unknown[]; error: { message: string } | null }[], // upcoming, then due
    clientsList: { data: [] as unknown[], error: null },
    dormant: { data: [] as unknown[], error: null as { message: string } | null },
    packs: { data: [] as unknown[], error: null },
  },
  storageRemove: vi.fn().mockResolvedValue({ error: null }),
  filesUpdateEq: vi.fn().mockResolvedValue({ error: null }),
  auditInsert: vi.fn().mockResolvedValue({ error: null }),
  sendDormantNoticeEmail: vi.fn().mockResolvedValue({ sent: true }),
  sendRetentionWarningEmail: vi.fn().mockResolvedValue({ sent: true }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === "email_log") return { select: () => ({ eq: () => ({ is: () => Promise.resolve(state.warnLedger) }) }) };
      if (table === "uploaded_files") return {
        select: () => ({ lte: () => ({ is: () => ({ limit: () => Promise.resolve(state.filesQueue.shift() ?? { data: [], error: null }) }) }) }),
        update: () => ({ eq: filesUpdateEq }),
      };
      if (table === "clients") return {
        select: () => ({
          in: () => Promise.resolve(state.clientsList),
          eq: () => ({ lt: () => Promise.resolve(state.dormant) }),
        }),
      };
      if (table === "case_evidence_packs") return { select: () => ({ eq: () => ({ in: () => ({ is: () => Promise.resolve(state.packs) }) }) }) };
      return { insert: auditInsert };
    }),
    storage: { from: vi.fn(() => ({ remove: storageRemove })) },
  },
}));
vi.mock("@/lib/email/notify", () => ({ sendDormantNoticeEmail, sendRetentionWarningEmail }));
vi.mock("@/lib/inngest/client", () => ({
  inngest: { createFunction: (_o: unknown, handler: (a: { step: unknown }) => unknown) => ({ handler }) },
}));

import { retentionSweep } from "./retentionSweep";
const run = () => (retentionSweep as unknown as { handler: (a: { step: unknown }) => Promise<Record<string, unknown>> }).handler({ step: {} });

const DAY = 86_400_000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();

const file = (over: Record<string, unknown> = {}) => ({
  id: "f1", storage_path: "user_1/case_1/doc.pdf", file_name: "doc.pdf", client_id: "user_1", case_id: "case_1",
  delete_after: iso(-1), ...over,
});
const warnKeyFor = (f: { client_id: unknown; delete_after: unknown }) =>
  `retention_warning:${f.client_id}:${String(f.delete_after).slice(0, 7)}`;

beforeEach(() => {
  state.warnLedger = { data: [], error: null };
  state.filesQueue = [];
  state.clientsList = { data: [{ id: "user_1", email: "c@x.com", full_name: "A" }], error: null };
  state.dormant = { data: [], error: null };
  state.packs = { data: [{ case_id: "case_1" }], error: null };
  storageRemove.mockClear().mockResolvedValue({ error: null });
  filesUpdateEq.mockClear().mockResolvedValue({ error: null });
  auditInsert.mockClear();
  sendDormantNoticeEmail.mockClear().mockResolvedValue({ sent: true });
  sendRetentionWarningEmail.mockClear().mockResolvedValue({ sent: true });
  delete process.env.RETENTION_SWEEP_ENABLED;
});

describe("retention sweep", () => {
  it("⛔ OFF BY DEFAULT: without the env flag it warns and deletes NOTHING", async () => {
    state.filesQueue = [{ data: [file()], error: null }, { data: [file()], error: null }];
    const out = await run();
    expect(out).toEqual({ disabled: true });
    expect(sendRetentionWarningEmail).not.toHaveBeenCalled();
    expect(storageRemove).not.toHaveBeenCalled();
  });

  it("Phase 1: a file due within 30 days gets its client warned — grouped, with the file names and the month grain", async () => {
    process.env.RETENTION_SWEEP_ENABLED = "1";
    const f = file({ delete_after: iso(10) });
    state.filesQueue = [{ data: [f], error: null }, { data: [], error: null }];
    const out = await run();
    expect(out.warnings_sent).toBe(1);
    expect(sendRetentionWarningEmail).toHaveBeenCalledWith(expect.objectContaining({
      clientId: "user_1", monthKey: String(f.delete_after).slice(0, 7), fileNames: ["doc.pdf"],
    }));
    expect(storageRemove).not.toHaveBeenCalled();
  });

  it("THE WARNING IS THE GATE: an overdue-but-unwarned file is warned, NOT deleted — first activation never deletes unannounced", async () => {
    process.env.RETENTION_SWEEP_ENABLED = "1";
    const f = file(); // overdue
    state.filesQueue = [{ data: [f], error: null }, { data: [f], error: null }];
    const out = await run();
    expect(out.warnings_sent).toBe(1);
    expect(out.files_awaiting_warning_age).toBe(1);
    expect(out.files_deleted).toBe(0);
    expect(storageRemove).not.toHaveBeenCalled();
  });

  it("a warning only 10 days old still holds the gate closed", async () => {
    process.env.RETENTION_SWEEP_ENABLED = "1";
    const f = file();
    state.warnLedger = { data: [{ dedup_key: warnKeyFor(f), sent_at: iso(-10) }], error: null };
    state.filesQueue = [{ data: [], error: null }, { data: [f], error: null }];
    const out = await run();
    expect(out.files_awaiting_warning_age).toBe(1);
    expect(storageRemove).not.toHaveBeenCalled();
  });

  it("warned ≥30 days ago + frozen pack → PERMANENT removal, stamped and audited with the warning date", async () => {
    process.env.RETENTION_SWEEP_ENABLED = "1";
    const f = file();
    state.warnLedger = { data: [{ dedup_key: warnKeyFor(f), sent_at: iso(-40) }], error: null };
    state.filesQueue = [{ data: [], error: null }, { data: [f], error: null }];
    const out = await run();
    expect(out.files_deleted).toBe(1);
    expect(storageRemove).toHaveBeenCalledWith(["user_1/case_1/doc.pdf"]);
    expect(filesUpdateEq).toHaveBeenCalledTimes(1);
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      action: "DELETE", new_value: expect.objectContaining({ retention_deletion: true, warned_at: expect.any(String) }),
    }));
  });

  it("NO FROZEN PACK → no deletion, ever — the skip is audited (rejudge must survive)", async () => {
    process.env.RETENTION_SWEEP_ENABLED = "1";
    const f = file();
    state.warnLedger = { data: [{ dedup_key: warnKeyFor(f), sent_at: iso(-40) }], error: null };
    state.filesQueue = [{ data: [], error: null }, { data: [f], error: null }];
    state.packs = { data: [], error: null };
    const out = await run();
    expect(out.files_skipped_no_frozen_pack).toBe(1);
    expect(out.files_deleted).toBe(0);
    expect(storageRemove).not.toHaveBeenCalled();
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      new_value: expect.objectContaining({ retention_skip: "no_frozen_pack" }),
    }));
  });

  it("a storage failure SKIPS the stamp — tomorrow retries; never a stamped row with a live object", async () => {
    process.env.RETENTION_SWEEP_ENABLED = "1";
    const f = file();
    state.warnLedger = { data: [{ dedup_key: warnKeyFor(f), sent_at: iso(-40) }], error: null };
    state.filesQueue = [{ data: [], error: null }, { data: [f], error: null }];
    storageRemove.mockResolvedValue({ error: { message: "bucket unreachable" } });
    const out = await run();
    expect(out.files_failed).toBe(1);
    expect(out.files_deleted).toBe(0);
    expect(filesUpdateEq).not.toHaveBeenCalled();
  });

  it("dormant one-time clients get the notice; founder/operator roles never do; a duplicate is a skip", async () => {
    process.env.RETENTION_SWEEP_ENABLED = "1";
    state.dormant = { data: [
      { id: "user_a", email: "a@x.com", full_name: "A", plan_category: "one_time", role: "client" },
      { id: "user_f", email: "f@x.com", full_name: "F", plan_category: "one_time", role: "founder" },
    ], error: null };
    const out = await run();
    expect(out.dormant_notices).toBe(1);
    expect(sendDormantNoticeEmail).toHaveBeenCalledTimes(1);
    expect(sendDormantNoticeEmail).toHaveBeenCalledWith(expect.objectContaining({ clientId: "user_a" }));

    sendDormantNoticeEmail.mockResolvedValue({ sent: false, reason: "duplicate" });
    state.dormant = { data: [{ id: "user_a", email: "a@x.com", full_name: "A", plan_category: "one_time", role: "client" }], error: null };
    const out2 = await run();
    expect(out2.dormant_skipped).toBe(1);
  });

  it("a read failure throws — Inngest retries; no partial silent sweep", async () => {
    process.env.RETENTION_SWEEP_ENABLED = "1";
    state.warnLedger = { data: [], error: { message: "boom" } };
    await expect(run()).rejects.toThrow(/warning ledger read failed/);
  });
});
