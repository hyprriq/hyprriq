import { describe, it, expect } from "vitest";
import { findingText, findingNotes } from "./finding-view";
import type { Finding } from "@/lib/data/cases";

const mk = (track: string, j: Record<string, unknown> | null): Finding => ({
  id: "f1", track, track_key: track.replace("track_", "t"), finding_certainty: "unknown",
  confidence_band: null, compiled_findings_json: j, ai_output_json: null, manual_notes: null, questions_to_ask: null,
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
