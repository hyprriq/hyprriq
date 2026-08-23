/**
 * MEASUREMENT PASS — every colour claim in the dev brief, recomputed.
 *
 * Run:  npx tsx --tsconfig tsconfig.json scripts/measure-palette.ts
 *
 * The brief says "Every value computed to WCAG 2.1, not chosen by eye" and the session rules say
 * "Measure before asserting. Every contrast value in the brief was computed; verify rather than
 * trust them." This is that verification. It prints a ratio for every foreground/background pair
 * that actually occurs in hyprriq_flow_v2.html plus every claim the brief states in prose.
 */
import { ratio, AA_NORMAL, AA_LARGE, AA_NON_TEXT } from "../lib/design/contrast";

// ── the brief's locked tokens ────────────────────────────────────────────────────────────────
const T = {
  cv: "#F6F9FB", srf: "#FFFFFF", sunk: "#ECF1F3", mist: "#EDF4F5", pale: "#F0F6F7", sand: "#F5F3EE",
  ln: "#D9DFE2", ln2: "#BFCBD0", ink: "#0E191D", ink2: "#3D484D", mut: "#687276",
  anchor: "#003D48", action: "#005A68",
  blue: "#006FC0", bluet: "#E5F2FF", cyan: "#007983", cyant: "#DAF6FA",
  plum: "#A7439D", plumt: "#FDE9F9", violet: "#6B58D9", violett: "#EEEEFF",
  clear: "#007E46", clearb: "#E0F7E7", cond: "#8A6700", condb: "#FAEFD8",
  verify: "#B05100", verifyb: "#FFECE2", rely: "#C13C3B", relyb: "#FFEBE9",
  white: "#FFFFFF",
  // one-off hexes written inline in the homepage HTML
  heroTop: "#E4F0F1", heroMid: "#EDF5F5", heroBot: "#F4F9F9",
  ribbonLabel: "#8FBAC1", outKicker: "#7FD4DC", outLede: "#A9CBD1",
  capAnchorTint: "#E3EFF1", inpBg: "#F2F8F9", inpBorder: "#BBD3D7", inpPhBorder: "#A8DDE2",
  footBody: "#8D999E", footLink: "#B7C3C7", footFine: "#6E7B80", footRule: "#223035",
  ckLastBorder: "#F5D8C6", exampleChipBorder: "#F0C9C6",
};

// ── what the CURRENT build ships (app/globals.css) ───────────────────────────────────────────
const CUR = {
  base: "#f5f7f9", surface: "#ffffff", subtle: "#eef1f4", ink: "#161b22", ink2: "#3d454f",
  muted: "#5c6570", line: "#e2e6eb", lineStrong: "#cbd2da",
  brand: "#173e63", brandHover: "#0e2b47", brandTint: "#e5edf3",
  accentWarm: "#9a551f", accentData: "#1e6e8c",
  clearBg: "#e4efea", clearInk: "#256b4c",
  conditionalBg: "#f7f0e2", conditionalInk: "#8f6416",
  verifyBg: "#f8ede2", verifyInk: "#a5560f",
  denyBg: "#f3e0de", denyInk: "#9a2f2a",
  navFg: "#c4d2e0", navFgDim: "#7e93a8",
  protoMuted: "#767E8A", // the value the brief attributes to --muted
};

type Row = { what: string; fg: string; bg: string; floor: number; note?: string };

const rows = (label: string, rs: Row[]) => {
  console.log(`\n── ${label} ${"─".repeat(Math.max(0, 78 - label.length))}`);
  for (const r of rs) {
    const v = ratio(r.fg, r.bg);
    const ok = v >= r.floor;
    const flag = ok ? "PASS" : "FAIL";
    const floorTxt = r.floor === AA_NORMAL ? "4.5" : r.floor === AA_LARGE ? "3.0" : String(r.floor);
    console.log(
      `  ${flag}  ${String(v).padStart(6)}:1  (floor ${floorTxt})  ${r.what}` +
        (r.note ? `   ← ${r.note}` : ""),
    );
  }
};

console.log("=".repeat(84));
console.log("BRIEF CLAIMS — stated in prose, recomputed here");
console.log("=".repeat(84));
rows("brief prose claims", [
  { what: `--ink on --cv        brief says 16.90:1`, fg: T.ink, bg: T.cv, floor: AA_NORMAL },
  { what: `--mut on --cv        brief says 4.67:1`, fg: T.mut, bg: T.cv, floor: AA_NORMAL },
  { what: `--anchor on --cv     brief says 11.28:1`, fg: T.anchor, bg: T.cv, floor: AA_NORMAL },
  { what: `white on --anchor    brief says 11.92:1`, fg: T.white, bg: T.anchor, floor: AA_NORMAL },
  { what: `--action on --cv     brief says 7.46:1`, fg: T.action, bg: T.cv, floor: AA_NORMAL },
  { what: `white on --action    brief says 7.89:1`, fg: T.white, bg: T.action, floor: AA_NORMAL },
  { what: `#767E8A on --cv      brief says 3.76:1 ("the old --muted")`, fg: CUR.protoMuted, bg: T.cv, floor: AA_NORMAL },
]);

console.log("\n" + "=".repeat(84));
console.log("CURRENT BUILD — app/globals.css, the thing being replaced");
console.log("=".repeat(84));
rows("current verdict ramp — comment claims 'AA at pill size (verified 4.6-5.9:1)'", [
  { what: "Source Clear            ink on bg", fg: CUR.clearInk, bg: CUR.clearBg, floor: AA_NORMAL },
  { what: "Usable With Conditions  ink on bg", fg: CUR.conditionalInk, bg: CUR.conditionalBg, floor: AA_NORMAL },
  { what: "Verify Before Purchase  ink on bg", fg: CUR.verifyInk, bg: CUR.verifyBg, floor: AA_NORMAL },
  { what: "Do Not Rely             ink on bg", fg: CUR.denyInk, bg: CUR.denyBg, floor: AA_NORMAL },
]);
rows("current neutrals + brand", [
  { what: "--color-muted on base   comment claims 5.5:1", fg: CUR.muted, bg: CUR.base, floor: AA_NORMAL },
  { what: "--color-ink on base", fg: CUR.ink, bg: CUR.base, floor: AA_NORMAL },
  { what: "--color-ink-2 on base", fg: CUR.ink2, bg: CUR.base, floor: AA_NORMAL },
  { what: "--color-brand on base", fg: CUR.brand, bg: CUR.base, floor: AA_NORMAL },
  { what: "white on --color-brand", fg: CUR.surface, bg: CUR.brand, floor: AA_NORMAL },
  { what: "--color-accent-warm on base", fg: CUR.accentWarm, bg: CUR.base, floor: AA_NORMAL },
  { what: "--color-accent-data on base", fg: CUR.accentData, bg: CUR.base, floor: AA_NORMAL },
  { what: "--color-nav-fg on brand-hover", fg: CUR.navFg, bg: CUR.brandHover, floor: AA_NORMAL },
  { what: "--color-nav-fg-dim on brand-hover", fg: CUR.navFgDim, bg: CUR.brandHover, floor: AA_NORMAL },
  { what: "--color-line on base (non-text)", fg: CUR.line, bg: CUR.base, floor: AA_NON_TEXT },
]);

console.log("\n" + "=".repeat(84));
console.log("NEW RAMP — the four verdicts, on every ground they actually render against");
console.log("=".repeat(84));
const verdicts: [string, string, string][] = [
  ["Source Clear          ", T.clear, T.clearb],
  ["Usable With Conditions", T.cond, T.condb],
  ["Verify Before Purchase", T.verify, T.verifyb],
  ["Do Not Rely           ", T.rely, T.relyb],
];
rows("verdict ink on its own tint — the badge", verdicts.map(([n, fg, bg]) => ({ what: `${n} ink on tint`, fg, bg, floor: AA_NORMAL })));
rows("verdict ink on surface — when the badge has no fill", verdicts.map(([n, fg]) => ({ what: `${n} ink on --srf`, fg, bg: T.srf, floor: AA_NORMAL })));
rows("verdict ink on canvas", verdicts.map(([n, fg]) => ({ what: `${n} ink on --cv`, fg, bg: T.cv, floor: AA_NORMAL })));
rows("verdict tint against surface — is the badge edge visible at all? (non-text 3:1)", verdicts.map(([n, , bg]) => ({ what: `${n} tint vs --srf`, fg: bg, bg: T.srf, floor: AA_NON_TEXT, note: "boundary" })));
rows("verdict tint against --anchor — the .vc cards sit on the dark section", verdicts.map(([n, , bg]) => ({ what: `${n} tint vs --anchor`, fg: bg, bg: T.anchor, floor: AA_NON_TEXT })));

console.log("\n" + "=".repeat(84));
console.log("NEW NEUTRALS + BRAND — every ground the homepage actually uses");
console.log("=".repeat(84));
const grounds: [string, string][] = [["--cv", T.cv], ["--srf", T.srf], ["--sunk", T.sunk], ["--mist", T.mist], ["--pale", T.pale], ["--sand", T.sand]];
rows("--ink on every ground", grounds.map(([n, bg]) => ({ what: `--ink on ${n}`, fg: T.ink, bg, floor: AA_NORMAL })));
rows("--ink2 on every ground (body secondary, 15-17px)", grounds.map(([n, bg]) => ({ what: `--ink2 on ${n}`, fg: T.ink2, bg, floor: AA_NORMAL })));
rows("--mut on every ground (captions 13-14px, mono labels 10.5-11px — all NORMAL size)", grounds.map(([n, bg]) => ({ what: `--mut on ${n}`, fg: T.mut, bg, floor: AA_NORMAL })));
rows("anchor / action", [
  { what: "--anchor on --cv", fg: T.anchor, bg: T.cv, floor: AA_NORMAL },
  { what: "--anchor on --sunk (.btn.g hover)", fg: T.anchor, bg: T.sunk, floor: AA_NORMAL },
  { what: "--anchor on --inpBg (.inp)", fg: T.anchor, bg: T.inpBg, floor: AA_NORMAL },
  { what: "--action on --cv", fg: T.action, bg: T.cv, floor: AA_NORMAL },
  { what: "--action on --srf (.more links)", fg: T.action, bg: T.srf, floor: AA_NORMAL },
  { what: "--action on --sand (.learn section)", fg: T.action, bg: T.sand, floor: AA_NORMAL },
  { what: "white on --action (.btn, .subbtn)", fg: T.white, bg: T.action, floor: AA_NORMAL },
  { what: "white on --anchor (.btn hover, .ribbon)", fg: T.white, bg: T.anchor, floor: AA_NORMAL },
]);

console.log("\n" + "=".repeat(84));
console.log("ACCENTS — cool wayfinding, on the exact grounds the homepage puts them on");
console.log("=".repeat(84));
rows("kickers (.k) — 11px mono uppercase, NORMAL size, 4.5 floor", [
  { what: "--cyan on hero gradient top #E4F0F1", fg: T.cyan, bg: T.heroTop, floor: AA_NORMAL, note: "hero kicker" },
  { what: "--action on --srf  (#get kicker)", fg: T.action, bg: T.srf, floor: AA_NORMAL },
  { what: "--verify on --srf  (#problem kicker)", fg: T.verify, bg: T.srf, floor: AA_NORMAL, note: "WARM on a non-verdict" },
  { what: "--blue on --cv     (#service kicker)", fg: T.blue, bg: T.cv, floor: AA_NORMAL },
  { what: "--plum on --pale   (#proof kicker)", fg: T.plum, bg: T.pale, floor: AA_NORMAL },
  { what: "--cyan on --cv     (#price kicker)", fg: T.cyan, bg: T.cv, floor: AA_NORMAL },
  { what: "--violet on --sand (learn kicker)", fg: T.violet, bg: T.sand, floor: AA_NORMAL },
]);
rows("accent on its own tint — capability icons, label chips", [
  { what: "--blue on --bluet", fg: T.blue, bg: T.bluet, floor: AA_NON_TEXT, note: "20px icon stroke" },
  { what: "--cyan on --cyant", fg: T.cyan, bg: T.cyant, floor: AA_NON_TEXT },
  { what: "--plum on --plumt", fg: T.plum, bg: T.plumt, floor: AA_NON_TEXT },
  { what: "--violet on --violett", fg: T.violet, bg: T.violett, floor: AA_NON_TEXT },
  { what: "--anchor on #E3EFF1", fg: T.anchor, bg: T.capAnchorTint, floor: AA_NON_TEXT },
  { what: "--verify on --verifyb", fg: T.verify, bg: T.verifyb, floor: AA_NON_TEXT },
  { what: "--cyan on --cyant  (.cs 'Coming soon' chip, 9.5px TEXT)", fg: T.cyan, bg: T.cyant, floor: AA_NORMAL },
  { what: "--blue on --bluet  (.gapb body text 15px)", fg: T.ink2, bg: T.bluet, floor: AA_NORMAL, note: "ink2 on bluet" },
  { what: "--ink2 on --cyant  (.lim + questions block)", fg: T.ink2, bg: T.cyant, floor: AA_NORMAL },
  { what: "--ink2 on --mist   (.honest)", fg: T.ink2, bg: T.mist, floor: AA_NORMAL },
  { what: "--ink2 on --pale   (.ck)", fg: T.ink2, bg: T.pale, floor: AA_NORMAL },
  { what: "--ink2 on --verifyb (.ck.last)", fg: T.ink2, bg: T.verifyb, floor: AA_NORMAL, note: "WARM on a non-verdict" },
]);

console.log("\n" + "=".repeat(84));
console.log("DARK GROUNDS — the output section and the footer");
console.log("=".repeat(84));
rows("--out section on --anchor", [
  { what: "white h2 on --anchor", fg: T.white, bg: T.anchor, floor: AA_NORMAL },
  { what: "#7FD4DC kicker on --anchor (11px mono)", fg: T.outKicker, bg: T.anchor, floor: AA_NORMAL },
  { what: "#A9CBD1 lede on --anchor (19px)", fg: T.outLede, bg: T.anchor, floor: AA_NORMAL },
  { what: "#7FD4DC .more link on --anchor (15px)", fg: T.outKicker, bg: T.anchor, floor: AA_NORMAL },
]);
rows("ribbon on --anchor", [
  { what: "white .ribbon b (29px serif)", fg: T.white, bg: T.anchor, floor: AA_LARGE },
  { what: "#8FBAC1 .ribbon span (10.5px mono)", fg: T.ribbonLabel, bg: T.anchor, floor: AA_NORMAL },
]);
rows("footer on --ink", [
  { what: "#8D999E body (13.5px)", fg: T.footBody, bg: T.ink, floor: AA_NORMAL },
  { what: "#B7C3C7 links (14px)", fg: T.footLink, bg: T.ink, floor: AA_NORMAL },
  { what: "white h4 (11px mono)", fg: T.white, bg: T.ink, floor: AA_NORMAL },
  { what: "#6E7B80 fine print (12.5px)", fg: T.footFine, bg: T.ink, floor: AA_NORMAL },
  { what: "#7FD4DC logo mark on --ink", fg: T.outKicker, bg: T.ink, floor: AA_LARGE },
  { what: "#223035 rule on --ink (non-text)", fg: T.footRule, bg: T.ink, floor: AA_NON_TEXT, note: "decorative" },
]);

console.log("\n" + "=".repeat(84));
console.log("BORDERS + FOCUS — WCAG 1.4.11 non-text, 3:1");
console.log("=".repeat(84));
rows("boundaries", [
  { what: "--ln on --cv", fg: T.ln, bg: T.cv, floor: AA_NON_TEXT },
  { what: "--ln on --srf", fg: T.ln, bg: T.srf, floor: AA_NON_TEXT },
  { what: "--ln2 on --cv", fg: T.ln2, bg: T.cv, floor: AA_NON_TEXT },
  { what: "--ln2 on --srf", fg: T.ln2, bg: T.srf, floor: AA_NON_TEXT },
  { what: "--cyan focus ring on --cv", fg: T.cyan, bg: T.cv, floor: AA_NON_TEXT },
  { what: "--cyan focus ring on --srf", fg: T.cyan, bg: T.srf, floor: AA_NON_TEXT },
  { what: "--cyan focus ring on --anchor", fg: T.cyan, bg: T.anchor, floor: AA_NON_TEXT, note: "dark section" },
  { what: "--cyan focus ring on --ink (footer)", fg: T.cyan, bg: T.ink, floor: AA_NON_TEXT },
  { what: "--action border on --srf (.pl.f)", fg: T.action, bg: T.srf, floor: AA_NON_TEXT },
  { what: ".inp border #BBD3D7 on #F2F8F9", fg: T.inpBorder, bg: T.inpBg, floor: AA_NON_TEXT },
]);

console.log("\n" + "=".repeat(84));
console.log("STATUS TAGS — .tg, which reuse VERDICT hues for non-verdict meaning");
console.log("=".repeat(84));
rows("status tags (10px mono uppercase = NORMAL size)", [
  { what: '.tg.ok  "Complete"    --clear on --clearb', fg: T.clear, bg: T.clearb, floor: AA_NORMAL, note: "VERDICT GREEN as a status" },
  { what: '.tg.run "Researching" --verify on --verifyb', fg: T.verify, bg: T.verifyb, floor: AA_NORMAL, note: "VERDICT ORANGE as a status" },
  { what: '.tg.q   "Queued"      --mut on --sunk', fg: T.mut, bg: T.sunk, floor: AA_NORMAL },
]);
console.log("");
