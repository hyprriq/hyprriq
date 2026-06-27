import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { serperPlugin } from "./serper";

beforeEach(() => vi.stubEnv("SERPER_API_KEY", "test-key"));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("serperPlugin", () => {
  it("declares discovery capabilities incl. business_registry + linkedin_presence", () => {
    expect(serperPlugin.capabilities).toEqual(
      expect.arrayContaining(["business_registry", "linkedin_presence", "marketplace_signals"]),
    );
  });
  it("maps organic results to provenance-tagged sources classified by domain", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ organic: [
        { title: "TX SOS", link: "https://sos.state.tx.us/corp", snippet: "registered" },
        { title: "LinkedIn", link: "https://www.linkedin.com/company/x", snippet: "company" },
      ] }),
    }));
    const out = await serperPlugin.acquire({ question: "business_registry", input: "Meridian registration", case_id: "c1", track_key: "supplier_identity" });
    expect(out.sources).toHaveLength(2);
    expect(out.sources[0].provenance.source_profile).toBe("government_record");
    expect(out.sources[1].provenance.source_profile).toBe("social");
    expect(out.sources[0].provenance.acquisition_method).toBe("serper");
    expect(out.final_status).toBe("ok");
    expect(out.cost_usd).toBeGreaterThan(0);
  });
  it("degrades gracefully on a permanent error (no retry)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    const out = await serperPlugin.acquire({ question: "business_registry", input: "x", case_id: "c1", track_key: "supplier_identity" });
    expect(out.sources).toEqual([]);
    expect(out.final_status).toBe("permanent_error");
    expect(out.retry_count).toBe(0);
  });
});
