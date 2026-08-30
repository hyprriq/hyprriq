import { CHECKABLE, CANNOT, BOUNDARY_CLOSING } from "@/lib/content/methodBoundary";

/**
 * THE BOUNDARY — what can be checked before you pay, and what sits outside anyone's reach.
 *
 * The honest shape of the problem, drawn. It makes the refusals read as rigour rather than hedging,
 * and the right-hand column is the strongest argument for the left one: a reader who sees what is
 * genuinely unreachable understands why the reachable list is worth paying for.
 *
 * ⚠ COOL ACCENTS BOTH SIDES, AND THAT IS THE WHOLE DESIGN DECISION. The right column is not red. It
 * is a boundary, not a warning — nothing on it is a finding about a supplier, and warm hues on this
 * site mean a verdict. Colouring it red would turn "we cannot see this" into "this is bad", which is
 * the opposite of what the page says.
 *
 * Both columns are DERIVED, not written here — the left from the assessment areas, the right from
 * the same four structural limits /method publishes in prose. See methodBoundary.ts.
 *
 * Two forms, one source: drawn above `md`, stacked below it, because 14px in a 900-wide viewBox is
 * about 5.6px on a 360px phone.
 */

const ALT = `Two columns divided by a line. On the left, ${CHECKABLE.length} things that can be checked before you pay. On the right, ${CANNOT.length} that sit outside anyone's reach.`;

const ROW_H = 46;
const TOP = 92;
const HEIGHT = 400;

/** Wrap a drawn line at a width the column can hold. SVG text does not wrap on its own. */
function wrap(text: string, max: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > max && line) {
      lines.push(line.trim());
      line = w;
    } else {
      line = (line + " " + w).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function CheckableBoundary({ className = "" }: { className?: string }) {
  const rightTop = TOP;
  const rightGap = 58;

  return (
    <figure className={className}>
      {/* ── drawn form, md and up ────────────────────────────────────────────────────────── */}
      <div className="hidden overflow-hidden rounded-card-lg border border-line bg-surface p-5 md:block lg:p-7">
        <svg viewBox={`0 0 900 ${HEIGHT}`} role="img" aria-label={ALT} className="block h-auto w-full">
          <rect x="16" y="16" width="418" height={HEIGHT - 32} rx="12" fill="var(--color-cyan-tint)" opacity="0.45" />
          <rect x="466" y="16" width="418" height={HEIGHT - 32} rx="12" fill="var(--color-subtle)" opacity="0.7" />

          <text x="44" y="52" fontSize="10.5" fontWeight="500" letterSpacing="1.25" fill="var(--color-cyan)" className="font-mono uppercase">
            Checkable before you pay
          </text>
          <text x="494" y="52" fontSize="10.5" fontWeight="500" letterSpacing="1.25" fill="var(--color-muted)" className="font-mono uppercase">
            Outside anyone&apos;s reach
          </text>

          {CHECKABLE.map((c, i) => {
            const y = TOP + i * ROW_H;
            const lines = wrap(c.line, 44);
            return (
              <g key={c.key}>
                <circle cx="48" cy={y - 5} r="3.5" fill="var(--color-cyan)" />
                {lines.map((line, j) => (
                  <text key={line} x="68" y={y + j * 18} fontSize="14" fill={j === 0 ? "var(--color-ink-2)" : "var(--color-muted)"}>
                    {line}
                  </text>
                ))}
              </g>
            );
          })}

          {/* the line itself — dashed, because it is a limit of knowledge and not a wall */}
          <line x1="450" y1="40" x2="450" y2={HEIGHT - 40} stroke="var(--color-line-strong)" strokeWidth="1.5" strokeDasharray="6 5" />

          {CANNOT.map((c, i) => {
            const y = rightTop + i * rightGap;
            const lines = wrap(c.short, 42);
            return (
              <g key={c.t}>
                <circle cx="498" cy={y - 5} r="3.5" fill="var(--color-muted)" />
                {lines.map((line, j) => (
                  <text key={line} x="518" y={y + j * 18} fontSize="14" fill={j === 0 ? "var(--color-ink-2)" : "var(--color-muted)"}>
                    {line}
                  </text>
                ))}
              </g>
            );
          })}

          <text x="498" y={HEIGHT - 54} fontSize="14" fontStyle="italic" fill="var(--color-muted)">
            {BOUNDARY_CLOSING}
          </text>
        </svg>
        <p className="mt-4 border-t border-dashed border-line pt-3.5 font-mono text-[11px] uppercase tracking-[0.06em] text-muted">
          Cool accents both sides — the right column is a boundary, not a warning
        </p>
      </div>

      {/* ── stacked form, below md ───────────────────────────────────────────────────────── */}
      <div className="grid gap-3 md:hidden">
        <div className="rounded-card-lg border border-line bg-cyan-tint/50 p-4">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-cyan">
            Checkable before you pay
          </p>
          <ul className="mt-3 space-y-2.5">
            {CHECKABLE.map((c) => (
              <li key={c.key} className="flex gap-2.5 text-[15px] leading-[1.5] text-ink-2">
                <span className="mt-[7px] h-[7px] w-[7px] flex-none rounded-full bg-cyan" aria-hidden />
                {c.line}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-card-lg border border-line bg-subtle p-4">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">
            Outside anyone&apos;s reach
          </p>
          <ul className="mt-3 space-y-2.5">
            {CANNOT.map((c) => (
              <li key={c.t} className="flex gap-2.5 text-[15px] leading-[1.5] text-ink-2">
                <span className="mt-[7px] h-[7px] w-[7px] flex-none rounded-full bg-muted" aria-hidden />
                {c.short}
              </li>
            ))}
          </ul>
          <p className="mt-3.5 text-[14px] italic text-muted">{BOUNDARY_CLOSING}</p>
        </div>
      </div>
    </figure>
  );
}
