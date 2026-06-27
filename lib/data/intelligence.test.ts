import { describe, it, expect, vi, beforeEach } from "vitest";
import { normalizeName } from "@/lib/utils/normalize-name";

const { maybeSingle, eq, select, upsert, from } = vi.hoisted(() => {
  const maybeSingle = vi.fn().mockResolvedValue({ data: null });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn(() => ({ select, upsert }));
  return { maybeSingle, eq, select, upsert, from };
});
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: { from } }));

import { writeIntelligence, upsertVendorIntelligence } from "./intelligence";

beforeEach(() => {
  from.mockClear(); select.mockClear(); eq.mockClear(); upsert.mockClear();
  maybeSingle.mockResolvedValue({ data: null });
});

describe("writeIntelligence (ADR-G006 write-side)", () => {
  it("upserts vendor_intelligence keyed on normalizeName with case_count=1 on a first case", async () => {
    await upsertVendorIntelligence("Meridian Wholesale Co.", ["Acme Audio"], "pass");
    expect(from).toHaveBeenCalledWith("vendor_intelligence");
    const row = upsert.mock.calls[0][0];
    expect(row.vendor_name_normalized).toBe(normalizeName("Meridian Wholesale Co."));
    expect(row.case_count).toBe(1);
    expect(row.overall_risk_signal).toBe("pass");
    expect(row.known_brand_relationships).toContain(normalizeName("Acme Audio"));
    expect(upsert.mock.calls[0][1]).toEqual({ onConflict: "vendor_name_normalized" });
  });

  it("increments case_count and merges brands when a prior row exists", async () => {
    maybeSingle.mockResolvedValueOnce({ data: { id: "v1", case_count: 2, known_brand_relationships: ["northpeak"] } });
    await upsertVendorIntelligence("Meridian Wholesale Co.", ["Acme Audio"], null);
    const row = upsert.mock.calls[0][0];
    expect(row.case_count).toBe(3);
    expect(row.known_brand_relationships).toEqual(expect.arrayContaining(["northpeak", normalizeName("Acme Audio")]));
    // null signal must NOT overwrite a prior signal
    expect(row).not.toHaveProperty("overall_risk_signal");
  });

  it("writeIntelligence fires a vendor upsert + one brand upsert per brand", async () => {
    await writeIntelligence({
      case_id: "c1", vendor_name: "Meridian Wholesale Co.", vendor_website: null,
      brands_submitted: ["Acme Audio", "NorthPeak"], marketplace: "amazon_us", plan_type: "growth_279",
    });
    // each upsert does a read (select) + a write (upsert); assert on the writes.
    const vendorUpserts = upsert.mock.calls.filter((c) => "vendor_name_normalized" in (c[0] as object));
    const brandUpserts = upsert.mock.calls.filter((c) => "brand_name_normalized" in (c[0] as object));
    expect(vendorUpserts.length).toBe(1);
    expect(brandUpserts.length).toBe(2);
  });

  it("skips the vendor upsert when there is no vendor name", async () => {
    await writeIntelligence({
      case_id: "c1", vendor_name: null, vendor_website: null,
      brands_submitted: [], marketplace: "amazon_us", plan_type: "growth_279",
    });
    expect(from).not.toHaveBeenCalled();
  });
});
