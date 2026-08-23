// ── WCAG 2.1 CONTRAST, COMPUTED ───────────────────────────────────────────────────────────────
//
// WHY THIS IS A MODULE AND NOT A SCRIPT: every colour claim in this repo's history was a COMMENT.
// `--color-muted` carried "5.5:1 on base — fixes the old 3.5:1 AA failure"; the verdict block
// carried "AA at pill size (verified 4.6–5.9:1)". One of those was true. Three of the four verdict
// pairs measured 3.2–4.3:1 while the comment above them said they passed — because a comment is a
// claim a human typed once, and nothing ever re-ran it.
//
// The lock (lib/design/verdictPalette.lock.test.ts) imports these functions and recomputes the
// ratios on every build. A future session that picks a verdict colour by eye fails the gate with
// the measured number in the failure message. That is the whole point: the palette is not
// documented as accessible, it is MEASURED accessible, every run.
//
// Formulae: WCAG 2.1 §relative luminance and §contrast ratio. sRGB only — no P3, no alpha. A
// colour with alpha cannot be measured against an unknown backdrop, so `parseHex` refuses 8-digit
// hex rather than guessing a composite.

export type Rgb = { r: number; g: number; b: number };

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** #abc or #aabbcc → {r,g,b} in 0–255. Throws on anything else, including 8-digit (alpha) hex. */
export function parseHex(hex: string): Rgb {
  const s = hex.trim();
  if (!HEX.test(s)) {
    throw new Error(
      `parseHex: "${hex}" is not a 3- or 6-digit sRGB hex. Alpha colours cannot be measured ` +
        `against an unknown backdrop — resolve the composite first.`,
    );
  }
  const h = s.slice(1);
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

/** WCAG 2.1 relative luminance. */
export function relativeLuminance(c: Rgb): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

/** WCAG 2.1 contrast ratio between two opaque sRGB colours. Order-independent, 1–21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(parseHex(a));
  const lb = relativeLuminance(parseHex(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Ratio rounded the way it is quoted in review — two decimals, truncated toward zero so a
 *  4.499 never reports as "4.50" beside a FAIL. */
export function ratio(a: string, b: string): number {
  return Math.floor(contrastRatio(a, b) * 100) / 100;
}

/** WCAG 2.1 AA thresholds. `large` = >=18.66px bold or >=24px regular. */
export const AA_NORMAL = 4.5;
export const AA_LARGE = 3;
/** AA for a UI component boundary / graphical object (WCAG 1.4.11). */
export const AA_NON_TEXT = 3;

export function passesAA(fg: string, bg: string, size: "normal" | "large" = "normal"): boolean {
  return contrastRatio(fg, bg) >= (size === "large" ? AA_LARGE : AA_NORMAL);
}
