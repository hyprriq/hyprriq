// ── THE PALETTE — ONE SOURCE, MEASURED, NOT DESCRIBED ─────────────────────────────────────────
//
// WHY THIS FILE EXISTS AND app/globals.css DOES NOT HOLD THE TRUTH ALONE:
// CSS custom properties cannot be tested. Every colour rule this project has ever written lived
// in a CSS comment — "5.5:1 on base", "AA at pill size (verified 4.6-5.9:1)", ">=4.5:1 on paper" —
// and a comment is a claim someone typed once. `palette.lock.test.ts` imports THIS file, recomputes
// every ratio, and reads globals.css back to prove the CSS still matches. The values live here; the
// CSS mirrors them; the lock proves the mirror is clean on every build.
//
// ⛔ THE ORGANISING RULE (founder-ruled, HyprrIQ_DEV_BRIEF 2026-08-23):
//    Warm hues belong to the verdict. Cool hues belong to the brand.
//    The four VERDICT hues below appear nowhere else, ever. This is why the brand anchor could
//    move from navy to petrol without touching the verdict system — identity and judgement are
//    structurally independent, and staying that way is the point.
//
// SOURCE OF THE VALUES: HyprrIQ_DEV_BRIEF.md "Tokens — LOCKED", with THREE corrections. Each
// correction is a value that missed the brief's OWN 4.5:1 floor on a ground the ruled homepage
// actually renders it against, solved for the minimum lightness shift that clears it
// (scripts/solve-token.ts). Each is marked CORRECTED with the measured before/after. Nothing was
// re-hued and nothing was chosen by eye.

/** Neutrals — cool grey, near-zero chroma. Not warm paper, not violet. */
export const NEUTRAL = {
  /** canvas — the page ground */
  canvas: "#F6F9FB",
  /** cards, panels, anything raised */
  surface: "#FFFFFF",
  /** insets, table headers, sunk wells */
  subtle: "#ECF1F3",
  /** tinted section ground */
  mist: "#EDF4F5",
  /** tinted section ground */
  pale: "#F0F6F7",
  /** tinted section ground — the one warm-ish neutral, and it carries no meaning */
  sand: "#F5F3EE",
  /** primary text — 16.89:1 on canvas */
  ink: "#0E191D",
  /** secondary text — 8.89:1 on canvas */
  ink2: "#3D484D",
  /**
   * captions and every 10.5-11px mono label.
   * CORRECTED from the brief's #687276, which measured 4.33:1 on --subtle, 4.43:1 on --mist and
   * 4.44:1 on --sand — three of the six grounds it renders on, all below the brief's own floor.
   * #666F73 is the minimum darkening that clears 4.5:1 on ALL six (worst ground 4.51:1).
   */
  muted: "#666F73",
  /** decorative hairline — separators only. Exempt from 1.4.11; it identifies nothing. */
  line: "#D9DFE2",
  /** stronger decorative rule — still decorative, still exempt */
  lineStrong: "#BFCBD0",
  /**
   * NEW TOKEN. The edge of a CONTROL — secondary button, input, select. WCAG 1.4.11 requires 3:1
   * for a boundary that identifies a component, and the brief's --ln2 measures 1.65:1 on surface:
   * the secondary button's outline is, today, not perceivably there. Decorative hairlines keep
   * --line/--line-strong; anything you can click or type into uses this.
   */
  controlBorder: "#848C90",
} as const;

/** Anchor and action — petrol. The brand, and the only two colours a client is asked to click. */
export const BRAND = {
  /** deep fills, nav, dark sections, hover state of `action` — 11.27:1 on canvas */
  anchor: "#003D48",
  /** the interactive petrol: buttons, links, focus-adjacent emphasis — 7.46:1 on canvas */
  action: "#005A68",
  /** anchor wash — active nav pill, icon plates */
  tint: "#E3EFF1",
} as const;

/**
 * Accents — COOL ONLY. Wayfinding: they say "you are in this section". They never say a verdict,
 * and no verdict is ever expressed in one of them.
 */
export const ACCENT = {
  blue: "#006FC0",
  blueTint: "#E5F2FF",
  /**
   * CORRECTED from the brief's #007983, which measured 4.43:1 against the hero gradient's darkest
   * stop (#E4F0F1) — the exact ground the ruled homepage puts the hero kicker on. #007881 is a
   * two-unit darkening that clears 4.5:1 there and everywhere else.
   */
  cyan: "#007881",
  cyanTint: "#DAF6FA",
  plum: "#A7439D",
  plumTint: "#FDE9F9",
  /** one accent among four — the nod to Hyprr Brands, not the identity */
  violet: "#6B58D9",
  violetTint: "#EEEEFF",
} as const;

/** Text and rings on the two dark grounds (--anchor sections, --ink footer). */
export const ON_DARK = {
  /** primary text on anchor — 6.89:1 */
  navFg: "#A9CBD1",
  /**
   * secondary text on anchor — 5.65:1.
   * MIGRATION FIX: the old #7e93a8 measured 4.55:1 on the old navy #0e2b47 and drops to 3.76:1 on
   * the new anchor. Both replacements are taken from the ruled homepage's own dark section rather
   * than invented.
   */
  navFgDim: "#8FBAC1",
  /**
   * fine print on --ink (the footer).
   * CORRECTED from the homepage's #6E7B80, which measured 4.09:1 on --ink.
   */
  inkMuted: "#758286",
} as const;

/**
 * Focus ring. CONTEXTUAL BY DESIGN, because no single hue clears 3:1 on both a white card and the
 * petrol section: --cyan measures 5.24:1 on surface but 2.30:1 on --anchor. Rather than a rule
 * somebody has to remember, `--color-focus` is redefined by the dark-ground context itself
 * (`[data-ground="dark"]` in globals.css), so a control inherits the correct ring from where it
 * sits. Both values are locked against the grounds their context declares.
 */
export const FOCUS = {
  onLight: "#007881",
  onDark: "#DAF6FA",
} as const;

/** Ordered strongest → weakest. Must equal VERDICT_SCALE_ORDER; the lock proves it. */
export const VERDICT_PALETTE = {
  source_clear: { ink: "#007E46", bg: "#E0F7E7", token: "clear" },
  usable_with_conditions: { ink: "#8A6700", bg: "#FAEFD8", token: "conditional" },
  verify_before_purchase: { ink: "#B05100", bg: "#FFECE2", token: "verify" },
  do_not_rely: { ink: "#C13C3B", bg: "#FFEBE9", token: "deny" },
} as const;

export type VerdictPaletteKey = keyof typeof VERDICT_PALETTE;

/**
 * The Tailwind utility pair for each verdict. EXPORTED SO NOTHING RE-DERIVES IT.
 * `/how-to-read` — the public page whose entire job is teaching a client to read the verdict —
 * shipped its own map: source_clear wearing the VERIFY orange, usable_with_conditions wearing the
 * brand navy, and verify_before_purchase wearing a raw `amber-600` from Tailwind's default palette,
 * outside the design system altogether. Three of four wrong, on the page that explains them. Any
 * surface needing verdict colour reads this object; the lock fails a file that builds its own.
 */
export const VERDICT_CLASSES: Record<
  VerdictPaletteKey,
  { bg: string; ink: string; border: string; borderL: string }
> = {
  source_clear: { bg: "bg-clear-bg", ink: "text-clear-ink", border: "border-clear-ink", borderL: "border-l-clear-ink" },
  usable_with_conditions: { bg: "bg-conditional-bg", ink: "text-conditional-ink", border: "border-conditional-ink", borderL: "border-l-conditional-ink" },
  verify_before_purchase: { bg: "bg-verify-bg", ink: "text-verify-ink", border: "border-verify-ink", borderL: "border-l-verify-ink" },
  do_not_rely: { bg: "bg-deny-bg", ink: "text-deny-ink", border: "border-deny-ink", borderL: "border-l-deny-ink" },
};

/** Every hue the verdict ramp reserves. Nothing outside VERDICT_PALETTE may use one. */
export const RESERVED_VERDICT_HEXES: readonly string[] = Object.values(VERDICT_PALETTE)
  .flatMap((v) => [v.ink, v.bg])
  .map((h) => h.toUpperCase());

/** WCAG 2.1 AA. Verdict text is never large text — a badge label is 12-14px. */
export const VERDICT_FLOOR = 4.5;

// ── MOTION ────────────────────────────────────────────────────────────────────────────────────
// The brief bans the CSS defaults outright: "Never `ease`, `ease-in-out` or `linear` — those are
// the browser's opinion, not a design decision." A ban nobody can enforce is a preference, so
// globals.css ALSO overrides Tailwind's `--default-transition-*`. That way a bare `transition-colors`
// anywhere in the codebase — including the ~40 places that already use one — is on-system without
// a single component edit.
export const MOTION = {
  /** entrances, expansions, reveals — the brief's --eo */
  easeEntrance: "cubic-bezier(.32,.72,0,1)",
  /** position changes — the brief's --ease-io */
  easePosition: "cubic-bezier(.65,0,.35,1)",
  /** hover, focus, press */
  durFast: "140ms",
  /** dropdowns, popovers */
  durBase: "220ms",
  /** page-level and scroll-triggered */
  durSlow: "380ms",
} as const;

/**
 * CONTRAST CONTRACTS — the pairs that MUST hold, with the floor each is held to and the surface
 * that makes it non-negotiable. The lock walks this list and recomputes every one. Adding a token
 * without adding its contract here is how a palette rots quietly, so the lock also refuses any
 * text/ground token that appears in no contract at all.
 *
 * `floor: 3` entries are WCAG 1.4.11 non-text: a control boundary or a focus indicator. Decorative
 * hairlines (--line, --line-strong) are deliberately ABSENT — they identify no component and are
 * exempt, and pretending otherwise would force a heavy rule the design does not want.
 */
export const CONTRAST_CONTRACTS: readonly {
  fg: string;
  bg: string;
  floor: number;
  what: string;
}[] = [
  // text on every ground it actually renders on
  ...(["canvas", "surface", "subtle", "mist", "pale", "sand"] as const).flatMap((g) => [
    { fg: NEUTRAL.ink, bg: NEUTRAL[g], floor: 4.5, what: `--ink on --${g}` },
    { fg: NEUTRAL.ink2, bg: NEUTRAL[g], floor: 4.5, what: `--ink-2 on --${g}` },
    { fg: NEUTRAL.muted, bg: NEUTRAL[g], floor: 4.5, what: `--muted on --${g}` },
  ]),
  // brand
  { fg: BRAND.anchor, bg: NEUTRAL.canvas, floor: 4.5, what: "--anchor on --canvas" },
  { fg: BRAND.anchor, bg: NEUTRAL.surface, floor: 4.5, what: "--anchor on --surface" },
  { fg: BRAND.anchor, bg: BRAND.tint, floor: 4.5, what: "--anchor on --brand-tint" },
  { fg: BRAND.action, bg: NEUTRAL.canvas, floor: 4.5, what: "--action on --canvas" },
  { fg: BRAND.action, bg: NEUTRAL.surface, floor: 4.5, what: "--action on --surface" },
  { fg: BRAND.action, bg: NEUTRAL.subtle, floor: 4.5, what: "--action on --subtle" },
  { fg: BRAND.action, bg: NEUTRAL.sand, floor: 4.5, what: "--action on --sand" },
  { fg: NEUTRAL.surface, bg: BRAND.action, floor: 4.5, what: "white on --action (primary button)" },
  { fg: NEUTRAL.surface, bg: BRAND.anchor, floor: 4.5, what: "white on --anchor (button hover, ribbon)" },
  // accents, on the grounds the ruled homepage puts them on
  { fg: ACCENT.blue, bg: NEUTRAL.canvas, floor: 4.5, what: "--blue on --base (section kicker)" },
  { fg: ACCENT.cyan, bg: NEUTRAL.canvas, floor: 4.5, what: "--cyan on --base (section kicker)" },
  { fg: ACCENT.cyan, bg: NEUTRAL.surface, floor: 4.5, what: "--cyan on --surface" },
  { fg: ACCENT.cyan, bg: ACCENT.cyanTint, floor: 4.5, what: "--cyan on its tint (coming-soon chip)" },
  { fg: ACCENT.cyan, bg: "#E4F0F1", floor: 4.5, what: "--cyan on the hero gradient's darkest stop" },
  { fg: ACCENT.plum, bg: NEUTRAL.pale, floor: 4.5, what: "--plum on --pale (section kicker)" },
  { fg: ACCENT.violet, bg: NEUTRAL.sand, floor: 4.5, what: "--violet on --sand (section kicker)" },
  { fg: NEUTRAL.surface, bg: ACCENT.cyan, floor: 4.5, what: "white on --cyan (portal count badge)" },
  // dark grounds
  { fg: ON_DARK.navFg, bg: BRAND.anchor, floor: 4.5, what: "--nav-fg on --anchor" },
  { fg: ON_DARK.navFgDim, bg: BRAND.anchor, floor: 4.5, what: "--nav-fg-dim on --anchor" },
  { fg: ON_DARK.inkMuted, bg: NEUTRAL.ink, floor: 4.5, what: "--ink-muted on --ink (footer fine print)" },
  { fg: NEUTRAL.surface, bg: NEUTRAL.ink, floor: 4.5, what: "white on --ink (footer headings)" },
  // non-text: control boundaries and focus indicators (WCAG 1.4.11)
  { fg: NEUTRAL.controlBorder, bg: NEUTRAL.surface, floor: 3, what: "control border on --surface" },
  { fg: NEUTRAL.controlBorder, bg: NEUTRAL.canvas, floor: 3, what: "control border on --canvas" },
  { fg: NEUTRAL.controlBorder, bg: NEUTRAL.subtle, floor: 3, what: "control border on --subtle" },
  { fg: FOCUS.onLight, bg: NEUTRAL.surface, floor: 3, what: "focus ring on --surface" },
  { fg: FOCUS.onLight, bg: NEUTRAL.canvas, floor: 3, what: "focus ring on --canvas" },
  { fg: FOCUS.onLight, bg: NEUTRAL.subtle, floor: 3, what: "focus ring on --subtle" },
  { fg: FOCUS.onDark, bg: BRAND.anchor, floor: 3, what: "dark-ground focus ring on --anchor" },
  { fg: FOCUS.onDark, bg: NEUTRAL.ink, floor: 3, what: "dark-ground focus ring on --ink" },
];
