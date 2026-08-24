// ── THE WORDMARK — ONE LOCKUP ACROSS THE WHOLE PRODUCT (founder ruling 4, 2026-08-24) ─────────
//
// WHAT CHANGED AND WHY. This was an <Image> pointing at three traced SVGs in public/brand/ —
// "HyprrIQ" set in Fraunces SemiBold with the IQ in copper, under a 2026-08-14 ruling that said
// never to set the name in live text. The 2026-08-23 visual ruling deleted BOTH of those values:
// Fraunces is not in the type stack any more, and copper (--color-accent-warm) was removed from the
// token layer as a warm hue with no verdict meaning. That left the identity rendered in a typeface
// and a colour the design system no longer contains — which the founder ruled is worse than no
// logo. The marketing chrome's live-text lockup wins, and it now lives here so every surface gets
// it from one place.
//
// THE API IS UNCHANGED — `variant`, `height`, `className` — so admin, portal, auth, error and 404
// keep working without an edit. `height` is the CAP HEIGHT the caller wants, mapped to a font size:
// the traced SVGs were sized by their bounding box, and matching that optically means the type is
// set a little larger than the number passed.
//
// public/brand/*.svg are now UNREFERENCED. They are left on disk rather than deleted — they are the
// only record of the previous lockup, and deleting is a founder action. They must not be
// reintroduced without being redrawn in Newsreader and petrol.

export type WordmarkVariant = "primary" | "reversed" | "mono";

/** Cap-height to font-size. The SVG's glyphs filled ~0.72 of its box; text needs the inverse. */
const FONT_SCALE = 1.38;

const TONE: Record<WordmarkVariant, { name: string; iq: string }> = {
  // Light grounds: ink with the action petrol on IQ.
  primary: { name: "text-ink", iq: "text-action" },
  // Dark grounds (admin sidebar, portal shell, the auth panel): white with the cyan tint, which
  // measures 10.52:1 on --anchor and 15.77:1 on --ink. The petrol IQ would vanish there.
  reversed: { name: "text-white", iq: "text-cyan-tint" },
  // Single-colour contexts (print, a coloured chip): the whole lockup inherits currentColor.
  mono: { name: "text-current", iq: "text-current" },
};

export function Wordmark({
  variant = "primary",
  height,
  className = "",
}: {
  variant?: WordmarkVariant;
  /** Cap height in px. OMIT it to size the lockup from `className` instead — which is how the site
   *  header gets a responsive mark (19px on a phone, 22px above it); an inline font-size would win
   *  over a Tailwind text-* utility and freeze it at one size. */
  height?: number;
  className?: string;
}) {
  const tone = TONE[variant];
  return (
    <span
      className={`font-display font-semibold leading-none tracking-[-0.03em] ${tone.name} ${className}`}
      style={height ? { fontSize: `${Math.round(height * FONT_SCALE)}px` } : undefined}
    >
      {/* One accessible name for the lockup; the two spans are presentation. */}
      <span className="sr-only">HyprrIQ</span>
      <span aria-hidden>
        Hyprr<span className={tone.iq}>IQ</span>
      </span>
    </span>
  );
}
