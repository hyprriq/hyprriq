import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { whoisPlugin } from "./whois";

beforeEach(() => vi.stubEnv("WHOIS_API_KEY", "test-key"));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("whoisPlugin", () => {
  it("declares domain capabilities", () => {
    expect(whoisPlugin.capabilities).toContain("domain_age");
    expect(whoisPlugin.capabilities).toContain("registration_date");
  });
  it("returns a whois-profile source with the domain age", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ WhoisRecord: { estimatedDomainAge: 2600, createdDate: "2019-01-01" } }),
    }));
    const out = await whoisPlugin.acquire({ question: "domain_age", input: "meridian-wholesale.example", case_id: "c1", track_key: "supplier_identity" });
    expect(out.sources).toHaveLength(1);
    expect(out.sources[0].provenance.source_profile).toBe("whois");
    expect(out.sources[0].snippet).toMatch(/2600/);
    expect(out.final_status).toBe("ok");
    expect(out.cost_usd).toBeGreaterThan(0);
  });
  it("degrades gracefully on a permanent provider error (no retry)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const out = await whoisPlugin.acquire({ question: "domain_age", input: "x.example", case_id: "c1", track_key: "supplier_identity" });
    expect(out.sources).toEqual([]);
    expect(out.final_status).toBe("permanent_error");
    expect(out.retry_count).toBe(0);
  });
});
