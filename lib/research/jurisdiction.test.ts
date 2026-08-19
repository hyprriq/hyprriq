import { describe, it, expect } from "vitest";
import {
  inferJurisdiction, countryFromDomain, countryFromAddress,
  registryQuery, tradeBodyQuery, NEUTRAL_REGISTRY,
} from "./jurisdiction";
import { buildTrack1Requests } from "./tracks/track1.queries";
import type { TrackContext } from "./contracts";

// ── THE DEFECT: every supplier on earth was asked a US question.
//   business_registry → "<vendor> business registration secretary of state"
//   bbb_listing       → "<vendor> BBB better business bureau"
// government_registration is +4 (the largest positive in the identity table) and
// bbb_or_trade_association is +1, so a legitimate non-US distributor lost up to 5 points for being
// non-US — and the client was then told "no government registration record was found" as though it
// were a finding about the supplier.

describe("country inference — from the signals the engine already has", () => {
  it("reads a ccTLD", () => {
    expect(countryFromDomain("gandelli.it")).toBe("it");
    expect(countryFromDomain("https://acme.co.uk/about")).toBe("uk");
    expect(countryFromDomain("shop.example.com.au")).toBe("au");
  });

  it("⚠ treats generic TLDs as UNKNOWN, never as US — the whole point", () => {
    // A .com supplier is not an American supplier. Defaulting .com to the US is how the original
    // bug would come back wearing a jurisdiction module.
    for (const d of ["lacacorp.com", "acme.net", "brand.io", "shop.co"]) {
      expect(countryFromDomain(d), d).toBeNull();
    }
  });

  it("reads an address when the domain says nothing", () => {
    expect(countryFromAddress("Unit 4, 22 High Street, London, SW1A 1AA")).toBe("uk");
    expect(countryFromAddress("Via Roma 12, Milano, Italy")).toBe("it");
    expect(countryFromAddress("8907 Warner Ave, Huntington Beach, CA 92647")).toBe("us");
    expect(countryFromAddress(null)).toBeNull();
  });
});

describe("the query that gets sent", () => {
  it("a UK supplier is asked about Companies House, not a Secretary of State", () => {
    const j = inferJurisdiction({ domain: "acme.co.uk" });
    expect(registryQuery("Acme Ltd", j)).toBe("Acme Ltd Companies House");
    expect(registryQuery("Acme Ltd", j)).not.toMatch(/secretary of state/i);
  });

  it("an Italian supplier is asked about the Registro Imprese (AWI-2607-031's shape)", () => {
    expect(registryQuery("Gandelli SRL", inferJurisdiction({ domain: "gandelli.it" })))
      .toContain("Registro Imprese");
  });

  it("⛔ an UNKNOWN jurisdiction gets the NEUTRAL question, never the US one", () => {
    const j = inferJurisdiction({ domain: "lacacorp.com" });
    expect(j.code).toBeNull();
    expect(j.source).toBe("unknown");
    expect(registryQuery("Lacaco", j)).toBe(`Lacaco ${NEUTRAL_REGISTRY}`);
    expect(registryQuery("Lacaco", j)).not.toMatch(/secretary of state/i);
  });

  it("a US supplier still gets the US registry — this fixes non-US without breaking US", () => {
    expect(registryQuery("Acme Inc", inferJurisdiction({ address: "Huntington Beach, CA 92647" })))
      .toMatch(/Secretary of State/i);
  });

  it("the trade-body query matches the KEY it feeds (bbb_or_trade_association)", () => {
    // The key admits trade associations; the old query only ever asked about the BBB, so
    // trade-association evidence was unfindable for EVERY supplier, US included.
    expect(tradeBodyQuery("Acme", inferJurisdiction({ domain: "acme.com" }))).toMatch(/trade association/i);
    expect(tradeBodyQuery("Acme", inferJurisdiction({ domain: "acme.com" }))).toMatch(/BBB/);
  });

  it("outside the US/Canada the BBB is dropped — it does not exist there", () => {
    const q = tradeBodyQuery("Acme Ltd", inferJurisdiction({ domain: "acme.co.uk" }));
    expect(q).not.toMatch(/BBB|better business bureau/i);
    expect(q).toMatch(/trade association|chamber of commerce/i);
  });
});

describe("⚠ marketplace is the WEAKEST signal and must never override where the company IS", () => {
  it("a UK supplier selling on amazon.com is still UK — the founder's actual case", () => {
    const j = inferJurisdiction({ domain: "acme.co.uk", marketplace: "amazon_us" });
    expect(j.code).toBe("uk");
    expect(j.source).toBe("domain");
  });

  it("an address beats the marketplace too", () => {
    expect(inferJurisdiction({ address: "Milano, Italy", marketplace: "amazon_us" }).code).toBe("it");
  });

  it("it breaks a total tie and nothing more", () => {
    expect(inferJurisdiction({ marketplace: "amazon_uk" }).code).toBe("uk");
    expect(inferJurisdiction({ marketplace: "amazon_us" }).code).toBeNull(); // US is NOT assumed
  });
});

describe("the wiring — the real request builder, not just the helpers", () => {
  const ctx = (over: Partial<TrackContext>): TrackContext => ({
    case_id: "c", vendor_name: "Acme Ltd", vendor_website: null, brands_submitted: [],
    marketplace: "amazon_us", plan_type: "growth_279", attempt_number: 1, ...over,
  } as TrackContext);

  it("a UK vendor's registry request names Companies House", () => {
    const reqs = buildTrack1Requests(ctx({ vendor_website: "https://acme.co.uk" }));
    const reg = reqs.find((r) => r.question === "business_registry");
    expect(reg?.input).toContain("Companies House");
  });

  it("⛔ NO request anywhere says 'secretary of state' for a non-US vendor", () => {
    const reqs = buildTrack1Requests(ctx({ vendor_website: "https://acme.co.uk" }));
    expect(reqs.map((r) => r.input).join(" | ")).not.toMatch(/secretary of state/i);
  });

  it("an unknown-jurisdiction vendor gets the neutral registry question", () => {
    const reqs = buildTrack1Requests(ctx({ vendor_website: "https://lacacorp.com" }));
    const reg = reqs.find((r) => r.question === "business_registry");
    expect(reg?.input).toContain(NEUTRAL_REGISTRY);
  });
});
