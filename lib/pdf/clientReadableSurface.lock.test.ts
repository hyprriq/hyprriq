import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  clientReadableSurface, PDF_CONTENT_FIELDS, PDF_FINDING_FIELDS,
} from "./clientReadableSurface";
import { findInternalTokens } from "@/lib/portal/clientTokenCheckpoint";

const repo = path.resolve(__dirname, "../..");
const read = (p: string) => fs.readFileSync(path.join(repo, p), "utf8");
const strip = (x: string) => x.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

// ── LOCK — THE PDF ASSERTS ON WHAT A CLIENT READS (fixed 2026-08-31) ─────────────────────────
//
// ⚠ THE DEFECT. The PDF render asserted the presence checkpoint against the WHOLE payload, and
// `findings[].track_key` holds `supplier_identity` — an internal-content pattern. Every PDF failed,
// on all five areas. NINE DAYS, and nothing said so, because a publish gate that refuses every
// valid document is indistinguishable from a working one until someone tries it.
//
// The fix is the PROJECTION, never the guard: the checkpoint's own law forbids widening it with
// grammar. What this lock protects is that the SCOPING stays honest — narrow enough to admit the
// keys, wide enough to still catch a real leak.

describe("LOCK — the scoping is complete (a new field cannot default onto either side)", () => {
  it("every field the render assembles is classified", () => {
    // Read from the SOURCE, not from a copy: the classification must track the payload actually
    // built in renderReportPdf.ts, or it becomes documentation of a shape that no longer exists.
    const src = read("lib/pdf/renderReportPdf.ts");
    const block = src.slice(src.indexOf("const content = {"));
    // ⚠ SHORTHAND PROPERTIES COUNT. The first version matched only `name:` and found 6 of 9 —
    // `clientName`, `verdict` and `report` are written shorthand, with no colon. It failed rather
    // than reporting the other six as "all classified", which is the only acceptable behaviour for
    // a completeness check that cannot see everything.
    const assembled = [...block.slice(0, block.indexOf("};")).matchAll(/^\s{4}(\w+)\s*[:,]/gm)].map((m) => m[1]);
    expect(assembled.length, "could not parse the content payload — the scanner is wrong, not the code")
      .toBeGreaterThanOrEqual(8);
    const missing = assembled.filter((f) => !(f in PDF_CONTENT_FIELDS));
    expect(
      missing,
      "these fields are assembled into the PDF payload but are NOT classified in " +
        "PDF_CONTENT_FIELDS. Decide, with a reason: does the reader see these exact bytes? " +
        `Unclassified: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("every classified field carries a real classification", () => {
    for (const [field, kind] of Object.entries({ ...PDF_CONTENT_FIELDS, ...PDF_FINDING_FIELDS })) {
      expect(["read", "lookup", "unrendered", "mixed"], `${field} has an unknown classification`)
        .toContain(kind);
    }
  });

  it("everything classified `read` actually reaches the assertion", () => {
    const surface = clientReadableSurface({
      caseNumber: "AWI-0000-000", vendor: "v", brands: ["b"], brandsSubmitted: ["bs"],
      clientName: "cn", deliveredAt: "d", report: { r: "x" },
      findings: [{ compiled_findings_json: { c: "y" }, questions_to_ask: ["q"] }],
    });
    for (const [field, kind] of Object.entries(PDF_CONTENT_FIELDS)) {
      if (kind !== "read") continue;
      expect(field in surface, `${field} is classified "read" but is dropped before the checkpoint`)
        .toBe(true);
    }
    for (const [field, kind] of Object.entries(PDF_FINDING_FIELDS)) {
      if (kind !== "read") continue;
      expect(field in surface.findings[0], `findings[].${field} is "read" but is dropped`).toBe(true);
    }
  });

  it("nothing classified `lookup` or `unrendered` survives into the assertion", () => {
    // The mirror. If a structural field leaks back in, the nine-day outage returns.
    const surface = clientReadableSurface({
      caseNumber: "c", vendor: "v", brands: [], brandsSubmitted: [], clientName: "n",
      deliveredAt: "d", report: null,
      findings: [{ compiled_findings_json: null, questions_to_ask: null }],
    }) as unknown as Record<string, unknown>;
    for (const [field, kind] of Object.entries(PDF_CONTENT_FIELDS)) {
      if (kind === "read" || kind === "mixed") continue;
      expect(field in surface, `${field} is "${kind}" but reaches the checkpoint`).toBe(false);
    }
  });
});

describe("LOCK — the scoping still catches a real leak (the canary)", () => {
  // ⚠ WITHOUT THIS, THE FIX IS INDISTINGUISHABLE FROM DELETING THE GUARD. Narrowing what is scanned
  // is exactly how a backstop gets quietly disabled, so the narrowing has to prove it still bites.

  it("a track key IN PROSE still fails — the founder's own distinction", () => {
    // "A key inside prose fails; a key as a lookup stays legal." Same string, opposite verdicts,
    // decided only by WHERE it sits.
    const leaky = clientReadableSurface({
      caseNumber: "c", vendor: "v", brands: [], brandsSubmitted: [], clientName: "n",
      deliveredAt: "d",
      report: { summary: "Our brand_risk_assessment found nothing." },
      findings: [{ compiled_findings_json: null, questions_to_ask: null }],
    });
    const hits = findInternalTokens(leaky);
    expect(hits.length, "a track key in client prose must still refuse the publish").toBeGreaterThan(0);
    expect(hits[0].token).toBe("track-key");
  });

  it("the same key as a lookup passes", () => {
    const clean = clientReadableSurface({
      caseNumber: "c", vendor: "v", brands: [], brandsSubmitted: [], clientName: "n",
      deliveredAt: "d", report: { summary: "Everything we could check holds up." },
      findings: [{ compiled_findings_json: { summary: "Registered and trading." }, questions_to_ask: ["Ask for the invoice."] }],
    });
    expect(findInternalTokens(clean)).toEqual([]);
  });

  it("a src_N marker in the findings prose still fails", () => {
    const leaky = clientReadableSurface({
      caseNumber: "c", vendor: "v", brands: [], brandsSubmitted: [], clientName: "n",
      deliveredAt: "d", report: null,
      findings: [{ compiled_findings_json: { summary: "Confirmed by the registry (src_4)." }, questions_to_ask: null }],
    });
    expect(findInternalTokens(leaky).map((h) => h.token)).toContain("src_N");
  });

  it("a leak in the QUESTIONS still fails — the field most easily forgotten", () => {
    const leaky = clientReadableSurface({
      caseNumber: "c", vendor: "v", brands: [], brandsSubmitted: [], clientName: "n",
      deliveredAt: "d", report: null,
      findings: [{ compiled_findings_json: null, questions_to_ask: ["Ask about the sourcing_logic gap."] }],
    });
    expect(findInternalTokens(leaky).length).toBeGreaterThan(0);
  });
});

describe("LOCK — the guard itself was not touched", () => {
  it("the checkpoint gained no grammar-awareness", () => {
    // Its own law: "PRESENCE-based and MAY NEVER BE WIDENED INTO A SHAPE MATCHER." The fix had to
    // be the projection. This asserts the guard still asks only "is the token there".
    const guard = strip(read("lib/portal/clientTokenCheckpoint.ts"));
    expect(guard, "the track-key pattern must still be asserted").toBeTruthy();
    for (const softener of ["track_key", "isLookup", "structural", "skipField", "allowKey"]) {
      expect(
        guard.includes(softener),
        `the checkpoint mentions "${softener}" — it has been taught about fields, which is the ` +
          `merge its own header forbids. Scope belongs in the projection, not here.`,
      ).toBe(false);
    }
  });

  it("the PDF render calls the scoped surface, not the raw payload", () => {
    const src = strip(read("lib/pdf/renderReportPdf.ts"));
    expect(src).toMatch(/assertNoInternalTokens\(\s*clientReadableSurface\(content\)/);
  });
});
