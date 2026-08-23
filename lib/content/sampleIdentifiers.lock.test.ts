import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SAMPLE_CASE_IDS, SAMPLE_VENDOR, LIVE_CASE_ID_RE } from "./sampleIdentifiers";

// ── LOCK (founder-locked 2026-08-22, item 4b/4c): no PRESENTATION surface may show a case id in
// the live AWI-YYMM-NNN shape. The homepage hero shipped AWI-2606-014 and the design reference
// shipped "AWI-2607-022 · TD SYNNEX" — a real delivered case beside a real distributor's name.
// Filesystem-walked so the NEXT mock cannot reintroduce it.
//
// Code COMMENTS citing a real case as provenance ("the AWI-2607-022 leak") are EXEMPT BY DESIGN:
// they are the correction paper trail, the same exemption the retired-pricing lock grants. This
// lock reads rendered content, not history — so it strips comments before testing.

const repo = path.resolve(__dirname, "../..");
const SURFACES = ["components/marketing", "components/portal", "app/(marketing)", "lib/content"];

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    if (fs.statSync(p).isDirectory()) return walk(p);
    if (!/\.(ts|tsx)$/.test(n) || /\.test\./.test(n)) return [];
    return [path.relative(repo, p).split(path.sep).join("/")];
  });
}

const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ").replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, " ");

describe("LOCK — sample identifiers cannot collide with a real case", () => {
  it("the reserved series is non-numeric in the segment the generator fills with digits", () => {
    for (const id of SAMPLE_CASE_IDS) {
      expect(LIVE_CASE_ID_RE.test(id), `${id} matches the live generator shape`).toBe(false);
      expect(id.startsWith("AWI-SAMPLE-")).toBe(true);
    }
    expect(new Set(SAMPLE_CASE_IDS).size).toBe(SAMPLE_CASE_IDS.length);
  });

  it("no presentation surface renders a live-shaped case id", () => {
    const offenders: string[] = [];
    for (const scope of SURFACES) {
      for (const f of walk(path.join(repo, scope))) {
        const body = stripComments(fs.readFileSync(path.join(repo, f), "utf8"));
        const m = body.match(LIVE_CASE_ID_RE);
        if (m) offenders.push(`${f} → ${m[0]}`);
      }
    }
    expect(offenders, `presentation surfaces must use SAMPLE_CASE_IDS:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("the sample vendor is fictional — a real distributor beside a mock verdict is a claim about a real business", () => {
    expect(SAMPLE_VENDOR).toBe("Northgate Wholesale Co.");
    for (const real of ["TD SYNNEX", "TD Synnex", "Bulk Buy America", "NVE Pharmaceuticals"]) {
      for (const scope of SURFACES) {
        for (const f of walk(path.join(repo, scope))) {
          const body = stripComments(fs.readFileSync(path.join(repo, f), "utf8"));
          expect(body.includes(real), `${f} names a real corpus vendor on a presentation surface`).toBe(false);
        }
      }
    }
  });
});
