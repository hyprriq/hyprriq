import { describe, it, expect } from "vitest";
import { Orchestrator } from "./orchestrator";
import type { AcquisitionPlugin } from "./types";

const fakePlugin = (id: AcquisitionPlugin["id"], caps: AcquisitionPlugin["capabilities"], n: number): AcquisitionPlugin => ({
  id, capabilities: caps,
  acquire: async (q) => ({
    sources: Array.from({ length: n }, (_, i) => ({
      url: `https://${id}.example/${i}`, title: `${id} ${q.question}`, snippet: "s", raw: {},
      provenance: { provider: "Fake", provider_version: "v1", plugin: id, acquisition_method: id,
        source_profile: "news", source_type: "third_party", authority_score: "medium",
        freshness_days: null, collected_at: "2026-06-27T00:00:00.000Z",
        expires_at: "2027-06-27T00:00:00.000Z", refresh_required: false },
    })),
    retry_count: 0, final_status: "ok" as const, cost_usd: 0,
  }),
});

describe("Orchestrator", () => {
  it("routes each question to a capable plugin and aggregates a pack", async () => {
    const orch = new Orchestrator([
      fakePlugin("whois", ["domain_age"], 1),
      fakePlugin("serper", ["business_registry", "linkedin_presence"], 2),
    ]);
    const { pack, metrics } = await orch.gather({
      case_id: "c1", track_key: "supplier_identity",
      requests: [
        { question: "domain_age", input: "x.example" },
        { question: "business_registry", input: "x registration" },
      ],
    });
    expect(pack.sources).toHaveLength(3); // 1 whois + 2 serper
    expect(metrics.find((m) => m.plugin_id === "whois")?.evidence_items_returned).toBe(1);
    expect(metrics.find((m) => m.plugin_id === "serper")?.evidence_items_returned).toBe(2);
  });
  it("skips questions no plugin can answer without throwing", async () => {
    const orch = new Orchestrator([fakePlugin("whois", ["domain_age"], 1)]);
    const { pack } = await orch.gather({
      case_id: "c1", track_key: "supplier_identity",
      requests: [{ question: "marketplace_signals", input: "x" }],
    });
    expect(pack.sources).toEqual([]);
  });
  it("degrades gracefully when a plugin throws (pack still built from the rest)", async () => {
    const throwing: AcquisitionPlugin = { id: "serper", capabilities: ["business_registry"], acquire: async () => { throw new Error("down"); } };
    const orch = new Orchestrator([fakePlugin("whois", ["domain_age"], 1), throwing]);
    const { pack } = await orch.gather({
      case_id: "c1", track_key: "supplier_identity",
      requests: [{ question: "domain_age", input: "x" }, { question: "business_registry", input: "y" }],
    });
    expect(pack.sources).toHaveLength(1); // whois survived; serper failure isolated
  });
});
