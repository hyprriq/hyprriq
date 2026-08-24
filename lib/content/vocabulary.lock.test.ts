import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ASSESSMENT_AREA_KEYS } from "@/lib/constants/tracks";
import { AREA_NAMES } from "@/lib/content/reportCopy";
import { AREAS } from "@/lib/content/whatWeCheck";

// ── LOCK — CLIENT-FACING VOCABULARY (founder ruling, 2026-08-24) ──────────────────────────────
//
// THE RULING: client-facing surfaces only ever say "assessment areas". Never "tracks", never a
// track number, never any internal name. The count is FIVE client-facing areas.
//
// This is the same class as the internal-marker leak that reached three delivered reports: the
// engine's own vocabulary is right there in the variable names, and it takes one tired sentence to
// carry it onto a page a client reads. The banned-language gate does not cover it, because none of
// these words are banned language — they are simply ours, not theirs.
//
// Scans STRING LITERALS on presentation surfaces only. Code identifiers (TrackKey, TRACK_CONFIG,
// track_key) are untouched and must stay: they are the canonical reference the ruling protects.
// Comments are stripped — they explain the boundary and necessarily name both sides of it.

const repo = path.resolve(__dirname, "../..");
const SURFACES = [
  "app/(marketing)", "app/(portal)", "components/marketing", "components/portal", "lib/content",
];

function walk(dir: string): string[] {
  const abs = path.join(repo, dir);
  if (!fs.existsSync(abs)) return [];
  const out: string[] = [];
  const rec = (d: string) => {
    for (const n of fs.readdirSync(d)) {
      const p = path.join(d, n);
      if (fs.statSync(p).isDirectory()) rec(p);
      else if (/\.(ts|tsx)$/.test(n) && !/\.test\./.test(n)) out.push(p);
    }
  };
  rec(abs);
  return out;
}

const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

/** Shipped string literals only — the words a client can actually read. */
function literals(src: string): string[] {
  // Module specifiers are string literals too, and "@/lib/constants/tracks" is a PATH, not prose.
  // Strip imports before scanning or the lock flags the very registry it exists to protect.
  const code = stripComments(src)
    .replace(/^\s*import[\s\S]*?from\s*["'][^"']+["'];?$/gm, " ")
    .replace(/^\s*import\s+["'][^"']+["'];?$/gm, " ")
    .replace(/\bfrom\s*["'][^"']+["']/g, " ")
    .replace(/\bimport\(["'][^"']+["']\)/g, " ");
  const out: string[] = [];
  const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    const s = m[1] ?? m[2] ?? m[3] ?? "";
    if (s.length >= 6) out.push(s);
  }
  return out;
}

const files = SURFACES.flatMap(walk);
const rel = (p: string) => path.relative(repo, p).split(path.sep).join("/");

describe("LOCK — client-facing vocabulary is 'assessment areas', never ours", () => {
  it("no client-facing string says 'track' or names a track number", () => {
    // Word-boundary "track"/"tracks" as a NOUN for an assessment area, and "Track 3"/"track_3"
    // shapes. "track record" and "tracking" are ordinary English and stay legal.
    const re = /\btracks?\b(?!\s+record)|\btrack[\s_-]?\d\b/i;
    const bad: string[] = [];
    for (const f of files) {
      for (const lit of literals(fs.readFileSync(f, "utf8"))) {
        if (re.test(lit)) bad.push(`${rel(f)} → "${lit.slice(0, 70)}"`);
      }
    }
    expect(bad, `say "assessment area" instead:\n${bad.join("\n")}`).toEqual([]);
  });

  it("no client-facing string exposes an internal area key", () => {
    // snake_case keys are the engine's reference, not a client's word. This is the same failure the
    // marker census found reaching delivered reports — one alias short of being caught.
    const bad: string[] = [];
    for (const f of files) {
      const src = fs.readFileSync(f, "utf8");
      // The registries themselves DECLARE these keys — that is their job.
      if (/lib\/content\/(whatWeCheck|reportCopy|sampleReport)\.ts$/.test(rel(f))) continue;
      for (const lit of literals(src)) {
        for (const key of ASSESSMENT_AREA_KEYS) {
          // A literal that IS the key is a LOOKUP — AREA_NAMES["supplier_identity"] — and is how
          // every surface is supposed to reach the client-facing name. A literal that CONTAINS the
          // key among other words is PROSE carrying the engine's vocabulary onto a client's screen,
          // which is precisely the leak the marker census found in three delivered reports.
          if (lit !== key && lit.includes(key)) {
            bad.push(`${rel(f)} → "${lit.slice(0, 60)}" contains ${key}`);
          }
        }
      }
    }
    expect(bad, `render AREA_NAMES, never the key:\n${bad.join("\n")}`).toEqual([]);
  });

  it("the client-facing count is five, and the names agree across every registry", () => {
    // The three places a client meets an area name — the report registry, the marketing module and
    // the canonical track list — must name the same five things. A sixth appearing in one of them
    // is how "we sell five areas" quietly becomes a different claim on a different page.
    expect(AREAS.length).toBe(5);
    expect(ASSESSMENT_AREA_KEYS.length).toBe(5);
    expect(AREAS.map((a) => a.key)).toEqual([...ASSESSMENT_AREA_KEYS]);
    for (const a of AREAS) expect(a.name).toBe(AREA_NAMES[a.key]);
  });

  it("category compliance is never sold as a sixth assessment area", () => {
    // It is ADVISORY and deliberately absent from the canonical registry. It also runs only on
    // single_149 and scale_499 (lib/research/categoryStep.ts) — BOTH currently off sale — so no
    // purchasable plan includes it today. Naming it as an area a buyer gets would be a product
    // claim the ladder does not support.
    expect(ASSESSMENT_AREA_KEYS).not.toContain("category_compliance");
    expect(AREAS.map((a) => a.key)).not.toContain("category_compliance");
  });
});
