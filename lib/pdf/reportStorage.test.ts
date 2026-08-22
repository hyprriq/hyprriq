import { describe, it, expect } from "vitest";
import { reportObjectKey, SIGNED_URL_TTL_SECONDS, REPORTS_BUCKET } from "./reportStorage";
import { shouldEmailClient } from "@/lib/inngest/functions/reportPdf";
import { OPERATOR_HOUSE_CLIENT_ID } from "@/lib/data/operatorCase";
import fs from "node:fs";
import path from "node:path";

// ── §4 STORAGE + DELIVERY. These lock the properties that are dangerous to get wrong: where the
// object lives, that it is never overwritten, and who is allowed to reach it.

describe("the object key — immutability and scoping are IN the path", () => {
  it("carries client, case and the DELIVERED ATTEMPT", () => {
    expect(reportObjectKey("cli_1", "AWI-2608-034", 1)).toBe("cli_1/AWI-2608-034-attempt-1.pdf");
  });

  it("H1 — a re-investigation writes a DIFFERENT key, so a delivered PDF can never be rewritten", () => {
    expect(reportObjectKey("cli_1", "AWI-2608-034", 2)).not.toBe(reportObjectKey("cli_1", "AWI-2608-034", 1));
  });

  it("is PURE — the job, the download route and any audit derive it identically without shared state", () => {
    expect(reportObjectKey("c", "N", 3)).toBe(reportObjectKey("c", "N", 3));
  });

  it("is scoped by client, so a leaked key cannot be walked into another client's folder", () => {
    expect(reportObjectKey("cli_a", "AWI-1", 1).startsWith("cli_a/")).toBe(true);
    expect(reportObjectKey("cli_b", "AWI-1", 1).startsWith("cli_b/")).toBe(true);
  });

  it("signed URLs are minutes, not hours — re-issued per click, so a short life costs nothing", () => {
    expect(SIGNED_URL_TTL_SECONDS).toBeLessThanOrEqual(600);
    expect(REPORTS_BUCKET).toBe("reports");
  });
});

describe("who gets the delivery email", () => {
  it("never the operator house row — its address is an undeliverable placeholder", () => {
    expect(shouldEmailClient(OPERATOR_HOUSE_CLIENT_ID, "operator@hyprriq.internal").send).toBe(false);
    expect(shouldEmailClient(OPERATOR_HOUSE_CLIENT_ID, "x@y.com").reason).toBe("skipped:operator_house");
  });

  it("never with no recipient — and the skip is NAMED so the record cannot read 'sent'", () => {
    expect(shouldEmailClient("cli_1", null)).toEqual({ send: false, reason: "skipped:no_recipient" });
  });

  it("a real client with an address gets it", () => {
    expect(shouldEmailClient("cli_1", "buyer@example.com").send).toBe(true);
  });

  // ── AN EMAIL NEVER ANNOUNCES A REPORT THE CLIENT CANNOT READ (2026-08-22). The email says
  // "ready — view it in your portal"; for no_verdict the portal REFUSES, so the sentence is a
  // lie and the send is suppressed. Every other refusal leaves a readable portal page.
  it("SUPPRESSED when the portal page cannot render either (no_verdict) — the sentence would be false", () => {
    const r = shouldEmailClient("cli_1", "buyer@example.com", "no_verdict: case AWI-2608-099 is delivered but carries no usable verdict (null)");
    expect(r.send).toBe(false);
    expect(r.reason).toBe("skipped:no_verdict_unreadable");
  });

  it("STILL SENT for refusals that leave a readable portal page — the client's report is genuinely there", () => {
    for (const reason of [
      "no_client_name: case AWI-1 has no client name on file",
      "no_snapshot: case AWI-2 has no decision snapshot for the delivered attempt",
    ]) {
      expect(shouldEmailClient("cli_1", "buyer@example.com", reason).send, reason).toBe(true);
    }
  });

  it("a successful render (no failure reason) is unaffected, however the argument arrives", () => {
    for (const reason of [null, undefined]) {
      expect(shouldEmailClient("cli_1", "buyer@example.com", reason).send).toBe(true);
    }
  });

  it("the operator-house and no-recipient skips still win over a render reason (order is stable)", () => {
    expect(shouldEmailClient(OPERATOR_HOUSE_CLIENT_ID, "x@y.com", "no_verdict: …").reason).toBe("skipped:operator_house");
    expect(shouldEmailClient("cli_1", null, "no_verdict: …").reason).toBe("skipped:no_recipient");
  });

  it("a reason that merely CONTAINS the word does not suppress — the match is anchored at the reason code", () => {
    expect(shouldEmailClient("cli_1", "buyer@example.com", "no_snapshot: upstream said no_verdict earlier").send).toBe(true);
  });
});

// ── SOURCE-LEVEL LOCKS. These are route/job properties that no unit test can reach without a live
// Supabase and Chromium, but which are catastrophic to lose silently.
const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, "../..", rel), "utf8");

describe("LOCK — the download route authorizes on every click", () => {
  const src = read("app/api/cases/[id]/report/route.ts");

  it("scopes by client_id IN THE QUERY, not in a later comparison", () => {
    expect(src).toContain('.eq("client_id", userId)');
  });

  it("requires delivered state — a PDF is the delivered artifact, never a preview", () => {
    expect(src).toContain('c.status !== "delivered"');
  });

  it("returns 404 (not 403) for someone else's case — a 403 confirms it exists", () => {
    expect(src).toContain('{ error: "not_found" }, { status: 404 }');
    expect(src).not.toMatch(/status:\s*403/);
  });

  it("hands back a SIGNED url and never a raw storage path", () => {
    expect(src).toContain("signedReportUrl");
    expect(src).not.toContain("getPublicUrl");
  });
});

describe("LOCK — the render job never blocks or mutates a delivery", () => {
  const src = read("lib/inngest/functions/reportPdf.ts");

  it("never writes case status", () => {
    expect(src).not.toMatch(/from\("cases"\)\s*\.update\(\s*\{\s*status/);
  });

  it("alarms on permanent failure instead of retrying a state that cannot be retried", () => {
    expect(src).toContain("sendAdminAlert");
    expect(src).toContain("ReportNotRenderable");
  });

  it("sends the delivery email from HERE — the ruled sequencing", () => {
    expect(src).toContain("sendDeliveryNotification");
  });

  it("the publish route no longer sends it, so it cannot go twice", () => {
    expect(read("app/api/admin/cases/[id]/review/route.ts")).not.toContain("sendDeliveryNotification");
  });

  it("storage writes never overwrite", () => {
    expect(read("lib/pdf/reportStorage.ts")).toContain("upsert: false");
  });
});

describe("LOCK — the PDF template", () => {
  const src = read("lib/pdf/reportTemplate.ts");

  it("counts SOLD assessment areas, never rendered rows (Track 6 must not make it say six)", () => {
    expect(src).toContain("areaFindings(c).length");
    expect(src).not.toContain("c.findings.length");
  });

  it("renders the category section, with the attention label and never the raw risk level", () => {
    expect(src).toContain("categorySection");
    expect(src).toContain("fl.attention");
    // Never INTERPOLATED into the document. The word appears in the ⛔ comment above the section
    // explaining why it must not be printed, so a bare source scan for it would fail on the very
    // note that keeps the rule alive.
    expect(src).not.toMatch(/\$\{[^}]*risk_level/);
  });

  it("⛔ still does NOT strip tokens — the checkpoint is the backstop, not the template", () => {
    expect(src).not.toMatch(/stripInternalRefs|cleanClientProse|src_\\d/);
  });
});
