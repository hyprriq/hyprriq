import { PINNED_FIELDS, LISTED_FIELDS, DOCUMENT_FIELD_COUNT } from "@/lib/content/documentFields";

/**
 * THE MASKED INVOICE — the highest-value graphic on the site, and the only place where showing the
 * work beats describing it. "A fourteen-point read" means nothing until someone sees the points.
 *
 * WHAT IT DELIBERATELY DOES NOT DO:
 *  · No pin says a field is WRONG. Every callout says what is CHECKED. The product rests on
 *    "absence of evidence is never fraud", and a graphic that pointed at a field and implied
 *    tampering would contradict the thing it is illustrating.
 *  · No values. Supplier and buyer names, addresses, product names and every number are grey bars.
 *    The STRUCTURE is the content — a reader needs to see where on a document each field lives, not
 *    what it says. It also means there is no invented business anywhere in it.
 *  · Cool and neutral only. The pins are `--action`, not a verdict colour; a red pin on an invoice
 *    field would be a verdict hue doing decoration.
 *
 * TWO FORMS, ONE SOURCE. At 360px a 900-wide viewBox renders 13px text at about 5px, so the drawn
 * version is desktop-only and a stacked list takes over below `md`. Both read the same arrays out of
 * documentFields.ts, so they cannot say different things, and only one is in the accessibility tree
 * at a time because the other is `display:none`.
 */

const ALT = `A wholesale invoice with ${PINNED_FIELDS.length} fields marked: ${PINNED_FIELDS.map((f) => f.name.toLowerCase()).join(", ")}. ${LISTED_FIELDS.length} further fields are checked on every document.`;

/** Pin positions on the drawn document, in viewBox units. Index-matched to PINNED_FIELDS. */
const PINS = [
  { x: 30, y: 117, leader: [410, 117, 452, 88], callout: 84 },
  { x: 234, y: 117, leader: [410, 140, 452, 152], callout: 148 },
  { x: 30, y: 203, leader: [410, 205, 452, 216], callout: 212 },
  { x: 30, y: 292, leader: [410, 292, 452, 280], callout: 276 },
  { x: 230, y: 292, leader: [410, 310, 452, 344], callout: 340 },
  { x: 30, y: 470, leader: [410, 470, 452, 408], callout: 404 },
];

/**
 * X positions for the three columns of listed fields. NOT evenly spaced: the third column holds the
 * shortest names, so it starts later without running past the rule line at 884. An even 220-unit
 * step put the last two names outside the viewBox entirely — measured, then fixed.
 */
const LISTED_COLUMNS = [452, 664, 778];

/** The one long callout wraps; the rest are single lines. Split on the em dash the copy already has. */
function calloutLines(callout: string): string[] {
  const i = callout.indexOf("—");
  if (i === -1 || callout.length < 46) return [callout];
  return [callout.slice(0, i).trim(), callout.slice(i).trim()];
}

export function MaskedInvoice({ className = "" }: { className?: string }) {
  return (
    <figure className={className}>
      {/* ── drawn form, md and up ────────────────────────────────────────────────────────── */}
      <div className="hidden overflow-hidden rounded-card-lg border border-line bg-surface p-5 md:block lg:p-7">
        <svg viewBox="0 0 900 560" role="img" aria-label={ALT} className="block h-auto w-full">
          {/* the document */}
          <rect x="16" y="16" width="392" height="528" rx="8" fill="var(--color-surface)" stroke="var(--color-line)" strokeWidth="1" />
          <rect x="17" y="17" width="390" height="62" fill="var(--color-subtle)" />
          <Label x={36} y={41}>Commercial invoice</Label>
          <Mask x={36} y={52} w={150} h={11} />
          <Mask x={300} y={52} w={88} h={11} />

          <Label x={36} y={102}>Supplier</Label>
          <Mask x={36} y={112} w={168} h={11} />
          <Mask x={36} y={130} w={124} h={9} />
          <Mask x={36} y={145} w={140} h={9} />

          <Label x={240} y={102}>Invoice</Label>
          <Mask x={240} y={112} w={88} h={11} />
          <Mask x={240} y={130} w={70} h={9} />

          <Label x={36} y={188}>Bill to</Label>
          <Mask x={36} y={198} w={150} h={11} />
          <Mask x={36} y={216} w={118} h={9} />

          <line x1="36" y1="248" x2="388" y2="248" stroke="var(--color-line)" strokeWidth="1" />
          <Label x={36} y={266}>Description</Label>
          <Label x={236} y={266}>Code</Label>
          <Label x={330} y={266}>Qty</Label>
          <line x1="36" y1="276" x2="388" y2="276" stroke="var(--color-line)" strokeWidth="1" />
          {[288, 310, 332].map((y, i) => (
            <g key={y}>
              <Mask x={36} y={y} w={[176, 152, 168][i]} h={9} />
              <Mask x={236} y={y} w={72} h={9} />
              <Mask x={330} y={y} w={30} h={9} />
            </g>
          ))}
          <line x1="36" y1="358" x2="388" y2="358" stroke="var(--color-line)" strokeWidth="1" />
          <Mask x={268} y={372} w={120} h={11} />
          <Mask x={300} y={394} w={88} h={11} />

          {/* the zone pin 6 points at — a block of body text, where spacing anomalies show up */}
          <rect x="36" y="430" width="352" height="86" rx="6" fill="var(--color-subtle)" opacity="0.55" />
          <Mask x={52} y={448} w={200} h={8} />
          <Mask x={52} y={466} w={160} h={8} />
          <Mask x={52} y={484} w={184} h={8} />

          {/* pins, leaders and callouts — all three read the same array, in the same order */}
          {PINNED_FIELDS.map((field, i) => {
            const pin = PINS[i];
            const [x1, y1, x2, y2] = pin.leader;
            const lines = calloutLines(field.callout);
            return (
              <g key={field.key}>
                <Pin cx={pin.x} cy={pin.y} r={11} n={i + 1} />
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-line-strong)" strokeWidth="1" strokeDasharray="3 3" />
                <Pin cx={466} cy={pin.callout} r={10} n={i + 1} />
                <text x="484" y={pin.callout - 4} fontSize="13" fontWeight="600" fill="var(--color-ink)">
                  {field.name}
                </text>
                {lines.map((line, j) => (
                  <text key={line} x="484" y={pin.callout + 14 + j * 18} fontSize="13" fill="var(--color-ink-2)">
                    {line}
                  </text>
                ))}
              </g>
            );
          })}

          {/* the eight that are named rather than pinned */}
          <line x1="452" y1="462" x2="884" y2="462" stroke="var(--color-line)" strokeWidth="1" />
          <Label x={452} y={484}>
            And {LISTED_FIELDS.length} more on every document
          </Label>
          {LISTED_FIELDS.map((f, i) => (
            <text
              key={f.key}
              x={LISTED_COLUMNS[Math.floor(i / 3)]}
              y={504 + (i % 3) * 18}
              fontSize="12.5"
              fill="var(--color-muted)"
            >
              {f.name}
            </text>
          ))}
        </svg>
        <p className="mt-4 border-t border-dashed border-line pt-3.5 font-mono text-[11px] uppercase tracking-[0.06em] text-muted">
          Masked demonstration · structure shown, values removed
        </p>
      </div>

      {/* ── stacked form, below md. Same content, at a size a phone can read. ─────────────── */}
      <div className="rounded-card-lg border border-line bg-surface p-4 md:hidden">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">
          The {DOCUMENT_FIELD_COUNT}-point read
        </p>
        <ol className="mt-3 space-y-3">
          {PINNED_FIELDS.map((f, i) => (
            <li key={f.key} className="flex gap-3">
              <span
                className="mt-0.5 flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-action text-[11px] font-bold text-white"
                aria-hidden
              >
                {i + 1}
              </span>
              <span>
                <span className="block text-[15px] font-semibold text-ink">{f.name}</span>
                <span className="block text-[14px] leading-[1.5] text-ink-2">{f.callout}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 border-t border-line pt-3.5 text-[13px] font-semibold text-ink">
          And {LISTED_FIELDS.length} more on every document
        </p>
        <ul className="mt-2 space-y-1">
          {LISTED_FIELDS.map((f) => (
            <li key={f.key} className="text-[14px] text-ink-2">
              {f.name} — <span className="text-muted">{f.callout.toLowerCase()}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-dashed border-line pt-3 font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted">
          Masked demonstration · structure shown, values removed
        </p>
      </div>
    </figure>
  );
}

function Mask({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return <rect x={x} y={y} width={w} height={h} rx="3" fill="var(--color-subtle)" />;
}

function Label({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  return (
    <text
      x={x}
      y={y}
      fontSize="10"
      fontWeight="500"
      letterSpacing="0.9"
      fill="var(--color-muted)"
      className="font-mono uppercase"
    >
      {children}
    </text>
  );
}

/** A pin is `--action`, never a verdict colour. See the note at the top of this file. */
function Pin({ cx, cy, r, n }: { cx: number; cy: number; r: number; n: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill="var(--color-action)" />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#ffffff">
        {n}
      </text>
    </>
  );
}
