import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { scanHard } from "./banned-language";

// ── BL FIX GATE — BL6 (founder-ruled): STATIC source locks for UI copy + error messages (the
// retiredPricing.lock pattern — the strings are static, so commit-time locks beat runtime
// scanning). Scope law: banned terms appear NOWHERE — reports (delivery gate), emails (notify
// gate), UI copy + error messages (THESE locks), prompts (accepted as instructions-of-the-ban).
// The scan runs over extracted STRING LITERALS only — code/comments may legitimately name the
// banned vocabulary (this file does). Docs and migrations stay exempt: the paper trail. ──

const ROOT = join(__dirname, "..", "..");
const UI_DIRS = ["lib/content", "components/marketing", "components/portal", "app/(marketing)", "app/(portal)"];
const API_DIR = "app/api";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p);
    if (!/\.(ts|tsx)$/.test(name) || /\.test\./.test(name)) return [];
    return [p];
  });
}

// Extract string literals ('…', "…", and template-literal static parts). JSX text is covered by
// the literal-heavy content modules; component prose rides literals in this codebase.
function stringLiterals(src: string): string[] {
  // Comments are stripped FIRST — code may legitimately quote banned vocabulary when explaining
  // a ban (this gate's own annotations do). Only shipped literals are scanned.
  const noComments = src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ").replace(/([;,{})\]]\s*)\/\/[^\n]*$/gm, "$1");
  const out: string[] = [];
  const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(noComments)) !== null) {
    const s = m[1] ?? m[2] ?? m[3] ?? "";
    if (s.length >= 8) out.push(s.replace(/\$\{[^}]*\}/g, " ")); // template holes become spaces
  }
  return out;
}

function offendersIn(dirs: string[], filter?: (src: string, lit: string) => boolean): string[] {
  const offenders: string[] = [];
  for (const dir of dirs) {
    let files: string[] = [];
    try { files = walk(join(ROOT, dir)); } catch { continue; }
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      for (const lit of stringLiterals(src)) {
        if (filter && !filter(src, lit)) continue;
        const hits = scanHard(lit);
        if (hits.length > 0) offenders.push(`${f.slice(ROOT.length + 1)} → "${lit.slice(0, 80)}" [${hits.join(",")}]`);
      }
    }
  }
  return offenders;
}

describe("BL6 — static surface locks (UI copy + error messages)", () => {
  it("UI COPY: no HARD-banned language in any client-surface string literal", () => {
    const offenders = offendersIn(UI_DIRS);
    expect(offenders, `banned language in live UI copy:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("ERROR MESSAGES: no HARD-banned language in route message/error string literals (research-query literals are inputs, not client output — out of scope)", () => {
    const offenders: string[] = [];
    let files: string[] = [];
    try { files = walk(join(ROOT, API_DIR)); } catch { /* absent */ }
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      const re = /(?:message|error)\s*:\s*(?:'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        const lit = (m[1] ?? m[2] ?? m[3] ?? "").replace(/\$\{[^}]*\}/g, " ");
        const hits = scanHard(lit);
        if (hits.length > 0) offenders.push(`${f.slice(ROOT.length + 1)} → "${lit.slice(0, 80)}" [${hits.join(",")}]`);
      }
    }
    expect(offenders, `banned language in error/message strings:\n${offenders.join("\n")}`).toEqual([]);
  });
});
