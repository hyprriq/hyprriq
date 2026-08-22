import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

// ── RETIRED-PRICING LOCK (founder-ruled 2026-07-23, Stripe-verified the same sitting).
// The locked model: one-time $99 · $149 — monthly $279 · $499 — top-ups +3/$99 · +6/$179.
// RETIRED FOREVER from live client copy: $79 · $129 · $239 · $197 · $249.
// Scope is LIVE CLIENT SURFACES ONLY — lib/content, marketing/portal components and routes.
// Historical migrations and docs/ are EXEMPT BY DESIGN: they are the paper trail (the correction
// discipline), and this lock must never create pressure to rewrite history. ──

const ROOT = join(__dirname, "..", "..");
const SCANNED_DIRS = [
  "lib/content", "components/marketing", "components/portal",
  "app/(marketing)", "app/(portal)",
];
// (?!\.\d) — sharpened 2026-08-22: the lock hunts retired PRICE figures, and \b alone also
// matched refund ARITHMETIC that shares digits (the founder-locked Refund §2 worked example
// "$239.94" tripped on the substring "$239"). A dollar amount continuing into cents is not a
// price tag; a bare "$239" still fails exactly as before. Faithful to the ruling's intent.
const RETIRED = /\$(?:79|129|239|197|249)\b(?!\.\d)/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p);
    if (!/\.(ts|tsx)$/.test(name) || /\.test\./.test(name)) return [];
    return [p];
  });
}

describe("retired pricing figures never appear in live client copy", () => {
  it("no $79 / $129 / $239 / $197 / $249 in content, marketing, or portal surfaces", () => {
    const offenders: string[] = [];
    for (const dir of SCANNED_DIRS) {
      let files: string[] = [];
      try { files = walk(join(ROOT, dir)); } catch { continue; } // a scanned dir may not exist yet
      for (const f of files) {
        const src = readFileSync(f, "utf8");
        const m = RETIRED.exec(src);
        if (m) offenders.push(`${f.slice(ROOT.length + 1)} → "${m[0]}"`);
      }
    }
    expect(offenders, `retired price figures in live client copy (ruled 2026-07-23):\n${offenders.join("\n")}`).toEqual([]);
  });
});
