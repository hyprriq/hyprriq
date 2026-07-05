import { describe, it, expect, vi, beforeEach } from "vitest";
import { normalizeName } from "@/lib/utils/normalize-name";

const { maybeSingle, eq, select, upsert, from, auditInsert } = vi.hoisted(() => {
  const maybeSingle = vi.fn().mockResolvedValue({ data: null });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const auditInsert = vi.fn().mockResolvedValue({ error: null }); // H2 — memory-write failure audit trail
  const from = vi.fn((table: string) => (table === "audit_log" ? { insert: auditInsert } : { select, upsert }));
  return { maybeSingle, eq, select, upsert, from, auditInsert };
});
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: { from } }));

import { writeIntelligence, upsertVendorIntelligence } from "./intelligence";

beforeEach(() => {
  from.mockClear(); select.mockClear(); eq.mockClear(); auditInsert.mockClear();
  upsert.mockClear().mockResolvedValue({ error: null });
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

  it("Spec-B: mismatch case keys memory on the RESOLVED identity (never the entered name) + records the alias", async () => {
    const supplier_identity = {
      original_input: { name: "Bosch", website: "globaldist.com" },
      resolved_name: "Global Distribution LLC", resolved_domain: "globaldist.com",
      candidate_domains: [], registration_signals: [], identity_confidence: "high" as const,
      identity_unconfirmed: false, resolution_method: "resolved_from_website" as const, resolution_notes: "",
      resolution_audit: { winner: "globaldist.com", score: 0, runner_up: null, runner_up_score: 0, matched_by: ["website_anchored"], warnings: [] },
      resolution_confidence: "high" as const, input_consistency: "low" as const,
      identity_discrepancy: { kind: "name_is_brand" as const, entered_name: "Bosch", resolved_name: "Global Distribution LLC", resolved_domain: "globaldist.com", client_note: "…" },
    };
    await writeIntelligence({
      case_id: "c1", vendor_name: "Bosch", vendor_website: "globaldist.com", supplier_identity,
      brands_submitted: ["Bosch"], marketplace: "amazon_us", plan_type: "growth_279",
    }, "infer");
    const vendorRow = upsert.mock.calls.map((c) => c[0] as Record<string, unknown>).find((r) => "vendor_name_normalized" in r)!;
    expect(vendorRow.vendor_name_normalized).toBe(normalizeName("Global Distribution LLC"));
    expect(vendorRow.vendor_name_normalized).not.toBe(normalizeName("Bosch")); // the pollution bug: never key on the entered/brand name
    expect(vendorRow.entered_names).toContain("Bosch");
  });

  it("skips the vendor upsert when there is no vendor name", async () => {
    await writeIntelligence({
      case_id: "c1", vendor_name: null, vendor_website: null,
      brands_submitted: [], marketplace: "amazon_us", plan_type: "growth_279",
    });
    expect(from).not.toHaveBeenCalled();
  });
});

describe("H2 — memory-write failures are loud, never silent (OQ-2: log-don't-throw until H6)", () => {
  it("a vendor upsert error → degraded:true + audit_log row; does NOT throw", async () => {
    upsert.mockResolvedValueOnce({ error: { message: "column missing" } });
    const res = await writeIntelligence({
      case_id: "c9", vendor_name: "Acme Co", vendor_website: null,
      brands_submitted: [], marketplace: "amazon_us", plan_type: "growth_279",
    });
    expect(res.degraded).toBe(true);
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      record_id: "c9",
      new_value: expect.objectContaining({ memory_write_failed: expect.stringContaining("column missing") }),
    }));
  });
  it("a clean write reports degraded:false and no audit entry", async () => {
    const res = await writeIntelligence({
      case_id: "c9", vendor_name: "Acme Co", vendor_website: null,
      brands_submitted: ["BrandX"], marketplace: "amazon_us", plan_type: "growth_279",
    });
    expect(res.degraded).toBe(false);
    expect(auditInsert).not.toHaveBeenCalled();
  });
});
