/**
 * MINIMUM-SHIFT TOKEN SOLVER.
 *
 * Three tokens in the dev brief fail the 4.5 floor the brief itself sets, on grounds the homepage
 * actually renders them against. This finds the SMALLEST move that clears the floor, rather than
 * picking a replacement by eye — the same discipline the brief asks for, applied to the brief.
 *
 * Method: scale the sRGB channels toward black (for a colour that must darken) or toward white
 * (for one that must lighten) in 0.2% steps, stopping at the first value that clears the target on
 * its WORST ground. Channel-proportional scaling holds the hue steady; the shift is a lightness
 * move, not a recolour.
 *
 * Run: npx tsx --tsconfig tsconfig.json scripts/solve-token.ts
 */
import { contrastRatio, ratio, parseHex } from "../lib/design/contrast";

const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0").toUpperCase();
const fmt = (r: number, g: number, b: number) => `#${toHex(r)}${toHex(g)}${toHex(b)}`;

/** Nearest colour to `start` that clears `target` against every ground, moving only in lightness. */
function solve(start: string, grounds: string[], target: number, dir: "darker" | "lighter") {
  const c = parseHex(start);
  const worst = (hex: string) => Math.min(...grounds.map((g) => contrastRatio(hex, g)));
  if (worst(start) >= target) return { hex: start, moved: false, ratio: worst(start) };
  for (let step = 0; step <= 1000; step++) {
    const k = step / 1000;
    const hex =
      dir === "darker"
        ? fmt(c.r * (1 - k), c.g * (1 - k), c.b * (1 - k))
        : fmt(c.r + (255 - c.r) * k, c.g + (255 - c.g) * k, c.b + (255 - c.b) * k);
    if (worst(hex) >= target) return { hex, moved: true, ratio: worst(hex) };
  }
  return { hex: dir === "darker" ? "#000000" : "#FFFFFF", moved: true, ratio: worst("#000000") };
}

const report = (
  name: string,
  start: string,
  grounds: [string, string][],
  target: number,
  dir: "darker" | "lighter",
) => {
  const gs = grounds.map(([, hex]) => hex);
  const r = solve(start, gs, target, dir);
  console.log(`\n${name}`);
  console.log(`  brief value ${start}`);
  for (const [label, g] of grounds) {
    const v = ratio(start, g);
    console.log(`    ${v >= target ? "pass" : "FAIL"}  ${String(v).padStart(5)}:1  on ${label} ${g}`);
  }
  if (!r.moved) {
    console.log(`  → already clears ${target}:1 on every ground. No change.`);
    return;
  }
  console.log(`  SOLVED  ${r.hex}   (${dir}, worst ground now ${Math.floor(r.ratio * 100) / 100}:1)`);
  for (const [label, g] of grounds) {
    console.log(`    ${ratio(r.hex, g) >= target ? "pass" : "FAIL"}  ${String(ratio(r.hex, g)).padStart(5)}:1  on ${label} ${g}`);
  }
};

console.log("=".repeat(80));
console.log("MINIMUM-SHIFT CORRECTIONS — brief tokens that miss the brief's own floor");
console.log("=".repeat(80));

report(
  "--mut  (captions 13-14px + every 10.5-11px mono label = NORMAL size, 4.5 floor)",
  "#687276",
  [["--srf ", "#FFFFFF"], ["--cv  ", "#F6F9FB"], ["--pale", "#F0F6F7"], ["--mist", "#EDF4F5"], ["--sand", "#F5F3EE"], ["--sunk", "#ECF1F3"]],
  4.5,
  "darker",
);

report(
  "--cyan  (hero kicker sits on the hero gradient's darkest stop)",
  "#007983",
  [["--srf     ", "#FFFFFF"], ["--cv      ", "#F6F9FB"], ["--cyant   ", "#DAF6FA"], ["hero top  ", "#E4F0F1"]],
  4.5,
  "darker",
);

report(
  "footer fine print (12.5px on --ink)",
  "#6E7B80",
  [["--ink", "#0E191D"]],
  4.5,
  "lighter",
);

console.log("\n" + "=".repeat(80));
console.log("INTERACTIVE BOUNDARIES — WCAG 1.4.11, 3:1. Decorative hairlines are exempt;");
console.log("a control's own edge is not. These are the borders that identify a control.");
console.log("=".repeat(80));

report(
  "control border  (.btn.g secondary button edge, input edge)",
  "#BFCBD0",
  [["--srf ", "#FFFFFF"], ["--cv  ", "#F6F9FB"], ["--sunk", "#ECF1F3"], ["field ", "#F2F8F9"]],
  3,
  "darker",
);

console.log("\n" + "=".repeat(80));
console.log("FOCUS RING ON DARK GROUNDS — --cyan measures 2.30:1 on --anchor (needs 3:1).");
console.log("A single-tone ring cannot clear 3:1 on BOTH --srf and --anchor, so the system");
console.log("needs a second ring token for dark sections. Candidates:");
console.log("=".repeat(80));
for (const cand of ["#7FD4DC", "#DAF6FA", "#FFFFFF", "#A8DDE2"]) {
  const onAnchor = ratio(cand, "#003D48");
  const onInk = ratio(cand, "#0E191D");
  console.log(`  ${cand}   on --anchor ${String(onAnchor).padStart(5)}:1  ${onAnchor >= 3 ? "pass" : "FAIL"}   on --ink ${String(onInk).padStart(5)}:1  ${onInk >= 3 ? "pass" : "FAIL"}`);
}
console.log("");
