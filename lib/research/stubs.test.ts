import { describe, it, expect } from "vitest";
import { runTrack4 } from "./track4";
import { runTrack5 } from "./track5";

// H3 — an unbuilt dimension is an ABSENCE, not a finding. The stubs must declare themselves so the
// pipeline maps them to n_a + skipped (never soft_fail, never escalation). Pre-H3 they returned
// bare empty evidence, which deriveTrackSignal scored as soft_fail — Track 3's floor then pinned
// EVERY case at verify_before_purchase (audit N2).
// Track 3 went LIVE 2026-07-10 (gate: registry entries + founder-ruled ADR-T1-001 audit) — its
// stub assertion moved out here exactly as in firewallRegistry.test.ts; track3.test.ts owns it now.
describe("H3 — unbuilt tracks declare not_implemented", () => {
  it("tracks 4/5 return not_implemented with no evidence and honest notes", async () => {
    const cases = [
      [runTrack4, "documentation_review"],
      [runTrack5, "sourcing_logic"],
    ] as const;
    for (const [fn, key] of cases) {
      const out = await fn();
      expect(out.not_implemented).toBe(true);
      expect(out.track_key).toBe(key);
      expect(out.evidence_items).toHaveLength(0);
      expect(out.reasoning_notes).toMatch(/not yet available/i);
      expect(out.reasoning_notes).not.toMatch(/stub/i); // no internal jargon in stored notes
    }
  });
});
