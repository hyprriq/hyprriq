// CORRECTED GRID AUDIT — wrapper-aware.
// The first pass reported components/portal/case-table.tsx as always-on. It is not: the gate is on
// the WRAPPER (`hidden ... md:block`), and a `md:hidden` card list renders instead below that. A
// scanner that only reads the grid's own class string cannot see that, and reported a
// correctly-built component as broken. Fixed here — and the same check now also finds which of the
// remaining grids have NO alternative form at all, which is the actual defect.
import fs from "node:fs";
import path from "node:path";
const repo = process.argv[2] ?? ".";
const WIDTHS = [360, 390, 768, 1024];
const contentBox = (vw, s) => vw - (vw >= 1024 ? 248 : 0) - (s === "admin" ? (vw >= 640 ? 24 : 16) : (vw >= 640 ? 28 : 16)) * 2;
function trackMin(t) {
  t = t.trim();
  let m = t.match(/^minmax\(\s*([^,]+)\s*,/); if (m) return trackMin(m[1]);
  m = t.match(/^(\d+(?:\.\d+)?)px$/); if (m) return parseFloat(m[1]);
  m = t.match(/^(\d+(?:\.\d+)?)ch$/); if (m) return parseFloat(m[1]) * 8;
  return 0;
}
function splitTracks(spec) {
  const out = []; let d = 0, cur = "";
  for (const ch of spec) { if (ch === "(") d++; else if (ch === ")") d--; if (ch === "_" && d === 0) { out.push(cur); cur = ""; continue; } cur += ch; }
  if (cur) out.push(cur); return out;
}
const GAP = {"gap-1":4,"gap-1.5":6,"gap-2":8,"gap-2.5":10,"gap-3":12,"gap-3.5":14,"gap-4":16,"gap-5":20,"gap-6":24};
const PADX = {"px-2":8,"px-2.5":10,"px-3":12,"px-3.5":14,"px-4":16,"px-5":20,"px-6":24,"px-7":28};
function walk(d, out = []) {
  if (!fs.existsSync(d)) return out;
  for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) walk(p, out); else if (/\.tsx$/.test(n) && !/\.test\./.test(n)) out.push(p); }
  return out;
}
const files = [...walk(path.join(repo,"app")), ...walk(path.join(repo,"components"))].filter((f) => !/\(marketing\)|components[\\/]marketing/.test(f));
const rel = (f) => path.relative(repo, f).split(path.sep).join("/");
const BP = { sm: 640, md: 768, lg: 1024, xl: 1280 };

const rows = [];
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  const lines = src.split("\n");
  const surface = /\(admin\)|components\/admin/.test(rel(f)) ? "admin" : "portal";
  // Resolve `const X = "grid-cols-[...]"` indirection, then find every RENDER SITE.
  const consts = new Map();
  for (const cm of src.matchAll(/const\s+(\w+)\s*=[^;]*?grid-cols-\[([^\]]*)\]/g)) consts.set(cm[1], cm[2]);
  const sites = [];
  for (const m of src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
    const cls = m[1] ?? m[2] ?? "";
    if (!/\bgrid\b/.test(cls)) continue;
    let prefix = null, spec = null;
    const direct = cls.match(/(?:^|\s)((?:sm|md|lg|xl):)?grid-cols-\[([^\]]*)\]/);
    if (direct) { prefix = direct[1]?.replace(":", "") ?? null; spec = direct[2]; }
    else {
      const ref = cls.match(/\$\{(\w+)\}/);
      if (ref && consts.has(ref[1])) spec = consts.get(ref[1]);
    }
    if (!spec) continue;
    sites.push({ line: src.slice(0, m.index).split("\n").length, prefix, spec, cls });
  }
  for (const s of sites) {
    const tracks = splitTracks(s.spec);
    const min = tracks.reduce((a, t) => a + trackMin(t), 0);
    if (min === 0) continue;
    const gap = GAP[(s.cls.match(/(?:^|\s)(gap-[\d.]+)/) ?? [])[1]] ?? 0;
    const pad = PADX[(s.cls.match(/(?:^|\s)(px-[\d.]+)/) ?? [])[1]] ?? 0;
    const total = min + gap * (tracks.length - 1) + pad * 2;

    // WRAPPER SCAN — up to 30 lines above, find (a) a responsive gate and (b) overflow behaviour.
    let gate = s.prefix ? BP[s.prefix] : null;
    let wrap = "none";
    for (let k = s.line - 1; k >= Math.max(0, s.line - 41); k--) {
      const t = lines[k] ?? "";
      const g = t.match(/hidden[^"'`]*?\b(sm|md|lg|xl):block/);
      if (g && gate === null) gate = BP[g[1]];
      if (wrap === "none") {
        if (/overflow-x-auto|overflow-auto|overflow-x-scroll/.test(t)) wrap = "SCROLLS";
        else if (/overflow-hidden/.test(t)) wrap = "CLIPPED";
      }
      if (/^(export )?function \w/.test(t)) break;
    }
    // is there an alternative form for the widths the grid does not cover?
    const alt = /md:hidden|sm:hidden|lg:hidden/.test(src);
    rows.push({ rel: rel(f), line: s.line, surface, gate, total, wrap, alt });
  }
}
const seen = new Map();
for (const r of rows) { const k = `${r.rel}|${r.total}|${r.gate}`; if (!seen.has(k) || r.wrap !== "none") seen.set(k, r); }
const out = [...seen.values()].sort((a, b) => b.total - a.total);

console.log("FIXED-TRACK GRIDS — wrapper-aware. `gate` = the width below which this grid does not render.");
console.log("=".repeat(126));
console.log("file:line".padEnd(46)+"renders".padEnd(10)+"min".padEnd(6)+"overflow".padEnd(9)+"alt?".padEnd(6)+WIDTHS.map(w=>`${w}`.padStart(8)).join(""));
console.log("-".repeat(126));
for (const r of out) {
  const cells = WIDTHS.map((w) => {
    if (r.gate !== null && w < r.gate) return "—".padStart(8);
    const over = Math.round(r.total - contentBox(w, r.surface));
    return (over > 0 ? `+${over}` : "ok").padStart(8);
  }).join("");
  const renders = r.gate === null ? "ALL WIDTHS" : `≥${r.gate}px`;
  const bad = r.gate === null && r.total > contentBox(360, r.surface);
  console.log(`${(bad?"⚠ ":"  ")}${(r.rel+":"+r.line).padEnd(44)}${renders.padEnd(10)}${String(Math.round(r.total)).padEnd(6)}${r.wrap.padEnd(9)}${(r.alt?"yes":"NO").padEnd(6)}${cells}`);
}
console.log("-".repeat(126));
const broken = out.filter((r) => r.gate === null && r.total > contentBox(360, r.surface));
console.log(`\n⚠ ${broken.length} grid(s) render at ALL widths and exceed the 360px content box. These are the defect.`);
console.log(`   ${out.length - broken.length} other(s) are either gated to a width that fits, or fit already.`);
