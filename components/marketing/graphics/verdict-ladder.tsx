import { VERDICT_COPY, VERDICT_SCALE_ORDER, CHIP_DEFS } from "@/lib/content/reportCopy";
import { verdicts } from "@/lib/content/help";
import { VERDICT_PALETTE, VERDICT_CLASSES } from "@/lib/design/palette";

/**
 * THE VERDICT LADDER — a ranked ladder, not four cards side by side.
 *
 * WHY THE SHAPE MATTERS. Side-by-side implies alternatives you choose between. A ladder implies
 * severity, which is what the scale actually is: level 4 is not a different flavour of level 1, it
 * is further down the same scale. The rungs widen as the level rises, so the shape carries the
 * ranking even before the numbers are read.
 *
 * THIS IS THE ONE GRAPHIC WHERE WARM HUES ARE CORRECT AND REQUIRED — it is the verdict scale itself.
 * Every colour comes out of VERDICT_PALETTE, the same registry the report and the portal read, so
 * this page and a client's actual report can never disagree about what a verdict looks like. The
 * hand-written map that used to live on this page had three of its four entries wrong, on the page
 * whose entire job is teaching a client to read the verdict. That is why nothing here is a literal.
 *
 * THE CERTAINTY CHIPS STAY NEUTRAL INK, deliberately. Verified and Assessed describe EVIDENCE
 * QUALITY, not the supplier — giving them verdict colour would be a fifth and sixth verdict on a
 * four-level scale.
 *
 * Two forms, one source: drawn above `md`, stacked below it.
 */

const RUNG_H = 82;
const GAP = 12;
const PAD = 16;
const VIEW_W = 900;
const VIEW_H = PAD * 2 + VERDICT_SCALE_ORDER.length * RUNG_H + (VERDICT_SCALE_ORDER.length - 1) * GAP;

const ALT = `The ${VERDICT_SCALE_ORDER.length} verdict levels as a ladder, from ${VERDICT_COPY[VERDICT_SCALE_ORDER[0]].name} at level 1 to ${VERDICT_COPY[VERDICT_SCALE_ORDER[VERDICT_SCALE_ORDER.length - 1]].name} at level ${VERDICT_SCALE_ORDER.length}.`;

/** Each rung is wider than the one above it. The widest reaches the full box; the narrowest is 78%. */
function rungWidth(index: number): number {
  const usable = VIEW_W - PAD * 2;
  const narrowest = 0.78;
  const step = (1 - narrowest) / Math.max(1, VERDICT_SCALE_ORDER.length - 1);
  return usable * (narrowest + step * index);
}

export function VerdictLadder({ className = "" }: { className?: string }) {
  return (
    <figure className={className}>
      {/* ── drawn form, md and up ────────────────────────────────────────────────────────── */}
      <div className="hidden md:block">
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="img" aria-label={ALT} className="block h-auto w-full">
          {VERDICT_SCALE_ORDER.map((key, i) => {
            const v = VERDICT_COPY[key];
            const { ink, bg } = VERDICT_PALETTE[key];
            const help = verdicts.find((h) => h.key === key);
            const y = PAD + i * (RUNG_H + GAP);
            return (
              <g key={key}>
                <rect x={PAD} y={y} width={rungWidth(i)} height={RUNG_H} rx="10" fill={bg} />
                <text
                  x={PAD + 24}
                  y={y + 28}
                  fontSize="10.5"
                  fontWeight="500"
                  letterSpacing="1.45"
                  fill={ink}
                  opacity="0.85"
                  className="font-mono uppercase"
                >
                  Level {v.level} of {VERDICT_SCALE_ORDER.length}
                </text>
                <text
                  x={PAD + 24}
                  y={y + 56}
                  fontSize="23"
                  fontWeight="500"
                  letterSpacing="-0.46"
                  fill={ink}
                  className="font-display"
                >
                  {v.name}
                </text>
                {help && (
                  <text x={PAD + 324} y={y + 47} fontSize="14" fill="var(--color-ink-2)">
                    {help.action.replace(/^→\s*/, "")}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── stacked form, below md. The width cue does not survive a phone, so the rung carries
             its level number as text and the fill still carries the hue. ────────────────── */}
      <ol className="space-y-2.5 md:hidden">
        {VERDICT_SCALE_ORDER.map((key) => {
          const v = VERDICT_COPY[key];
          const c = VERDICT_CLASSES[key];
          const help = verdicts.find((h) => h.key === key);
          return (
            <li key={key} className={`rounded-card-lg p-4 ${c.bg}`}>
              <p className={`font-mono text-[10.5px] uppercase tracking-[0.14em] ${c.ink} opacity-85`}>
                Level {v.level} of {VERDICT_SCALE_ORDER.length}
              </p>
              <p className={`mt-1.5 font-display text-[21px] leading-tight tracking-[-0.02em] ${c.ink}`}>
                {v.name}
              </p>
              {help && (
                <p className="mt-2 text-[15px] leading-[1.5] text-ink-2">
                  {help.action.replace(/^→\s*/, "")}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {/* The certainty chips sit BESIDE the ladder, in neutral ink. See the note above. */}
      <figcaption className="mt-4 rounded-card border border-line bg-surface p-4">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">
          And, separately, how certain we are
        </p>
        <dl className="mt-2.5 space-y-2">
          {(["verified", "assessed"] as const).map((chip) => (
            <div key={chip} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <dt className="rounded-chip border border-line bg-subtle px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink">
                {chip}
              </dt>
              <dd className="flex-1 text-[14px] leading-[1.5] text-ink-2">{CHIP_DEFS[chip]}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[13.5px] text-muted">
          Certainty is about the quality of the evidence, not about the supplier — which is why these
          two carry no verdict colour.
        </p>
      </figcaption>
    </figure>
  );
}
