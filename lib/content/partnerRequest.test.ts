import { describe, it, expect } from "vitest";
import {
  parsePartnerRequest,
  ROLE_OPTIONS,
  CLIENTS_BAND_OPTIONS,
  PARTNER_REQUEST_COPY,
  roleLabel,
  clientsBandLabel,
} from "./partnerRequest";

// ── PARTNER REQUEST VALIDATION (item 1h, 2026-08-22) — the API trusts parsePartnerRequest and
// nothing else; these fixtures cover the shapes the form never sends but an attacker will.

const good = {
  name: "Priya N", email: "priya@sourcingco.com", role: "va", clientsBand: "3-10",
  note: "Mostly kitchen brands.", marketingOptIn: false,
};

describe("parsePartnerRequest", () => {
  it("accepts a complete request and normalizes email + whitespace", () => {
    const r = parsePartnerRequest({ ...good, name: "  Priya   N ", email: " PRIYA@SourcingCo.COM " });
    expect(r.error).toBeNull();
    expect(r.input).toMatchObject({ name: "Priya N", email: "priya@sourcingco.com", role: "va", clientsBand: "3-10" });
  });

  it("note is optional — empty and whitespace-only both store NULL, never ''", () => {
    expect(parsePartnerRequest({ ...good, note: "" }).input?.note).toBeNull();
    expect(parsePartnerRequest({ ...good, note: "   " }).input?.note).toBeNull();
    expect(parsePartnerRequest({ ...good, note: undefined }).input?.note).toBeNull();
  });

  it("rejects the shapes a form never sends: missing/oversized/typed-wrong fields", () => {
    expect(parsePartnerRequest({}).error).toBe("invalid_name");
    expect(parsePartnerRequest({ ...good, name: "x".repeat(121) }).error).toBe("invalid_name");
    expect(parsePartnerRequest({ ...good, name: 42 }).error).toBe("invalid_name");
    expect(parsePartnerRequest({ ...good, email: "not-an-address" }).error).toBe("invalid_email");
    expect(parsePartnerRequest({ ...good, email: "a b@c.com" }).error).toBe("invalid_email");
    expect(parsePartnerRequest({ ...good, role: "founder" }).error).toBe("invalid_role");
    expect(parsePartnerRequest({ ...good, role: ["va"] }).error).toBe("invalid_role");
    expect(parsePartnerRequest({ ...good, clientsBand: "1000000" }).error).toBe("invalid_clients_band");
    expect(parsePartnerRequest({ ...good, note: "x".repeat(1001) }).error).toBe("invalid_note");
    expect(parsePartnerRequest(null).error).toBe("invalid_name");
    expect(parsePartnerRequest("a string").error).toBe("invalid_name");
  });

  it("marketingOptIn is EXPRESS consent — only literal true counts, never truthiness", () => {
    expect(parsePartnerRequest({ ...good, marketingOptIn: true }).input?.marketingOptIn).toBe(true);
    expect(parsePartnerRequest({ ...good, marketingOptIn: "true" }).input?.marketingOptIn).toBe(false);
    expect(parsePartnerRequest({ ...good, marketingOptIn: 1 }).input?.marketingOptIn).toBe(false);
    expect(parsePartnerRequest({ ...good, marketingOptIn: undefined }).input?.marketingOptIn).toBe(false);
  });

  it("every option value round-trips to a label (the SQL CHECKs mirror these lists)", () => {
    for (const o of ROLE_OPTIONS) expect(roleLabel(o.value)).toBe(o.label);
    for (const o of CLIENTS_BAND_OPTIONS) expect(clientsBandLabel(o.value)).toBe(o.label);
  });
});

describe("partner request copy (ruled 1c/1f — a request never promises a grant)", () => {
  it("no string promises an outcome or names a tier", () => {
    for (const s of Object.values(PARTNER_REQUEST_COPY)) {
      expect(s).not.toMatch(/on the way|on its way|is coming|has been approved|Growth|Scale|\$\d/i);
      // "a full assessment" is the ruled framing; "free full assessment" as a promise is not ours to make here.
      expect(s).not.toMatch(/your free (full )?assessment (is|will)/i);
    }
  });

  it("the confirmation says WHEN they'll hear back, honestly — and that the answer may be no", () => {
    expect(PARTNER_REQUEST_COPY.confirmed).toContain("2 business days");
    expect(PARTNER_REQUEST_COPY.confirmed).toContain("whatever the answer");
  });
});
