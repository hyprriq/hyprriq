import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── BL FIX GATE — BL2 (founder-ruled): BLOCK-THE-SEND. Every outbound email passes the HARD
// banned-language scan (subject + tag-stripped html) BEFORE any send. On a hit: the mail does
// not send, the violation is audit-logged, callers get {sent:false, reason:"banned_language"}.
// This also closes the ADR-G004 spec-vs-built divergence ("email notifications must pass
// compliance validation… enforced by the banned language scanner"). The scan runs BEFORE the
// key check — a violation is a violation whether or not email is configured. ──

const { sendMock, auditInsert } = vi.hoisted(() => ({
  sendMock: vi.fn().mockResolvedValue({ id: "email-1" }),
  auditInsert: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock("resend", () => ({ Resend: class { emails = { send: sendMock }; } }));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from: vi.fn(() => ({ insert: auditInsert })) },
}));

import { sendAdminAlert, sendDualNotification } from "./notify";

beforeEach(() => {
  sendMock.mockClear();
  auditInsert.mockReset().mockResolvedValue({ error: null });
  process.env.RESEND_API_KEY = "re_test_key";
  process.env.SUPPORT_INBOX = "ops@example.com";
});
afterEach(() => {
  delete process.env.RESEND_API_KEY;
  delete process.env.SUPPORT_INBOX;
});

describe("BL2 — the outbound-email banned-language gate (block-the-send)", () => {
  it("a clean admin alert sends", async () => {
    const r = await sendAdminAlert("watchdog sweep", "<p>3 cases pending review.</p>");
    expect(r.sent).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("an email carrying banned language REFUSES to send, audit-logged, {sent:false, reason:banned_language}", async () => {
    const r = await sendAdminAlert("case update", "<p>Good news — we can get you ungated.</p>");
    expect(r).toEqual({ sent: false, reason: "banned_language" });
    expect(sendMock).not.toHaveBeenCalled();
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      actor_type: "system",
      new_value: expect.objectContaining({ blocked: "banned_language_email" }),
    }));
  });

  it("the gate scans the SUBJECT too", async () => {
    const r = await sendAdminAlert("your account is safe", "<p>ok</p>");
    expect(r.sent).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("sendDualNotification: BOTH bodies are scanned — a banned client body blocks the whole send", async () => {
    const r = await sendDualNotification({
      clientEmail: "c@example.com", subject: "Report ready",
      clientHtml: "<p>This supplier is approved.</p>", adminHtml: "<p>internal note</p>",
    });
    expect(r).toEqual({ sent: false, reason: "banned_language" });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("mandated denials pass the email gate exactly as they pass delivery (the two-sided law crosses surfaces)", async () => {
    const r = await sendDualNotification({
      clientEmail: "c@example.com", subject: "Your report",
      clientHtml: "<p>We do not provide ungating services. We could not confirm authorization; no elevated risk indicators were observed based on available evidence.</p>",
      adminHtml: "<p>delivered</p>",
    });
    expect(r.sent).toBe(true);
  });

  it("html tags never mask a violation (the scan strips tags before scanning)", async () => {
    const r = await sendAdminAlert("update", "<p>suspension-<b>proof</b> setup</p>");
    expect(r.sent).toBe(false);
  });

  it("POST-FREEZE HUNT (2026-07-24): the gate's own audit write failing never turns into a caller-facing throw", async () => {
    auditInsert.mockRejectedValue(new Error("audit_log unavailable"));
    const r = await sendAdminAlert("case update", "we can get you ungated");
    expect(r).toEqual({ sent: false, reason: "banned_language" });
  });

  it("the scan runs BEFORE the key check — a violation reports banned_language even with email unconfigured", async () => {
    delete process.env.RESEND_API_KEY;
    const r = await sendAdminAlert("x", "buy with confidence");
    expect(r).toEqual({ sent: false, reason: "banned_language" });
  });
});
