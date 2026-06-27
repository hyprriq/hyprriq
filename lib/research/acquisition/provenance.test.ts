import { describe, it, expect } from "vitest";
import { buildProvenance, assertProvenanceComplete } from "./provenance";

describe("provenance", () => {
  it("builds a complete provenance record from a source + plugin", () => {
    const p = buildProvenance({ url: "https://sos.state.tx.us/x", pluginId: "serper", collectedAt: "2026-06-27T00:00:00.000Z", freshnessDays: null });
    expect(p.source_profile).toBe("government_record");
    expect(p.source_type).toBe("government_record");
    expect(p.authority_score).toBe("high");
    expect(p.acquisition_method).toBe("serper");
    expect(p.refresh_required).toBe(false);
    // expires_at = collected_at + 1825 days (government_record)
    expect(p.expires_at).toBe("2031-06-26T00:00:00.000Z");
  });
  it("accepts a complete provenance record and rejects an incomplete one", () => {
    const good = buildProvenance({ url: "https://x", pluginId: "whois", collectedAt: "2026-06-27T00:00:00.000Z", freshnessDays: 0 });
    expect(() => assertProvenanceComplete(good)).not.toThrow();
    // runtime error — deliberately missing fields (Partial<Provenance> typechecks but assertProvenanceComplete throws)
    expect(() => assertProvenanceComplete({ source_profile: "whois" })).toThrow(/incomplete provenance/i);
  });
});
