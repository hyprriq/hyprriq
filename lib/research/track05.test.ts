import { describe, it, expect, vi, beforeEach } from "vitest";

const { gather, runModel } = vi.hoisted(() => ({ gather: vi.fn(), runModel: vi.fn() }));
vi.mock("@/lib/research/acquisition/orchestrator", () => ({ Orchestrator: class { gather = gather } }));
vi.mock("@/lib/ai/runModel", () => ({ runModel }));

import { resolveSupplierIdentity } from "./track05";
import type { TrackContext } from "@/lib/research/contracts";

const ctx = (over: Partial<TrackContext> = {}): TrackContext => ({
  case_id: "c1", vendor_name: "Acme Distributing", vendor_website: null,
  brands_submitted: [], marketplace: "amazon_us", plan_type: "growth_279", ...over,
});

const src = (url: string, profile: string) => ({
  url, title: "t", snippet: "s", raw: {},
  provenance: { provider: "Serper", provider_version: "v1", plugin: "serper", acquisition_method: "serper", source_profile: profile, source_type: "third_party", authority_score: "high", freshness_days: null, collected_at: "t", expires_at: "t", refresh_required: false },
});
const pack = (sources: unknown[]) => ({ pack: { schema_version: "1.0.0", case_id: "c1", track_key: "supplier_identity", sources, evidence_hash: "h", collected_at: "t" }, metrics: [] });
const model = (json: unknown) => ({ json, model_provider: "anthropic", model_version: "claude-sonnet-4-6", tokens: 10, cost_usd: 0, latency_ms: 1 });

beforeEach(() => { gather.mockReset(); runModel.mockReset(); });

describe("resolveSupplierIdentity", () => {
  it("provided website → high/provided WITHOUT calling orchestrator or model", async () => {
    const r = await resolveSupplierIdentity(ctx({ vendor_website: "https://www.acme-distributing.com" }));
    expect(r.resolution_method).toBe("provided");
    expect(r.identity_confidence).toBe("high");
    expect(r.resolved_domain).toBe("acme-distributing.com");
    expect(gather).not.toHaveBeenCalled();
    expect(runModel).not.toHaveBeenCalled();
  });

  it("website absent + one dominant candidate → resolved_dominant/high with resolved_domain", async () => {
    gather.mockResolvedValue(pack([
      src("https://opencorporates.com/acme", "registry"),        // → src_0 (registry_hit)
      src("https://acme-distributing.com/about", "official_company"), // → src_1 (self_identifies via host match)
    ]));
    runModel.mockResolvedValue(model({
      candidates: [{ domain: "acme-distributing.com", registration_hint: "LLC", address_hint: "TX", supporting_source_ids: ["src_0", "src_1"] }],
      reasoning_notes: "one dominant entity",
    }));
    const r = await resolveSupplierIdentity(ctx());
    expect(r.identity_confidence).toBe("high");
    expect(r.identity_unconfirmed).toBe(false);
    expect(r.resolved_domain).toBe("acme-distributing.com");
    expect(["resolved_dominant", "normalized"]).toContain(r.resolution_method);
    expect(r.original_input.name).toBe("Acme Distributing");
  });

  it("typo on a dominant entity resolves silently → normalized/high, original preserved", async () => {
    gather.mockResolvedValue(pack([
      src("https://opencorporates.com/tdsynnex", "registry"),
      src("https://tdsynnex.com/about", "official_company"),
    ]));
    runModel.mockResolvedValue(model({
      candidates: [{ domain: "tdsynnex.com", registration_hint: "NYSE: SNX", address_hint: "Fremont CA", supporting_source_ids: ["src_0", "src_1"] }],
    }));
    const r = await resolveSupplierIdentity(ctx({ vendor_name: "TD Synexx" }));
    expect(r.identity_confidence).toBe("high");
    expect(r.identity_unconfirmed).toBe(false);
    expect(r.resolution_method).toBe("normalized"); // fuzzy match absorbed the typo — not ambiguity
    expect(r.resolved_domain).toBe("tdsynnex.com");
    expect(r.original_input.name).toBe("TD Synexx");
  });

  it("website absent + two plausible candidates, no winner → ambiguous/low/unconfirmed", async () => {
    gather.mockResolvedValue(pack([src("https://opencorporates.com/x", "registry")]));
    runModel.mockResolvedValue(model({
      candidates: [
        { domain: "acme-one.com", supporting_source_ids: ["src_0"] },
        { domain: "acme-two.com", supporting_source_ids: ["src_0"] },
      ],
    }));
    const r = await resolveSupplierIdentity(ctx({ vendor_name: "Acme" }));
    expect(r.identity_unconfirmed).toBe(true);
    expect(r.resolved_domain).toBeNull();
    expect(["ambiguous", "unresolved"]).toContain(r.resolution_method);
  });
});
