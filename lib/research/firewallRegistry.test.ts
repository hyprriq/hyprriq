import { describe, it, expect } from "vitest";
import { ALLOWED_PROFILES, MIN_AUTHORITY } from "./weightValidation";
import { weightKeysForTrack, TRACK_WEIGHTS } from "./weights";

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
// Track 4 (2026-07-11, gate spec sub-gate A): documentation_review goes LIVE — entries authored per
// the founder-ruled collision audit (single-source vetoes on OBSERVED artifacts, OQ-A4).
const LIVE_FIREWALL_TRACKS = ["supplier_identity", "supply_chain_relationship", "brand_risk_assessment", "documentation_review"] as const;

// Documented exclusions — keys deliberately OUTSIDE the firewall config, with the ruling that put
// them there. Anything else uncovered is a build error.
const RULED_EXCLUSIONS: Record<string, string[]> = {
  // ADR-T2-001 — loa_legitimate is deliberately NOT proposable in Track 2 (an LOA is post-
  // relationship, private, unverifiable; it routes to the Compliance Documentation layer). The
  // firewall rejects it by design, so it carries no provenance/authority entries.
  supply_chain_relationship: ["loa_legitimate"],
  // Founder-signed 2026-07-11 — the Keepa keys are firewall-INERT until the Keepa plugin gate
  // ships direct marketplace observation ("no marketplace-observation capability means no key
  // asserting it, veto or positive" — the positive-key twin of the OQ-B ruling). The gate that
  // builds the plugin authors real entries and REMOVES this exclusion row.
  brand_risk_assessment: ["keepa_stable_no_cliff", "keepa_enforcement_cliff", "low_seller_count_stable"],
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

  it("Track 5 is LIVE as the NON-VOTING arbitrator — no weight keys BY DESIGN, nothing for the firewall to cover", () => {
    // Sub-gate B (founder-ruled 2026-07-14) — the banner procedure fired for Track 5 exactly as
    // written: it went live with NO weight keys (non-voting arbitration; OQ-B1). There is nothing
    // to register — the lock here asserts that stays true: the moment anyone gives sourcing_logic
    // a weight table or a verdict weight, Track 5 has become a voter and its ruled gate is broken.
    // The n_a/never-votes behavioral locks live in track5.test.ts (AT-B2).
    expect(weightKeysForTrack("sourcing_logic"), "sourcing_logic must NEVER have weight keys (non-voting)").toEqual([]);
    expect(TRACK_WEIGHTS["sourcing_logic"], "sourcing_logic must NEVER have a verdict weight (non-voting)").toBeUndefined();
  });
});
