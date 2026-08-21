import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── RESERVE-THEN-SEND (emails 4–7, live since the founder ran the dedup migration 2026-08-21).
// The ledger row is inserted BEFORE the send; a unique-violation means already-sent → skip
// silently. Fail-closed on an unavailable ledger (over-sending is the harm in this class);
// a failed send soft-deletes its reservation so a retry can resend.

const { sendMock, emailLogInsert, emailLogUpdateIs, auditInsert } = vi.hoisted(() => ({
  sendMock: vi.fn().mockResolvedValue({ id: "email-1" }),
  emailLogInsert: vi.fn().mockResolvedValue({ error: null }),
  emailLogUpdateIs: vi.fn().mockResolvedValue({ error: null }),
  auditInsert: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock("resend", () => ({ Resend: class { emails = { send: sendMock }; } }));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => table === "email_log"
      ? {
          insert: emailLogInsert,
          update: vi.fn(() => ({ eq: () => ({ eq: () => ({ is: emailLogUpdateIs }) }) })),
        }
      : { insert: auditInsert }),
  },
}));

import { sendPaymentFailedEmail, sendLowCreditEmail, sendRenewalReminderEmail } from "./notify";

beforeEach(() => {
  sendMock.mockClear();
  emailLogInsert.mockReset().mockResolvedValue({ error: null });
  emailLogUpdateIs.mockReset().mockResolvedValue({ error: null });
  process.env.RESEND_API_KEY = "re_test_key";
});
afterEach(() => { delete process.env.RESEND_API_KEY; });

const pf = { to: "c@example.com", name: "Alex", invoiceId: "in_123", billingUrl: "https://hyprriq.com/portal/billing" };

describe("reserve-then-send", () => {
  it("happy path: reserves with the ruled dedup key, then sends", async () => {
    const r = await sendPaymentFailedEmail(pf);
    expect(r.sent).toBe(true);
    expect(emailLogInsert).toHaveBeenCalledWith(expect.objectContaining({
      template: "payment_failed", dedup_key: "payment_failed:in_123", recipient: "c@example.com",
    }));
    expect(sendMock).toHaveBeenCalledTimes(1);
    // The reservation happens BEFORE the send (insert-first, no check-then-send race).
    expect(emailLogInsert.mock.invocationCallOrder[0]).toBeLessThan(sendMock.mock.invocationCallOrder[0]);
  });

  it("unique-violation = already sent = skip SILENTLY, no send", async () => {
    emailLogInsert.mockResolvedValue({ error: { code: "23505", message: "duplicate key" } });
    const r = await sendPaymentFailedEmail(pf);
    expect(r).toEqual({ sent: false, reason: "duplicate" });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("ledger unavailable = NO send (fail-closed — over-sending is the harm in this class)", async () => {
    emailLogInsert.mockResolvedValue({ error: { code: "XX000", message: "connection refused" } });
    const r = await sendPaymentFailedEmail(pf);
    expect(r).toEqual({ sent: false, reason: "ledger_unavailable" });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("a failed send soft-deletes its reservation so a retry can resend", async () => {
    sendMock.mockRejectedValueOnce(new Error("resend down"));
    const r = await sendPaymentFailedEmail(pf);
    expect(r.sent).toBe(false);
    expect(emailLogUpdateIs).toHaveBeenCalledTimes(1); // the deleted_at stamp, never a hard delete
  });

  it("no API key → no reservation is burned", async () => {
    delete process.env.RESEND_API_KEY;
    const r = await sendPaymentFailedEmail(pf);
    expect(r).toEqual({ sent: false, reason: "no_api_key" });
    expect(emailLogInsert).not.toHaveBeenCalled();
  });

  it("low-credit carries the ruled per-threshold-per-cycle key", async () => {
    const r = await sendLowCreditEmail({
      to: "c@example.com", name: null, threshold: 0, clientId: "user_1",
      cycleAnchor: "2026-09-01", renewalDate: "2026-09-01", portalUrl: "https://hyprriq.com/portal",
    });
    expect(r.sent).toBe(true);
    expect(emailLogInsert).toHaveBeenCalledWith(expect.objectContaining({
      template: "low_credit", dedup_key: "low_credit_0:user_1:2026-09-01",
    }));
  });

  it("renewal carries the ruled one-per-renewal key", async () => {
    const r = await sendRenewalReminderEmail({
      to: "c@example.com", name: null, clientId: "user_1", renewalDate: "2026-09-01",
      billingUrl: "https://hyprriq.com/portal/billing",
    });
    expect(r.sent).toBe(true);
    expect(emailLogInsert).toHaveBeenCalledWith(expect.objectContaining({
      template: "renewal_reminder", dedup_key: "renewal:user_1:2026-09-01",
    }));
  });

  it("LOCKED content rule (scheduled class): no delivery-time promises, no report vocabulary", async () => {
    await sendLowCreditEmail({
      to: "c@example.com", name: null, threshold: 1, clientId: "user_1",
      cycleAnchor: "none", renewalDate: null, portalUrl: "https://hyprriq.com/portal",
    });
    const { subject, html } = sendMock.mock.calls[0][0];
    const text = `${subject} ${(html as string).replace(/<[^>]*>/g, " ")}`;
    expect(text).not.toMatch(/verdict|finding|guarantee/i);
  });
});
