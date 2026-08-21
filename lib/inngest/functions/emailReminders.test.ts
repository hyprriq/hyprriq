import { describe, it, expect, vi, beforeEach } from "vitest";

// ── SCHEDULED REMINDER SWEEP — candidate selection only (idempotency is the unique index's job,
// locked in notify.dedup.test.ts). What this function must get right: the threshold choice
// (0 vs 1), the cycle anchor, and the renewal window; and a "duplicate" from the sender counts
// as a skip, never an error (the sweep firing daily forever is the DESIGN).

const { clientsResult, sendLowCreditEmail, sendRenewalReminderEmail } = vi.hoisted(() => ({
  clientsResult: { data: [] as unknown[], error: null as { message: string } | null },
  sendLowCreditEmail: vi.fn().mockResolvedValue({ sent: true }),
  sendRenewalReminderEmail: vi.fn().mockResolvedValue({ sent: true }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from: vi.fn(() => ({ select: () => ({ eq: () => ({ eq: () => Promise.resolve(clientsResult) }) }) })) },
}));
vi.mock("@/lib/email/notify", () => ({ sendLowCreditEmail, sendRenewalReminderEmail }));
vi.mock("@/lib/inngest/client", () => ({
  inngest: { createFunction: (_opts: unknown, handler: (arg: { step: unknown }) => unknown) => ({ handler }) },
}));

import { emailReminders } from "./emailReminders";

const run = () => (emailReminders as unknown as { handler: (arg: { step: unknown }) => Promise<Record<string, number>> }).handler({ step: {} });

const client = (over: Record<string, unknown>) => ({
  id: "user_1", email: "c@example.com", full_name: "Alex",
  credits_available: 5, renewal_date: null, billing_status: "active", plan_category: "subscription",
  ...over,
});

beforeEach(() => {
  clientsResult.data = []; clientsResult.error = null;
  sendLowCreditEmail.mockClear().mockResolvedValue({ sent: true });
  sendRenewalReminderEmail.mockClear().mockResolvedValue({ sent: true });
});

describe("email reminders sweep", () => {
  it("credits 1 → threshold 1; credits 0 → threshold 0; plenty of credits → nothing", async () => {
    clientsResult.data = [client({ id: "a", credits_available: 1 }), client({ id: "b", credits_available: 0 }), client({ id: "c", credits_available: 4 })];
    const out = await run();
    expect(out.low_credit_sent).toBe(2);
    expect(sendLowCreditEmail).toHaveBeenCalledWith(expect.objectContaining({ clientId: "a", threshold: 1 }));
    expect(sendLowCreditEmail).toHaveBeenCalledWith(expect.objectContaining({ clientId: "b", threshold: 0 }));
  });

  it("the cycle anchor is the renewal_date, or 'none' when unset", async () => {
    clientsResult.data = [client({ credits_available: 0, renewal_date: "2026-09-01" })];
    await run();
    expect(sendLowCreditEmail).toHaveBeenCalledWith(expect.objectContaining({ cycleAnchor: "2026-09-01" }));
    clientsResult.data = [client({ credits_available: 0, renewal_date: null })];
    await run();
    expect(sendLowCreditEmail).toHaveBeenLastCalledWith(expect.objectContaining({ cycleAnchor: "none" }));
  });

  it("renewal reminder fires ONLY inside the 3-day pre-charge window", async () => {
    const inWindow = new Date(Date.now() + 2 * 86_400_000).toISOString();
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const far = new Date(Date.now() + 30 * 86_400_000).toISOString();
    clientsResult.data = [
      client({ id: "in", renewal_date: inWindow }),
      client({ id: "past", renewal_date: past }),
      client({ id: "far", renewal_date: far }),
    ];
    const out = await run();
    expect(out.renewal_sent).toBe(1);
    expect(sendRenewalReminderEmail).toHaveBeenCalledTimes(1);
    expect(sendRenewalReminderEmail).toHaveBeenCalledWith(expect.objectContaining({ clientId: "in" }));
  });

  it("'duplicate' from the sender is a SKIP, never an error — the daily sweep can fire forever", async () => {
    sendLowCreditEmail.mockResolvedValue({ sent: false, reason: "duplicate" });
    clientsResult.data = [client({ credits_available: 0 })];
    const out = await run();
    expect(out.skipped_duplicate).toBe(1);
    expect(out.errors).toBe(0);
  });

  it("a clients read failure throws — Inngest retries; no partial silent sweep", async () => {
    clientsResult.error = { message: "boom" };
    await expect(run()).rejects.toThrow(/clients read failed/);
  });
});
