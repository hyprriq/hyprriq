import { describe, it, expect } from "vitest";
import { composeClientName } from "@/lib/pdf/clientName";

// ── The name on a paid deliverable (founder-ruled 2026-08-20): Clerk first, stored fallback,
// company as suffix — and the empty result leaves the renderer's no_client_name refusal to fire.

describe("composeClientName — the ruled chain", () => {
  it("the LIVE Clerk name wins over a stale stored copy — the accountant sees today's name", () => {
    expect(composeClientName("Ada King", "Ada Lovelace", null)).toBe("Ada King");
  });
  it("no Clerk name → the stored fallback (the column is kept, never dropped)", () => {
    expect(composeClientName(null, "Ada Lovelace", null)).toBe("Ada Lovelace");
  });
  it("company renders as a suffix on either source", () => {
    expect(composeClientName("Ada King", "old", "Analytical Engines")).toBe("Ada King (Analytical Engines)");
    expect(composeClientName(null, "Ada Lovelace", "Analytical Engines")).toBe("Ada Lovelace (Analytical Engines)");
  });
  it("company ALONE is a name — never the old \"(Acme)\" bracket artifact", () => {
    expect(composeClientName(null, null, "Analytical Engines")).toBe("Analytical Engines");
  });
  it("whitespace-only values are absent, not names", () => {
    expect(composeClientName("  ", "  ", "  ")).toBe("");
    expect(composeClientName("  ", "Ada Lovelace", null)).toBe("Ada Lovelace");
  });
  it("everything empty → empty string, so the renderer's no_client_name refusal fires unchanged", () => {
    expect(composeClientName(null, null, null)).toBe("");
    expect(composeClientName(undefined, undefined, undefined)).toBe("");
  });
});
