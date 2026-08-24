import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ratio, contrastRatio } from "./contrast";
import {
  NEUTRAL, BRAND, ACCENT, ON_DARK, FOCUS, MOTION,
  VERDICT_PALETTE, VERDICT_CLASSES, RESERVED_VERDICT_HEXES, VERDICT_FLOOR, CONTRAST_CONTRACTS,
} from "./palette";
import { VERDICT_SCALE_ORDER } from "@/lib/content/reportCopy";

// ── LOCK (built 2026-08-24) — THE ANSWER TO "WHAT STOPS THE NEXT SESSION GETTING IT WRONG" ─────
//
// The founder's closing question for this sitting: a future session wants to add a new verdict
// badge — what stops them getting the colour wrong? Until today the honest answer was "nothing,
// they would have to remember", and the evidence that remembering does not work was already
// shipped and public: /how-to-read, the page whose entire job is teaching a client to read the
// verdict, hand-wrote its own colour map and got THREE OF FOUR WRONG — Source Clear wearing the
// Verify orange, Usable With Conditions wearing the brand navy, and Verify Before Purchase wearing
// `amber-600` from Tailwind's DEFAULT palette, outside the design system altogether.
//
// So this is a lock, not a document. It fails the build when:
//   1. a verdict exists in the copy registry with no colour, or a colour exists for a non-verdict
//   2. any verdict pair measures under 4.5:1 — RECOMPUTED here, never read from a comment
//   3. two verdicts share a colour (the copy-paste failure)
//   4. app/globals.css drifts from lib/design/palette.ts in either direction
//   5. any contrast contract in the registry stops holding
//   6. a presentation file hardcodes a reserved verdict hex
//   7. a presentation file builds its OWN verdict→colour map instead of importing the registry
//   8. a colour from Tailwind's default palette appears on a presentation surface
//   9. the Clerk auth theme stops mirroring the brand
//  10. a keyframe animation appears in the operator console
//
// Everything numeric below is COMPUTED. This file contains no asserted ratio that a human typed.

const repo = path.resolve(__dirname, "../..");
const css = fs.readFileSync(path.join(repo, "app/globals.css"), "utf8");

/** `--color-x: #abc;` → "#abc". Ignores `var(...)` aliases — those are proven by the alias test. */
function cssVar(name: string): string | null {
  const m = css.match(new RegExp(`--${name}\\s*:\\s*([^;]+);`));
  if (!m) return null;
  const v = m[1].trim();
  return v.startsWith("var(") ? null : v;
}

const norm = (s: string) => s.replace(/\s+/g, "").replace(/0\./g, ".").toLowerCase();

const PRESENTATION = [
  "app/(marketing)", "app/(portal)", "app/(admin)",
  "components/marketing", "components/portal", "components/admin",
  "lib/content",
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

const rel = (p: string) => path.relative(repo, p).split(path.sep).join("/");

/** Comments are provenance, not rendering. Every scan below reads code only. */
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

const presentationFiles = PRESENTATION.flatMap(walk);

// ══════════════════════════════════════════════════════════════════════════════════════════════
describe("LOCK — the verdict ramp cannot be got wrong", () => {
  it("every verdict in the copy registry has a colour, and nothing else does", () => {
    // Adding a fifth verdict to VERDICT_SCALE_ORDER without a colour fails HERE, at the moment it
    // is added, rather than rendering as an unstyled span three surfaces later.
    expect(Object.keys(VERDICT_PALETTE).sort()).toEqual([...VERDICT_SCALE_ORDER].sort());
    expect(Object.keys(VERDICT_CLASSES).sort()).toEqual([...VERDICT_SCALE_ORDER].sort());
  });

  it("every verdict pair clears 4.5:1 — measured, not claimed", () => {
    for (const [key, v] of Object.entries(VERDICT_PALETTE)) {
      const r = ratio(v.ink, v.bg);
      expect(r, `${key}: ${v.ink} on ${v.bg} measures ${r}:1, floor is ${VERDICT_FLOOR}:1`)
        .toBeGreaterThanOrEqual(VERDICT_FLOOR);
    }
  });

  it("every verdict ink is legible on surface and canvas — badges are not always filled", () => {
    for (const [key, v] of Object.entries(VERDICT_PALETTE)) {
      for (const [name, bg] of [["--surface", NEUTRAL.surface], ["--canvas", NEUTRAL.canvas]] as const) {
        const r = ratio(v.ink, bg);
        expect(r, `${key} ink on ${name} measures ${r}:1`).toBeGreaterThanOrEqual(VERDICT_FLOOR);
      }
    }
  });

  it("no two verdicts share a colour", () => {
    const inks = Object.values(VERDICT_PALETTE).map((v) => v.ink.toUpperCase());
    const bgs = Object.values(VERDICT_PALETTE).map((v) => v.bg.toUpperCase());
    expect(new Set(inks).size, "two verdicts share an ink").toBe(inks.length);
    expect(new Set(bgs).size, "two verdicts share a background").toBe(bgs.length);
  });

  it("verdict inks are distinguishable from each other, not just from their grounds", () => {
    // Four verdicts a client must tell apart. Two that measure identically against their own tints
    // can still be the same colour to the eye — this is the check a contrast-only pass misses.
    const entries = Object.entries(VERDICT_PALETTE);
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [ka, a] = entries[i];
        const [kb, b] = entries[j];
        expect(a.ink.toUpperCase(), `${ka} and ${kb} share an ink`).not.toBe(b.ink.toUpperCase());
      }
    }
  });

  it("app/globals.css carries exactly the registry's verdict values", () => {
    for (const [key, v] of Object.entries(VERDICT_PALETTE)) {
      expect(cssVar(`color-${v.token}-ink`)?.toUpperCase(), `--color-${v.token}-ink (${key})`)
        .toBe(v.ink.toUpperCase());
      expect(cssVar(`color-${v.token}-bg`)?.toUpperCase(), `--color-${v.token}-bg (${key})`)
        .toBe(v.bg.toUpperCase());
    }
  });

  it("no presentation file hardcodes a reserved verdict hex", () => {
    const bad: string[] = [];
    for (const f of presentationFiles) {
      const src = stripComments(fs.readFileSync(f, "utf8"));
      for (const hex of RESERVED_VERDICT_HEXES) {
        if (new RegExp(hex, "i").test(src)) bad.push(`${rel(f)} → ${hex}`);
      }
    }
    expect(bad, `verdict hues are reserved; use the token, not the hex:\n${bad.join("\n")}`).toEqual([]);
  });

  it("no presentation file builds its own verdict→colour map", () => {
    // THE /how-to-read DEFECT CLASS. A file that writes `source_clear: "border-l-verify-ink"` is
    // re-deriving something the registry already owns, and nothing else would ever catch it.
    const keyRe = /(source_clear|usable_with_conditions|verify_before_purchase|do_not_rely)\s*:\s*"([^"]*)"/g;
    const colourRe = /\b(?:bg|text|border|border-[trblxy]|fill|stroke|ring)-/;
    const bad: string[] = [];
    for (const f of presentationFiles) {
      const src = stripComments(fs.readFileSync(f, "utf8"));
      for (const m of src.matchAll(keyRe)) {
        const [, key, value] = m;
        if (!colourRe.test(value)) continue;
        const allowed = Object.values(VERDICT_CLASSES[key as keyof typeof VERDICT_CLASSES]);
        if (!allowed.includes(value)) bad.push(`${rel(f)} → ${key}: "${value}"`);
      }
    }
    expect(
      bad,
      `import VERDICT_CLASSES from lib/design/palette instead of writing a colour map:\n${bad.join("\n")}`,
    ).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════════
describe("LOCK — the token layer cannot drift from the registry", () => {
  const MIRROR: [string, string][] = [
    ["color-canvas", NEUTRAL.canvas], ["color-surface", NEUTRAL.surface], ["color-subtle", NEUTRAL.subtle],
    ["color-mist", NEUTRAL.mist], ["color-pale", NEUTRAL.pale], ["color-sand", NEUTRAL.sand],
    ["color-ink", NEUTRAL.ink], ["color-ink-2", NEUTRAL.ink2], ["color-muted", NEUTRAL.muted],
    ["color-line", NEUTRAL.line], ["color-line-strong", NEUTRAL.lineStrong],
    ["color-control-border", NEUTRAL.controlBorder],
    ["color-anchor", BRAND.anchor], ["color-action", BRAND.action], ["color-brand-tint", BRAND.tint],
    ["color-blue", ACCENT.blue], ["color-blue-tint", ACCENT.blueTint],
    ["color-cyan", ACCENT.cyan], ["color-cyan-tint", ACCENT.cyanTint],
    ["color-plum", ACCENT.plum], ["color-plum-tint", ACCENT.plumTint],
    ["color-violet", ACCENT.violet], ["color-violet-tint", ACCENT.violetTint],
    ["color-nav-fg", ON_DARK.navFg], ["color-nav-fg-dim", ON_DARK.navFgDim],
    ["color-ink-muted", ON_DARK.inkMuted],
  ];

  it.each(MIRROR)("--%s matches the registry", (name, expected) => {
    expect(cssVar(name)?.toUpperCase(), `--${name} in app/globals.css`).toBe(expected.toUpperCase());
  });

  it("no colour token shadows a Tailwind SIZE utility", () => {
    // ── THE text-base COLLISION (founder ruling 1, 2026-08-24) ────────────────────────────────
    // `--color-base` made Tailwind emit `.text-base { color: … }`, which SHADOWED the built-in
    // 16px font-size utility. Anyone writing `text-base` expecting 16px silently got a colour, and
    // the element fell through to its default size. Fourteen usages were doing exactly that —
    // every one of them size-intent, each already carrying its own colour class beside it. They
    // were invisible while the unlayered-CSS bug oversized everything.
    //
    // FIXED BY RENAME (option a): the token is `--color-canvas`, so `text-base` means 16px again —
    // the way every developer, and every piece of Tailwind documentation, already assumes.
    //
    // This test is the other half of that ruling: "it must be a rename or a lock, never a note".
    // Any future token whose name collides with a Tailwind size utility fails HERE, at the moment
    // it is added, rather than silently mis-sizing text somewhere else entirely.
    const SIZE_UTILITIES = ["base", "xs", "sm", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl"];
    const declared = [...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]);
    const shadowing = declared.filter((n) => SIZE_UTILITIES.includes(n));
    expect(
      shadowing,
      `these colour tokens shadow Tailwind text-* SIZE utilities, so \`text-<name>\` silently ` +
        `becomes a colour: ${shadowing.map((n) => `--color-${n}`).join(", ")}`,
    ).toEqual([]);
  });

  it("the deprecated brand-* aliases still resolve to the petrol pair", () => {
    // ~30 admin/portal files still say bg-brand / hover:bg-brand-hover. If someone "cleans up" the
    // aliases, those surfaces lose their brand colour silently — nothing else would fail.
    expect(css).toMatch(/--color-brand:\s*var\(--color-action\)/);
    expect(css).toMatch(/--color-brand-hover:\s*var\(--color-anchor\)/);
    expect(css).toMatch(/--color-accent-data:\s*var\(--color-cyan\)/);
  });

  it("the focus ring is contextual, and both contexts are declared in CSS", () => {
    expect(FOCUS.onLight).toBe(ACCENT.cyan);
    expect(FOCUS.onDark).toBe(ACCENT.cyanTint);
    expect(css, "--color-focus must default to the light-ground ring")
      .toMatch(/--color-focus:\s*var\(--color-cyan\)/);
    expect(css, 'dark sections must redefine the ring via [data-ground="dark"]')
      .toMatch(/\[data-ground="dark"\][\s\S]*?--color-focus:\s*var\(--color-cyan-tint\)/);
    expect(css, "the focus ring must actually be applied on :focus-visible")
      .toMatch(/:focus-visible[\s\S]*?outline:[^;]*var\(--color-focus\)/);
  });

  it("motion tokens match the registry and the browser defaults are overridden", () => {
    expect(norm(cssVar("ease-entrance") ?? "")).toBe(norm(MOTION.easeEntrance));
    expect(norm(cssVar("ease-position") ?? "")).toBe(norm(MOTION.easePosition));
    expect(cssVar("dur-fast")).toBe(MOTION.durFast);
    expect(cssVar("dur-base")).toBe(MOTION.durBase);
    expect(cssVar("dur-slow")).toBe(MOTION.durSlow);
    // The brief bans `ease` / `ease-in-out` / `linear` outright. A ban nobody can enforce is a
    // preference — overriding Tailwind's defaults is what makes a bare `transition-*` on-system.
    expect(cssVar("default-transition-duration")).toBe(MOTION.durFast);
    expect(norm(cssVar("default-transition-timing-function") ?? "")).toBe(norm(MOTION.easeEntrance));
  });

  it("the Clerk auth theme still mirrors the brand", () => {
    const clerk = fs.readFileSync(path.join(repo, "lib/clerk-appearance.ts"), "utf8");
    expect(clerk, "colorPrimary must equal BRAND.action").toContain(`colorPrimary: "${BRAND.action.toLowerCase()}"`);
    expect(clerk, "colorText must equal NEUTRAL.ink").toContain(`colorText: "${NEUTRAL.ink.toLowerCase()}"`);
    expect(clerk, "colorTextSecondary must equal NEUTRAL.ink2").toContain(`colorTextSecondary: "${NEUTRAL.ink2.toLowerCase()}"`);
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════════
describe("LOCK — every contrast contract holds, recomputed", () => {
  it.each(CONTRAST_CONTRACTS.map((c) => [c.what, c] as const))("%s", (_what, c) => {
    const r = ratio(c.fg, c.bg);
    expect(r, `${c.what}: ${c.fg} on ${c.bg} measures ${r}:1, floor ${c.floor}:1`)
      .toBeGreaterThanOrEqual(c.floor);
  });

  it("every text token appears in at least one contract", () => {
    // A token with no contract is a token nobody is measuring. This is the check that stops the
    // palette rotting one convenient addition at a time.
    const covered = new Set(CONTRAST_CONTRACTS.flatMap((c) => [c.fg.toUpperCase(), c.bg.toUpperCase()]));
    const mustBeMeasured: [string, string][] = [
      ["--ink", NEUTRAL.ink], ["--ink-2", NEUTRAL.ink2], ["--muted", NEUTRAL.muted],
      ["--anchor", BRAND.anchor], ["--action", BRAND.action],
      ["--blue", ACCENT.blue], ["--cyan", ACCENT.cyan], ["--plum", ACCENT.plum], ["--violet", ACCENT.violet],
      ["--nav-fg", ON_DARK.navFg], ["--nav-fg-dim", ON_DARK.navFgDim], ["--ink-muted", ON_DARK.inkMuted],
      ["--control-border", NEUTRAL.controlBorder],
    ];
    const unmeasured = mustBeMeasured.filter(([, hex]) => !covered.has(hex.toUpperCase())).map(([n]) => n);
    expect(unmeasured, `these tokens are in no contrast contract: ${unmeasured.join(", ")}`).toEqual([]);
  });

  it("the decorative hairlines are NOT held to 3:1, deliberately", () => {
    // WCAG 1.4.11 covers boundaries that IDENTIFY a component. --line and --line-strong separate
    // content; they identify nothing, and holding them to 3:1 would force a heavy rule the design
    // does not want. This test pins the decision so a future reader does not "fix" it — and proves
    // the distinction is real by showing they genuinely sit below the control-border floor.
    expect(contrastRatio(NEUTRAL.line, NEUTRAL.surface)).toBeLessThan(3);
    expect(contrastRatio(NEUTRAL.controlBorder, NEUTRAL.surface)).toBeGreaterThanOrEqual(3);
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════════
describe("LOCK — nothing renders a colour from outside the design system", () => {
  it("no presentation file uses Tailwind's default palette", () => {
    // `border-l-amber-600` reached a client-facing page this way. The default palette is not the
    // design system: it has no contrast contract, no verdict discipline, and no ruling behind it.
    const re =
      /\b(?:bg|text|border|border-[trblxy]|fill|stroke|ring|from|via|to|divide|outline|accent|caret|decoration)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-(?:50|\d{3})\b/g;
    const bad: string[] = [];
    for (const f of presentationFiles) {
      const src = stripComments(fs.readFileSync(f, "utf8"));
      for (const m of src.matchAll(re)) bad.push(`${rel(f)} → ${m[0]}`);
    }
    expect(bad, `use a design-system token:\n${bad.join("\n")}`).toEqual([]);
  });

  // SKELETON EXEMPTIONS. The rule bans animation on RENDERED CONTENT. A loading skeleton is not
  // content — it is the honest visual of content that has not arrived, it is aria-hidden, and it
  // stops the moment the data lands. Each entry is deliberate and must stay justified; the test
  // below fails a stale one, so this list cannot quietly become the place animations go to hide.
  const SKELETON_EXEMPT: readonly string[] = [
    "app/(admin)/admin/cases/[id]/review/loading.tsx", // Next.js loading UI — the latency state itself
    "components/admin/users-manager.tsx", // aria-hidden placeholder rows behind `!loaded`
  ];

  it("nothing animates in the operator console", () => {
    // The brief's one non-negotiable motion rule. The case review screen is read dozens of times a
    // day and a self-starting animation there reads as latency — `animate-pulse` was sitting on the
    // pipeline progress dots, on rendered content. Scoped to keyframe ANIMATION: a 140ms hover
    // transition is feedback the operator asked for by pointing at something, and is not this rule.
    const admin = [...walk("app/(admin)"), ...walk("components/admin")];
    const bad: string[] = [];
    for (const f of admin) {
      if (SKELETON_EXEMPT.includes(rel(f))) continue;
      const src = stripComments(fs.readFileSync(f, "utf8"));
      for (const m of src.matchAll(/\banimate-(?!none\b)[a-z-]+/g)) bad.push(`${rel(f)} → ${m[0]}`);
    }
    expect(bad, `the operator console does not animate:\n${bad.join("\n")}`).toEqual([]);
  });

  it("every skeleton exemption is still needed", () => {
    const stale = SKELETON_EXEMPT.filter((p) => {
      const abs = path.join(repo, p);
      if (!fs.existsSync(abs)) return true;
      return !/\banimate-(?!none\b)[a-z-]+/.test(stripComments(fs.readFileSync(abs, "utf8")));
    });
    expect(stale, `these exemptions no longer apply and should be deleted: ${stale.join(", ")}`).toEqual([]);
  });
});
