import { describe, it, expect, vi, afterEach } from "vitest";
import { whoisPlugin } from "./whois";

afterEach(() => vi.unstubAllGlobals());

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
    expect(out).toHaveLength(1);
    expect(out[0].provenance.source_profile).toBe("whois");
    expect(out[0].snippet).toMatch(/2600/);
  });
  it("degrades gracefully to [] on a provider error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const out = await whoisPlugin.acquire({ question: "domain_age", input: "x.example", case_id: "c1", track_key: "supplier_identity" });
    expect(out).toEqual([]);
  });
});
