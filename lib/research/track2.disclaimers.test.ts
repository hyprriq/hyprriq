import { describe, it, expect } from "vitest";
import {
  IDENTITY_SCOPE_NOTE, AUTHORIZATION_SCOPE_NOTE, MARKETPLACE_ELIGIBILITY_DISCLAIMER,
} from "./track2.disclaimers";
import { containsProcurementLanguage } from "./procurementLanguage";

describe("Track 2 boundary notes (ADR-T2-002 — three distinct boundaries)", () => {
  const notes = [IDENTITY_SCOPE_NOTE, AUTHORIZATION_SCOPE_NOTE, MARKETPLACE_ELIGIBILITY_DISCLAIMER];

  it("are all present, non-trivial strings", () => {
    for (const n of notes) { expect(typeof n).toBe("string"); expect(n.length).toBeGreaterThan(40); }
  });
  it("are pairwise DISTINCT (not duplicate boilerplate)", () => {
    expect(new Set(notes).size).toBe(3);
  });
  it("authorization_scope_note = contractual/commercial layer; marketplace = platform-policy layer", () => {
    expect(AUTHORIZATION_SCOPE_NOTE.toLowerCase()).toContain("contractual");
    expect(MARKETPLACE_ELIGIBILITY_DISCLAIMER.toLowerCase()).toContain("marketplace");
    expect(MARKETPLACE_ELIGIBILITY_DISCLAIMER).toContain("Amazon");
    // the authorization note is NOT about platform policy — it must not name a marketplace platform
    expect(AUTHORIZATION_SCOPE_NOTE).not.toContain("Amazon");
  });
  it("identity_scope_note hands legitimacy up to the Supplier Identity lane", () => {
    expect(IDENTITY_SCOPE_NOTE.toLowerCase()).toContain("legitimacy");
  });
  it("no boundary note contains procurement/recommendation language", () => {
    for (const n of notes) expect(containsProcurementLanguage(n)).toBe(false);
  });
});
