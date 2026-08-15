import Image from "next/image";

// ── THE WORDMARK (founder-ruled 2026-08-14): the typographic lockup is the identity — "HyprrIQ"
// in Fraunces SemiBold with IQ in copper. These are the REAL assets (glyphs traced to paths in
// public/brand/, one source of truth); every CSS-styled text wordmark renders through here.
// Variants: primary (navy+copper, light backgrounds) · reversed (white+copper, navy backgrounds)
// · mono (currentColor, print/single-colour). Clear space: half the mark's height on all sides.
// Do not restyle, recolor, or set the name in live text — swap the variant instead. ──

const ASPECT = 410.8 / 103.6; // the traced lockup's viewBox ratio

const SRC: Record<WordmarkVariant, string> = {
  primary: "/brand/wordmark.svg",
  reversed: "/brand/wordmark-reversed.svg",
  mono: "/brand/wordmark-mono.svg",
};

export type WordmarkVariant = "primary" | "reversed" | "mono";

export function Wordmark({
  variant = "primary",
  height = 24,
  className,
}: {
  variant?: WordmarkVariant;
  height?: number;
  className?: string;
}) {
  return (
    <Image
      src={SRC[variant]}
      alt="HyprrIQ"
      width={Math.round(height * ASPECT)}
      height={height}
      className={className}
      priority
    />
  );
}
