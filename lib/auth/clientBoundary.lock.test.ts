/**
 * CLIENT-BOUNDARY LOCK (2026-07-30) — the /admin/users regression guard.
 *
 * The shipped bug: users-manager.tsx ("use client") imported the CAPABILITIES value from
 * lib/auth/permissions.ts, which imports lib/supabase/admin.ts, which constructs the
 * service-role client at module scope. In the browser bundle SUPABASE_SERVICE_ROLE_KEY is
 * stripped to undefined, so createClient threw at module evaluation before React mounted —
 * a full-page crash that tsc/eslint/the suite all missed (types erase, the server pass has env).
 *
 * The lock: statically walk the VALUE-import graph from every "use client" module and fail
 * if it reaches a server-only module — lib/supabase/admin.ts by name, plus any module that
 * declares `import "server-only"`. Type-only imports are erased by the compiler and are
 * therefore not edges. The failure message prints the exact import chain.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "components", "lib"];

// Server-only by name, regardless of annotations — the module this lock exists to protect.
const HARDCODED_POISON = ["lib/supabase/admin.ts"];

function walk(dir: string, out: string[]): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

const files = SCAN_DIRS.flatMap((d) => (existsSync(join(ROOT, d)) ? walk(join(ROOT, d), []) : []));
const sources = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));

// A clause is type-only when the compiler erases the whole statement (no runtime edge).
function isTypeOnlyClause(clause: string): boolean {
  const c = clause.trim();
  if (/^type[\s{]/.test(c)) return true;
  const braces = c.match(/^\{([\s\S]*)\}$/);
  if (braces) {
    const names = braces[1].split(",").map((s) => s.trim()).filter(Boolean);
    return names.length > 0 && names.every((n) => n.startsWith("type "));
  }
  return false;
}

function importEdges(file: string): string[] {
  const src = sources.get(file) ?? "";
  const specs: string[] = [];
  // `import defaultOrClause from "spec"` / `export ... from "spec"` — clause never contains quotes or `;`.
  for (const m of src.matchAll(/(?:import|export)\s+([^;'"]+?)\s+from\s*["']([^"']+)["']/g)) {
    if (!isTypeOnlyClause(m[1])) specs.push(m[2]);
  }
  // Side-effect imports: `import "spec"`.
  for (const m of src.matchAll(/import\s*["']([^"']+)["']/g)) specs.push(m[1]);
  const out: string[] = [];
  for (const spec of specs) {
    let base: string | null = null;
    if (spec.startsWith("@/")) base = join(ROOT, spec.slice(2));
    else if (spec.startsWith(".")) base = resolve(dirname(file), spec);
    if (!base) continue; // external package — not part of the repo graph
    for (const cand of [base, base + ".ts", base + ".tsx", join(base, "index.ts"), join(base, "index.tsx")]) {
      if (existsSync(cand) && statSync(cand).isFile()) { out.push(cand); break; }
    }
  }
  return out;
}

const rel = (p: string) => relative(ROOT, p).replace(/\\/g, "/");

const clientEntries = files.filter((f) =>
  /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*["']use client["']/.test(sources.get(f) ?? ""),
);

const poison = new Set(
  files
    .filter((f) => /import\s*["']server-only["']/.test(sources.get(f) ?? ""))
    .map(rel)
    .concat(HARDCODED_POISON),
);

describe("client-boundary lock — no 'use client' graph may reach a server-only module", () => {
  it("finds client entries and the poison module (the lock is not scanning air)", () => {
    expect(clientEntries.length).toBeGreaterThan(0);
    expect(existsSync(join(ROOT, HARDCODED_POISON[0]))).toBe(true);
  });

  it("no client module's value-import graph reaches a server-only module", () => {
    const violations: string[] = [];
    for (const entry of clientEntries) {
      // BFS with parent links so the failure names the exact chain.
      const parent = new Map<string, string | null>([[entry, null]]);
      const queue = [entry];
      while (queue.length > 0) {
        const cur = queue.shift() as string;
        if (poison.has(rel(cur))) {
          const chain: string[] = [];
          for (let p: string | null = cur; p; p = parent.get(p) ?? null) chain.unshift(rel(p));
          violations.push(chain.join(" -> "));
          break;
        }
        for (const next of importEdges(cur)) {
          if (!parent.has(next)) { parent.set(next, cur); queue.push(next); }
        }
      }
    }
    expect(violations, `server-only module reachable from a "use client" bundle:\n${violations.join("\n")}`).toEqual([]);
  });

  it('lib/supabase/admin.ts declares import "server-only" (build-time poison stays in place)', () => {
    const src = readFileSync(join(ROOT, "lib/supabase/admin.ts"), "utf8");
    expect(src).toMatch(/import\s*["']server-only["']/);
  });
});
