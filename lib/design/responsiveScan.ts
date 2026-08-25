import fs from "node:fs";
import path from "node:path";

/**
 * THE RESPONSIVE SCANNER — one implementation, used by the lock AND by scripts/responsive-audit.ts.
 *
 * ⚠ THIS FILE EXISTS BECAUSE THE FIRST VERSION OF IT LIED THREE TIMES. Each blind spot below is one
 * a rewrite would reintroduce, so each is named with the case that caught it. A layout scanner that
 * reads class strings naively does not fail loudly — it reports a clean sheet, which is the most
 * expensive kind of wrong.
 *
 *   1. IT READ THE GRID'S OWN CLASS STRING AND MISSED WRAPPER GATES.
 *      `components/portal/case-table.tsx` carries `grid-cols-[110px_…]` with no breakpoint prefix,
 *      but its wrapper is `hidden … md:block` and a `md:hidden` card list renders below that. The
 *      component is CORRECT. The scanner called it a defect. → `wrapperGate()`.
 *
 *   2. ITS UPWARD SCAN STOPPED AT THE `return (` OF AN INNER `.map` CALLBACK.
 *      A row rendered inside `cases.map(c => { … return ( … ) })` sits below its own wrapper, so a
 *      scan that halts at the first `return (` never reaches the wrapper. → the walk below only
 *      stops at a TOP-LEVEL function declaration.
 *
 *   3. IT REQUIRED THE WORD `grid` IN THE className AND MISSED CONSTANTS.
 *      `app/(admin)/admin/support/page.tsx` holds `const COLS = "grid grid-cols-[…] gap-3"` and
 *      renders `className={`${COLS} …`}`. The className string never contains "grid". THE WIDEST
 *      GRID IN THE CODEBASE WAS INVISIBLE TO THREE PASSES OF ITS OWN DETECTOR. → `collectConsts()`,
 *      which also merges the constant's gap/padding into the render site.
 *
 * The lock asserts this scanner FINDS THE KNOWN OFFENDERS. That assertion is not decoration: a
 * scanner that silently matches nothing is the failure this project has now hit three times, and it
 * is the same shape as standing rule 11 (the backspace regexes).
 */

export const BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280, "2xl": 1536 } as const;

/** The four ruled test widths. */
export const TEST_WIDTHS = [360, 390, 768, 1024] as const;

/**
 * The content box a row actually gets, MEASURED from the shells (components/app/shell-chrome.tsx).
 *
 * ⚠ 1024px IS THE TIGHTEST WIDTH IN THE SYSTEM, NOT THE ROOMIEST. The sidebar is an off-canvas
 * drawer below `lg` and becomes a STATIC 248px column at `lg` and above — so admin content gets
 * 728px at 1024 but 720px at 768, while a 1280px window gives it 1265px. Anyone who checks "does
 * this work on a laptop" at 1280 is checking at nearly double what a 1024px laptop hands over.
 */
export function contentBox(viewport: number, surface: "admin" | "portal"): number {
  const sidebar = viewport >= BREAKPOINTS.lg ? 248 : 0;
  // admin:  w-full px-4 sm:px-6      portal: mx-auto max-w-[1200px] px-4 sm:px-7
  const pad = surface === "admin"
    ? (viewport >= BREAKPOINTS.sm ? 24 : 16)
    : (viewport >= BREAKPOINTS.sm ? 28 : 16);
  return Math.min(viewport, surface === "portal" ? 1200 + pad * 2 : Infinity) - sidebar - pad * 2;
}

const GAP: Record<string, number> = {
  "gap-0": 0, "gap-1": 4, "gap-1.5": 6, "gap-2": 8, "gap-2.5": 10, "gap-3": 12,
  "gap-3.5": 14, "gap-4": 16, "gap-5": 20, "gap-6": 24, "gap-7": 28, "gap-8": 32,
};
const PADX: Record<string, number> = {
  "px-0": 0, "px-1": 4, "px-2": 8, "px-2.5": 10, "px-3": 12, "px-3.5": 14,
  "px-4": 16, "px-5": 20, "px-6": 24, "px-7": 28, "px-8": 32,
};

/** A single grid track's MINIMUM contribution. `1fr`/`auto` collapse to 0; `minmax(a,b)` floors at a. */
export function trackMin(track: string): number {
  const t = track.trim();
  const mm = t.match(/^minmax\(\s*([^,]+)\s*,/);
  if (mm) return trackMin(mm[1]);
  const px = t.match(/^(\d+(?:\.\d+)?)px$/);
  if (px) return parseFloat(px[1]);
  const ch = t.match(/^(\d+(?:\.\d+)?)ch$/);
  if (ch) return parseFloat(ch[1]) * 8; // ~8px/ch at 16px Inter — conservative
  return 0;
}

/** Split a `grid-cols-[…]` track list on top-level underscores, respecting minmax() parentheses. */
export function splitTracks(spec: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of spec) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "_" && depth === 0) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

export type GridSite = {
  file: string;
  line: number;
  surface: "admin" | "portal";
  /** Track list as written. */
  spec: string;
  /** Width below which this grid does NOT render, or null if it renders at every width. */
  gate: number | null;
  /** fixed tracks + minmax floors + gaps + row padding */
  minWidth: number;
  /** What the nearest enclosing wrapper does with the excess. */
  overflow: "clipped" | "scrolls" | "none";
  /** Does the file ship an alternative form for the widths the grid does not cover? */
  hasAlternative: boolean;
};

/** BLIND SPOT 3 — constants. Collects EVERY spec in the initializer, since a ternary holds two. */
function collectConsts(src: string): Map<string, { specs: string[]; full: string }> {
  const out = new Map<string, { specs: string[]; full: string }>();
  const re = /(?:const|let)\s+(\w+)(?:\s*:\s*[^=]+)?\s*=\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const specs = [...m[2].matchAll(/grid-cols-\[([^\]]*)\]/g)].map((g) => g[1]);
    if (specs.length) out.set(m[1], { specs, full: m[2] });
  }
  return out;
}

/**
 * BLIND SPOTS 1 AND 2 — walk upward for the enclosing wrapper's responsive gate and overflow.
 * Stops only at a TOP-LEVEL function declaration, never at an inner `return (`.
 * The 60-line window is a heuristic; the lock's self-test is what proves it reaches the real ones.
 */
function wrapperGate(lines: string[], line: number): { gate: number | null; overflow: GridSite["overflow"] } {
  let gate: number | null = null;
  let overflow: GridSite["overflow"] = "none";
  for (let k = line - 1; k >= Math.max(0, line - 61); k--) {
    const t = lines[k] ?? "";
    if (/^(export\s+)?(async\s+)?function\s+\w/.test(t)) break;
    const g = t.match(/hidden[^"'`]*?\b(sm|md|lg|xl|2xl):block/);
    if (g && gate === null) gate = BREAKPOINTS[g[1] as keyof typeof BREAKPOINTS];
    if (overflow === "none") {
      if (/overflow-x-auto|overflow-auto|overflow-x-scroll/.test(t)) overflow = "scrolls";
      else if (/overflow-hidden/.test(t)) overflow = "clipped";
    }
  }
  return { gate, overflow };
}

export function scanFile(repo: string, file: string): GridSite[] {
  const abs = path.join(repo, file);
  const src = fs.readFileSync(abs, "utf8");
  const lines = src.split("\n");
  const surface: "admin" | "portal" = /\(admin\)|components[\\/]admin/.test(file) ? "admin" : "portal";
  const consts = collectConsts(src);
  const hasAlternative = /\b(sm|md|lg|xl):hidden\b/.test(src);
  const out: GridSite[] = [];

  for (const m of src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{(\w+)\})/g)) {
    const literal = m[1] ?? m[2] ?? "";
    const bare = m[3];
    const line = src.slice(0, m.index).split("\n").length;

    // Every spec this className can resolve to, plus the text to read gap/padding from.
    const found: { spec: string; text: string; prefix: string | null }[] = [];
    for (const d of literal.matchAll(/(?:^|\s)((?:sm|md|lg|xl|2xl):)?grid-cols-\[([^\]]*)\]/g)) {
      found.push({ spec: d[2], text: literal, prefix: d[1]?.replace(":", "") ?? null });
    }
    const refs = [...(bare ? [bare] : []), ...[...literal.matchAll(/\$\{(\w+)\}/g)].map((r) => r[1])];
    for (const name of refs) {
      const c = consts.get(name);
      if (!c) continue;
      for (const spec of c.specs) {
        // gap/padding may live in the constant, the className, or be split across both.
        found.push({ spec, text: `${literal} ${c.full}`, prefix: null });
      }
    }
    if (!found.length) continue;

    for (const f of found) {
      const tracks = splitTracks(f.spec);
      const min = tracks.reduce((a, t) => a + trackMin(t), 0);
      if (min === 0) continue; // all-fr grids cannot overflow on track width alone
      const gap = GAP[(f.text.match(/(?:^|\s|")(gap-[\d.]+)/) ?? [])[1] ?? ""] ?? 0;
      const pad = PADX[(f.text.match(/(?:^|\s|")(px-[\d.]+)/) ?? [])[1] ?? ""] ?? 0;
      const w = wrapperGate(lines, line);
      out.push({
        file, line, surface, spec: f.spec,
        gate: f.prefix ? BREAKPOINTS[f.prefix as keyof typeof BREAKPOINTS] : w.gate,
        minWidth: min + gap * Math.max(0, tracks.length - 1) + pad * 2,
        overflow: w.overflow,
        hasAlternative,
      });
    }
  }
  return out;
}

/** Every .tsx under app/ and components/, excluding marketing (a separate, already-audited surface). */
export function appFiles(repo: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    const abs = path.join(repo, dir);
    if (!fs.existsSync(abs)) return;
    for (const name of fs.readdirSync(abs)) {
      const rel = `${dir}/${name}`;
      if (fs.statSync(path.join(repo, rel)).isDirectory()) walk(rel);
      else if (/\.tsx$/.test(name) && !/\.test\./.test(name)) out.push(rel);
    }
  };
  walk("app");
  walk("components");
  return out.filter((f) => !/\(marketing\)|components\/marketing/.test(f));
}

/** A grid is an OFFENDER when it renders at 360px and cannot fit the content box there. */
export function isOffender(site: GridSite): boolean {
  const narrowest = TEST_WIDTHS[0];
  if (site.gate !== null && site.gate > narrowest) return false;
  return site.minWidth > contentBox(narrowest, site.surface);
}

export function scanAll(repo: string): GridSite[] {
  return appFiles(repo).flatMap((f) => scanFile(repo, f));
}

// ── TAP TARGETS ───────────────────────────────────────────────────────────────────────────────
// WCAG 2.5.8 (AA) — 24px minimum; 2.5.5 (AAA) and every platform guideline say 44px. This project
// holds client surfaces to 44px, the same scope discipline as the 16px form floor in
// mobile.lock.test.ts: admin is an operator console at a desk (founder ruling 5d, narrowed
// 2026-08-25 to exclude the cases list and case detail).
//
// INLINE LINKS ARE EXEMPT and fall out naturally: only an element carrying an EXPLICIT size class is
// measured. A link inside a paragraph has none, so it is never flagged.

export type TapTarget = { file: string; line: number; element: string; height: number; from: string };

export function scanTapTargets(repo: string, file: string): TapTarget[] {
  const src = fs.readFileSync(path.join(repo, file), "utf8");
  const out: TapTarget[] = [];
  for (const m of src.matchAll(/<(button|Link|a)\b/g)) {
    // Read to the end of the opening tag, tolerating nested braces in JSX expressions.
    let depth = 0;
    let i = m.index!;
    for (; i < src.length; i++) {
      const c = src[i];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) break;
    }
    const tag = src.slice(m.index!, i + 1);
    if (/\bmin-h-11\b|\bmin-h-\[(?:4[4-9]|[5-9]\d)px\]|\bh-(?:1[1-9]|[2-9]\d)\b/.test(tag)) continue;
    let height: number | null = null;
    let from = "";
    const h = tag.match(/(?:^|\s)h-(\d+(?:\.\d+)?)(?:\s|"|`)/);
    if (h) { height = parseFloat(h[1]) * 4; from = `h-${h[1]}`; }
    else {
      const py = tag.match(/(?:^|\s)py-(\d+(?:\.\d+)?)(?:\s|"|`)/);
      // py-N top and bottom, plus a ~20px line box for the 13–15px text these controls carry.
      if (py) { height = parseFloat(py[1]) * 8 + 20; from = `py-${py[1]} + line box`; }
    }
    if (height !== null && height < 44) {
      out.push({ file, line: src.slice(0, m.index).split("\n").length, element: m[1], height, from });
    }
  }
  return out;
}

// ── TABLES ────────────────────────────────────────────────────────────────────────────────────
export type TableSite = { file: string; line: number; overflow: GridSite["overflow"] };

export function scanTables(repo: string, file: string): TableSite[] {
  const src = fs.readFileSync(path.join(repo, file), "utf8");
  const lines = src.split("\n");
  const out: TableSite[] = [];
  let i = -1;
  while ((i = src.indexOf("<table", i + 1)) !== -1) {
    const line = src.slice(0, i).split("\n").length;
    out.push({ file, line, overflow: wrapperGate(lines, line).overflow });
  }
  return out;
}
