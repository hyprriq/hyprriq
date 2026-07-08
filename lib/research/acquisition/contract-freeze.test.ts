import { describe, it, expect } from "vitest";
import { EVIDENCE_PACK_SCHEMA_VERSION, finalizePack } from "./pack";
import type { Provenance } from "./types";

// ╔══════════════════════════════════════════════════════════════════════════════════════╗
// ║ FROZEN CONTRACT GUARD — Evidence Pack v1.0.0, frozen 2026-06-27 after production         ║
// ║ validation (CTO §4). The EvidencePack + Provenance shapes are the single source of truth ║
// ║ every downstream layer (Track, Synthesis, Memory, Outcome) consumes. If a test below     ║
// ║ fails, you are changing a FROZEN contract — STOP. Make a deliberate, versioned decision   ║
// ║ (bump EVIDENCE_PACK_SCHEMA_VERSION + migrate consumers) rather than editing in place.     ║
// ╚══════════════════════════════════════════════════════════════════════════════════════╝
describe("Evidence Pack contract freeze (1.1.0)", () => {
  // 1.0.0 → 1.1.0 (H7 SO-1, founder-SIGNED 2026-07-07, plan 2026-07-07-h7-firewall-hardening.md):
  // canonical-URL dedupe in finalizePack. This is the deliberate, versioned decision the guard
  // above demands — shape unchanged (key tests below still lock it), content semantics versioned.
  // Frozen 1.0.0 packs are history and are never migrated.
  it("schema_version is frozen at 1.1.0", () => {
    expect(EVIDENCE_PACK_SCHEMA_VERSION).toBe("1.1.0");
  });

  it("EvidencePack has exactly the frozen top-level keys", () => {
    const pack = finalizePack("c1", "supplier_identity", [], "2026-06-27T00:00:00.000Z");
    expect(Object.keys(pack).sort()).toEqual(
      ["case_id", "collected_at", "evidence_hash", "schema_version", "sources", "track_key"].sort(),
    );
  });

  it("Provenance has exactly the frozen keys", () => {
    const p: Provenance = {
      provider: "x", provider_version: "x", plugin: "serper", acquisition_method: "serper",
      source_profile: "news", source_type: "third_party", authority_score: "low",
      freshness_days: null, collected_at: "t", expires_at: "t", refresh_required: false,
    };
    expect(Object.keys(p).sort()).toEqual(
      ["acquisition_method", "authority_score", "collected_at", "expires_at", "freshness_days",
        "plugin", "provider", "provider_version", "refresh_required", "source_profile", "source_type"].sort(),
    );
  });
});
