// RESPONSIVE AUDIT — the CLI face of lib/design/responsiveScan.ts.
//
// ONE IMPLEMENTATION, TWO ENTRY POINTS. The lock (lib/design/responsive.lock.test.ts) and this
// report read the SAME analyser, so a report that says "clean" and a lock that says "clean" cannot
// mean different things. The earlier standalone .mjs version drifted from the lock's understanding
// three times in one sitting; that is why it no longer exists.
//
//   npx tsx --tsconfig tsconfig.json scripts/responsive-audit.ts
import path from "node:path";
import {
  scanAll, scanTables, scanTapTargets, appFiles, isOffender, contentBox, TEST_WIDTHS,
} from "../lib/design/responsiveScan";

const repo = path.resolve(__dirname, "..");
const sites = scanAll(repo);

console.log("FIXED-TRACK GRIDS — minimum width demanded vs the real content box");
console.log("=".repeat(120));
console.log(
  "file:line".padEnd(48) + "renders".padEnd(11) + "min".padEnd(6) + "overflow".padEnd(10) +
  TEST_WIDTHS.map((w) => `${w}`.padStart(8)).join(""),
);
console.log("-".repeat(120));
for (const s of [...sites].sort((a, b) => b.minWidth - a.minWidth)) {
  const cells = TEST_WIDTHS.map((w) => {
    if (s.gate !== null && w < s.gate) return "—".padStart(8);
    const over = Math.round(s.minWidth - contentBox(w, s.surface));
    return (over > 0 ? `+${over}` : "ok").padStart(8);
  }).join("");
  const renders = s.gate === null ? "ALL WIDTHS" : `>=${s.gate}px`;
  console.log(
    `${isOffender(s) ? "! " : "  "}${(s.file + ":" + s.line).padEnd(46)}${renders.padEnd(11)}` +
    `${String(Math.round(s.minWidth)).padEnd(6)}${s.overflow.padEnd(10)}${cells}`,
  );
}

const offenders = sites.filter(isOffender);
console.log("-".repeat(120));
console.log(`! ${offenders.length} grid(s) overflow the content box at a width where they render, with no way to reach the excess.`);
console.log(`  ${sites.length - offenders.length} others fit, are gated above the widths that would break them, or scroll.`);

const tables = appFiles(repo).flatMap((f) => scanTables(repo, f));
const unwrapped = tables.filter((t) => t.overflow !== "scrolls");
console.log(`\nTABLES: ${tables.length} total, ${unwrapped.length} with NO horizontal scroll container`);
for (const t of unwrapped) console.log(`  ! ${t.file}:${t.line}`);

const CLIENT = /^(app\/\(portal\)|app\/\(auth\)|components\/portal|components\/auth)/;
const small = appFiles(repo).filter((f) => CLIENT.test(f)).flatMap((f) => scanTapTargets(repo, f))
  .filter((t) => t.gate === null || t.gate < 768); // desktop-only controls are mouse targets
console.log(`\nCLIENT-SURFACE TAP TARGETS UNDER 44px: ${small.length}`);
const byFile = new Map<string, number[]>();
for (const t of small) byFile.set(t.file, [...(byFile.get(t.file) ?? []), t.height]);
for (const [f, hs] of [...byFile].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ! ${f.padEnd(52)}${String(hs.length).padStart(3)}  smallest ${Math.min(...hs)}px`);
}

console.log("\nCONTENT BOX (measured from the shells):");
for (const s of ["admin", "portal"] as const) {
  console.log(`  ${s.padEnd(7)}` + [...TEST_WIDTHS, 1280].map((w) => `${w}->${contentBox(w, s)}`).join("   "));
}
console.log("  NOTE: crossing lg gains only 8px — the sidebar becomes a static 248px column and eats");
console.log("        248 of the 256 extra pixels. A 1280 window hands you 256px MORE than a real 1024.");
