import { describe, it, expect } from "vitest";
import { finalizePack, EVIDENCE_PACK_SCHEMA_VERSION } from "./pack";
import type { RawSource } from "./types";

const src = (method: "serper" | "whois", url: string, title: string): RawSource => ({
  url, title, snippet: "s", raw: {},
  provenance: {
    provider: method === "whois" ? "WhoisXMLAPI" : "Serper", provider_version: "v1",
    plugin: method, acquisition_method: method,
    source_profile: "news", source_type: "third_party", authority_score: "medium",
    freshness_days: null, collected_at: "2026-06-27T00:00:00.000Z",
    expires_at: "2027-06-27T00:00:00.000Z", refresh_required: false,
  },
});

describe("finalizePack", () => {
  it("stamps the immutable schema_version", () => {
    const pack = finalizePack("c1", "supplier_identity", [], "2026-06-27T00:00:00.000Z");
    expect(pack.schema_version).toBe(EVIDENCE_PACK_SCHEMA_VERSION);
  });

  it("orders sources deterministically and hashes independently of input order", () => {
    const a = src("serper", "https://b.example", "B");
    const b = src("serper", "https://a.example", "A");
    const p1 = finalizePack("c1", "supplier_identity", [a, b], "2026-06-27T00:00:00.000Z");
    const p2 = finalizePack("c1", "supplier_identity", [b, a], "2026-06-27T00:00:00.000Z");
    expect(p1.sources.map((s) => s.url)).toEqual(p2.sources.map((s) => s.url)); // same order
    expect(p1.evidence_hash).toBe(p2.evidence_hash);                            // same hash
  });

  it("hash ignores the per-run collected_at timestamp (replayable)", () => {
    const s = src("whois", "whois:x.example", "WHOIS x");
    const p1 = finalizePack("c1", "supplier_identity", [s], "2026-06-27T00:00:00.000Z");
    const p2 = finalizePack("c1", "supplier_identity", [s], "2099-01-01T00:00:00.000Z");
    expect(p1.evidence_hash).toBe(p2.evidence_hash);
  });

  it("different evidence content yields a different hash", () => {
    const p1 = finalizePack("c1", "supplier_identity", [src("serper", "https://a.example", "A")], "2026-06-27T00:00:00.000Z");
    const p2 = finalizePack("c1", "supplier_identity", [src("serper", "https://z.example", "Z")], "2026-06-27T00:00:00.000Z");
    expect(p1.evidence_hash).not.toBe(p2.evidence_hash);
  });
});
