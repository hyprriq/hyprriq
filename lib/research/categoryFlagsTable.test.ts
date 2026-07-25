import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import {
  CATEGORY_FLAGS_TABLE, CATEGORY_FLAGS_CONTRACT_VERSION, BRAND_KEYED_SUBCATEGORY,
  CATEGORY_FLAGS_GOVERNING_LAW,
} from "@/lib/research/categoryFlagsTable";

// ── Category Compliance (spec 2026-07-23, APPROVED) — the versioned Brief v1 §8 table as config.
// THE DOC-IDENTITY LOCK: every flag-language string and risk level in the module must be
// BYTE-IDENTICAL to docs/CATEGORY_FLAGS_TABLE_recovered.md — founder-authored client copy is
// code-injected verbatim, never paraphrased (the VERDICT_SENTENCES law). If either side changes,
// this fails BY NAME: the module and the recovered doc can never drift apart. ──

const DOC = readFileSync(join(process.cwd(), "docs", "CATEGORY_FLAGS_TABLE_recovered.md"), "utf8");

describe("cc-1.0.0 — the Brief v1 §8 table, verbatim as config", () => {
  it("carries exactly the nine founder-authored subcategories", () => {
    expect(CATEGORY_FLAGS_TABLE).toHaveLength(9);
    expect(CATEGORY_FLAGS_CONTRACT_VERSION).toBe("cc-1.0.0");
  });

  it("DOC-IDENTITY: every flag-language string appears BYTE-IDENTICALLY in the recovered doc", () => {
    for (const row of CATEGORY_FLAGS_TABLE) {
      expect(DOC.includes(row.flag_language), `flag language for "${row.subcategory}" has drifted from the recovered doc`).toBe(true);
    }
  });

  it("DOC-IDENTITY: every subcategory name and risk level appears in the recovered doc, and risk levels use ONLY the founder's enum", () => {
    for (const row of CATEGORY_FLAGS_TABLE) {
      expect(DOC.includes(row.subcategory), `subcategory "${row.subcategory}" not in the recovered doc`).toBe(true);
      expect(["HIGH", "MODERATE-HIGH", "MODERATE"]).toContain(row.risk_level);
    }
  });

  it("the governing law rides the module verbatim (the honesty law's source text)", () => {
    expect(DOC.includes(CATEGORY_FLAGS_GOVERNING_LAW)).toBe(true);
    expect(CATEGORY_FLAGS_GOVERNING_LAW).toContain("may require");
  });

  it("every flag language uses 'may require' or 'may apply/trigger' shapes — never absolute (the governing law, checked)", () => {
    for (const row of CATEGORY_FLAGS_TABLE) {
      expect(/may (require|apply|trigger)|check amazon|verify/i.test(row.flag_language), `"${row.subcategory}" flag language lacks a may-require shape`).toBe(true);
    }
  });

  it("the electronics row is the BRAND-KEYED exception: its triggers are brand names, matched in code with no research hop", () => {
    const row = CATEGORY_FLAGS_TABLE.find((r) => r.subcategory === BRAND_KEYED_SUBCATEGORY)!;
    expect(row).toBeTruthy();
    expect(row.brand_keyed).toBe(true);
    expect(row.trigger_keywords.map((k) => k.toLowerCase())).toContain("lenovo");
    expect(CATEGORY_FLAGS_TABLE.filter((r) => r.brand_keyed)).toHaveLength(1);
  });
});
