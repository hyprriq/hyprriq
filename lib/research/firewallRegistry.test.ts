import { describe, it, expect } from "vitest";
import { ALLOWED_PROFILES, MIN_AUTHORITY } from "./weightValidation";
import { weightKeysForTrack } from "./weights";
import { runTrack4 } from "./track4";
import { runTrack5 } from "./track5";

// ╔══════════════════════════════════════════════════════════════════════════════════════════╗
// ║ H7 (spec H7.5, founder-endorsed) — THE TRACK 3/4 PRE-FREEZE GATE, AS CODE.                   ║
// ║ A track may not ship weight keys the firewall doesn't know: every key a LIVE track can       ║
// ║ propose must have ALLOWED_PROFILES (provenance) + MIN_AUTHORITY (authority) entries.         ║
// ║                                                                                              ║
// ║ Self-enforcing design: the H3 stubs (Tracks 3/4/5) assert they are STILL stubs. The moment    ║
// ║ one stops returning not_implemented, ITS assertion below fails — and the builder must:       ║
// ║   1. author the track's ALLOWED_PROFILES + MIN_AUTHORITY entries,                            ║
// ║   2. run the ADR-T1-001 collision audit against them (founder-ruled pre-freeze gate),        ║
// ║   3. move the track from the stub block to LIVE_FIREWALL_TRACKS below.                       ║
// ║ That is the ruled gate — never weaken this test to silence it.                               ║
// ╚══════════════════════════════════════════════════════════════════════════════════════════╝

// Track 3 (2026-07-10, gate spec): brand_risk_assessment goes LIVE — entries authored per the
// founder-ruled ADR-T1-001 collision audit (recency windows + cross-track rows in the gate spec).
const LIVE_FIREWALL_TRACKS = ["supplier_identity", "supply_chain_relationship", "brand_risk_assessment"] as const;

// Documented exclusions — keys deliberately OUTSIDE the firewall config, with the ruling that put
// them there. Anything else uncovered is a build error.
const RULED_EXCLUSIONS: Record<string, string[]> = {
  // ADR-T2-001 — loa_legitimate is deliberately NOT proposable in Track 2 (an LOA is post-
  // relationship, private, unverifiable; it routes to the Compliance Documentation layer). The
  // firewall rejects it by design, so it carries no provenance/authority entries.
  supply_chain_relationship: ["loa_legitimate"],
};

describe("firewall registry coverage lock (H7 — Track 3/4 pre-freeze gate as a failing test)", () => {
  for (const track of LIVE_FIREWALL_TRACKS) {
    it(`every ${track} weight key has provenance + authority coverage`, () => {
      const excluded = new Set(RULED_EXCLUSIONS[track] ?? []);
      for (const key of weightKeysForTrack(track)) {
        if (excluded.has(key)) continue;
        expect(ALLOWED_PROFILES[key], `ALLOWED_PROFILES missing entry for live-track key: ${key}`).toBeDefined();
        expect(MIN_AUTHORITY[key], `MIN_AUTHORITY missing entry for live-track key: ${key}`).toBeDefined();
      }
    });
  }

  it("Tracks 4/5 are still declared stubs — going live REQUIRES firewall registry entries + the ADR-T1-001 collision audit FIRST", async () => {
    // When any of these fails: do NOT edit this assertion — author the firewall entries, run the
    // collision audit, then move the track into LIVE_FIREWALL_TRACKS (see the banner above).
    // Track 3 went LIVE 2026-07-10 via exactly this procedure (entries + founder-ruled audit) —
    // its assertion moved out per the banner; runTrack3 is imported no longer as a stub.
    expect((await runTrack4()).not_implemented, "Track 4 went live without passing the firewall pre-freeze gate").toBe(true);
    expect((await runTrack5()).not_implemented, "Track 5 went live without passing the firewall pre-freeze gate").toBe(true);
  });
});
