import { VERDICT_COPY } from "@/lib/content/reportCopy";
import { VERDICT_PALETTE } from "@/lib/design/palette";
import { CASE_SLA_HOURS } from "@/lib/constants/plans";

/**
 * The spec's `.flowvis` — one supplier name goes in, one written report comes back.
 *
 * It is a DIAGRAM OF THE SHAPE OF THE SERVICE, not a screenshot: every line of copy inside it is a
 * grey bar, because the point is "one thing in, one thing out" and legible fake findings would be
 * fabricated evidence about a business. The only real words in it are the verdict name and the
 * turnaround, and both are read from the same constants the rest of the page reads.
 *
 * COLOUR COMES FROM THE VERDICT REGISTRY. The warm pair on the report header is the actual
 * `verify_before_purchase` ink and tint out of `VERDICT_PALETTE`, so a change to the registry moves
 * this graphic with it and the two can never disagree. Warm here is correct — it IS a verdict.
 *
 * THE VERDICT TEXT RENDERS AT 9.5 USER UNITS in a 320-wide box — roughly 9.5px on screen, below
 * anything else on the site. RAISED AND RULED TO STAY, 2026-08-25. It is not a control, the graphic
 * carries an `aria-label` stating the same thing in words, and the stacked mobile form covers the
 * small-screen case, so NOTHING IS AVAILABLE ONLY AT THAT SIZE. That last clause is the whole test —
 * a future session enlarging this "for accessibility" would be changing a ruled size for no gain.
 */
export function FlowVisual({ className = "" }: { className?: string }) {
  const verdict = VERDICT_COPY.verify_before_purchase.name;
  const { ink, bg } = VERDICT_PALETTE.verify_before_purchase;

  return (
    <svg
      viewBox="0 0 320 120"
      role="img"
      aria-label={`One supplier name goes in. ${CASE_SLA_HOURS} hours later one written report comes back, carrying a single verdict — in this masked demonstration, ${verdict}.`}
      className={`h-auto w-full max-w-[320px] ${className}`}
    >
      {/* what goes in */}
      <rect x="4" y="26" width="108" height="68" rx="8" fill="var(--color-surface)" stroke="var(--color-line)" />
      <text
        x="18"
        y="46"
        fontSize="8"
        letterSpacing="1.2"
        fill="var(--color-muted)"
        className="font-mono"
      >
        SUPPLIER
      </text>
      <rect x="18" y="54" width="76" height="7" rx="3" fill="var(--color-subtle)" />
      <rect x="18" y="67" width="56" height="7" rx="3" fill="var(--color-subtle)" />
      <rect x="18" y="80" width="66" height="7" rx="3" fill="var(--color-action)" opacity="0.85" />

      {/* the wait, named */}
      <path d="M126 60 L186 60" stroke="var(--color-line-strong)" strokeWidth="1.5" strokeDasharray="4 4" />
      <path d="M180 55 L188 60 L180 65 Z" fill="var(--color-line-strong)" />
      <text
        x="140"
        y="50"
        fontSize="7.5"
        letterSpacing="1"
        fill="var(--color-muted)"
        className="font-mono"
      >
        {CASE_SLA_HOURS} HRS
      </text>

      {/* what comes back */}
      <rect x="200" y="12" width="116" height="96" rx="8" fill="var(--color-surface)" stroke="var(--color-line)" />
      <rect x="200" y="12" width="116" height="26" rx="8" fill={bg} />
      <rect x="200" y="30" width="116" height="8" fill={bg} />
      <text x="210" y="29" fontSize="9.5" fill={ink}>
        {verdict}
      </text>
      <rect x="212" y="50" width="82" height="6" rx="3" fill="var(--color-subtle)" />
      <rect x="212" y="62" width="92" height="6" rx="3" fill="var(--color-subtle)" />
      <rect x="212" y="74" width="70" height="6" rx="3" fill="var(--color-subtle)" />
      <rect x="212" y="88" width="88" height="6" rx="3" fill="var(--color-cyan-tint)" />
    </svg>
  );
}
