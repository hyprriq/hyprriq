import { describe, it, expect } from "vitest";
import { findingText, findingNotes, brandFindingFrom, boundaryNotesFrom } from "./finding-view";
import type { Finding } from "@/lib/data/cases";

// H5 — the client Finding type carries compiled findings only (no raw model output, no internal notes).
const mk = (track: string, j: Record<string, unknown> | null): Finding => ({
  id: "f1", track, track_key: track.replace("track_", "t"), finding_certainty: "assessed",
  compiled_findings_json: j, questions_to_ask: null,
});

describe("findingText / findingNotes (ADR-T2-002 Evidence rendering)", () => {
  it("Track 2: prefers brand_relationship_finding for the detail over the legacy summary", () => {
    const f = mk("track_2", {
      summary: "OLD conflated reasoning_notes narrative",
      brand_relationship_finding: "Lenovo: confirmed authorized distributor. Bosch: additional verification required.",
      identity_scope_note: "Supplier legitimacy and identity verification are assessed separately.",
      authorization_scope_note: "This finding assesses the contractual and commercial authorization relationship.",
      marketplace_eligibility_disclaimer: "A confirmed relationship does not guarantee marketplace approval.",
    });
    expect(findingText(f).detail).toContain("Lenovo");
    expect(findingText(f).detail).not.toContain("OLD conflated");
    const notes = findingNotes(f);
    expect(notes.map((n) => n.label)).toEqual(["Identity scope", "Authorization scope", "Marketplace eligibility"]);
    expect(notes[2].text).toContain("does not guarantee marketplace approval");
  });
  // ── Pre-Synthesis sweep F1 (founder-approved 2026-07-14): the purpose-built, HARD-scanned
  // narratives MUST render — falling through to summary (= raw reasoning_notes) showed internal,
  // conclusion-leaning reasoning to clients (the secondary-path leak class, third instance). ──
  it("Track 3: prefers brand_risk_finding for the detail over the legacy summary", () => {
    const f = mk("track_3", {
      summary: "INTERNAL reasoning_notes line that must not render",
      brand_risk_finding: "Petzl: no enforcement activity found in the review window.",
    });
    expect(findingText(f).detail).toContain("Petzl");
    expect(findingText(f).detail).not.toContain("INTERNAL");
  });
  it("Track 4: prefers documentation_finding for the detail over the legacy summary", () => {
    const f = mk("track_4", {
      summary: "INTERNAL reasoning_notes line that must not render",
      documentation_finding: "CONFIRMED POSITIVES: the invoice states the vendor's identifiers.",
    });
    expect(findingText(f).detail).toContain("CONFIRMED POSITIVES");
    expect(findingText(f).detail).not.toContain("INTERNAL");
  });
  it("other tracks: falls back to summary and renders no boundary notes", () => {
    const f = mk("track_1", { summary: "Supplier Identity narrative" });
    expect(findingText(f).detail).toBe("Supplier Identity narrative");
    expect(findingNotes(f)).toEqual([]);
  });
  it("title falls back to 'Dimension N' from the track key", () => {
    expect(findingText(mk("track_2", {})).title).toBe("Dimension 2");
  });
  it("empty compiled_findings_json → empty detail, no notes (never throws)", () => {
    const f = mk("track_2", null);
    expect(findingText(f).detail).toBe("");
    expect(findingNotes(f)).toEqual([]);
  });
});

describe("json-based helpers (shared by portal + admin surfaces)", () => {
  it("brandFindingFrom returns the scoped finding or '' ", () => {
    expect(brandFindingFrom({ brand_relationship_finding: "Lenovo: confirmed." })).toBe("Lenovo: confirmed.");
    expect(brandFindingFrom({ summary: "x" })).toBe("");
    expect(brandFindingFrom(null)).toBe("");
  });
  it("boundaryNotesFrom returns the three notes in order, present only when set", () => {
    const notes = boundaryNotesFrom({
      identity_scope_note: "id", authorization_scope_note: "auth", marketplace_eligibility_disclaimer: "mkt",
    });
    expect(notes).toEqual([
      { label: "Identity scope", text: "id" },
      { label: "Authorization scope", text: "auth" },
      { label: "Marketplace eligibility", text: "mkt" },
    ]);
    expect(boundaryNotesFrom({ authorization_scope_note: "auth" })).toEqual([{ label: "Authorization scope", text: "auth" }]);
    expect(boundaryNotesFrom(null)).toEqual([]);
  });
});
