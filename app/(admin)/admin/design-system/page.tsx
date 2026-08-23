import { requireAdmin } from "@/lib/data/admin";
import { VerdictBadge, VERDICTS, type Verdict } from "@/components/marketing/verdict-badge";
import { VERDICT_COPY, VERDICT_SCALE_ORDER } from "@/lib/content/reportCopy";
import { ratio } from "@/lib/design/contrast";
import { NEUTRAL, BRAND, ACCENT, ON_DARK, FOCUS, MOTION, VERDICT_PALETTE } from "@/lib/design/palette";

export const metadata = { title: "Design system — HyprrIQ admin" };

// ── THE COMPONENT SHEET (sitting one deliverable, 2026-08-24) ─────────────────────────────────
//
// WHY IT IS A ROUTE AND NOT AN HTML FILE: a component sheet that renders its own copy of the
// system is a picture of the system, and it starts lying the first time a token moves. This page
// imports the real tokens and the real components, so it cannot drift — if a swatch here is wrong,
// the product is wrong in the same way.
//
// WHY EVERY NUMBER IS COMPUTED: every contrast claim this project has made lived in a comment, and
// three of them were false. `ratio()` runs at render. Nothing below is a number a human typed.
//
// WHY IT LIVES UNDER /admin: it is operator tooling, and /admin already enforces the boundary. The
// launch URL map is closed — a public /design-system route would be an invented one.

const FLOOR = 4.5;
const NON_TEXT = 3;

function Ratio({ fg, bg, floor = FLOOR }: { fg: string; bg: string; floor?: number }) {
  const r = ratio(fg, bg);
  const ok = r >= floor;
  return (
    <span
      className={`font-mono text-[11px] ${ok ? "text-clear-ink" : "text-deny-ink"}`}
      title={`${fg} on ${bg} — floor ${floor}:1`}
    >
      {ok ? "✓" : "✕"} {r.toFixed(2)}:1
    </span>
  );
}

function Section({ n, title, note, children }: { n: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-8">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[11px] tracking-[0.14em] text-muted">{n}</span>
        <h2 className="font-display text-[26px] text-ink">{title}</h2>
      </div>
      {note && <p className="mt-2 max-w-[70ch] text-[14px] leading-relaxed text-ink-2">{note}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Swatch({ name, hex, on, floor = FLOOR }: { name: string; hex: string; on: [string, string][]; floor?: number }) {
  return (
    <div className="rounded-card border border-line bg-surface">
      <div className="h-14 rounded-t-card border-b border-line" style={{ background: hex }} />
      <div className="p-3">
        <div className="text-[13px] font-semibold text-ink">{name}</div>
        <div className="font-mono text-[11px] text-muted">{hex.toUpperCase()}</div>
        <div className="mt-2 space-y-0.5">
          {on.map(([label, bg]) => (
            <div key={label} className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted">{label}</span>
              <Ratio fg={hex} bg={bg} floor={floor} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const GROUNDS: [string, string][] = [
  ["surface", NEUTRAL.surface], ["base", NEUTRAL.base], ["subtle", NEUTRAL.subtle],
  ["mist", NEUTRAL.mist], ["pale", NEUTRAL.pale], ["sand", NEUTRAL.sand],
];

/** The four button/control states a static sheet can honestly show side by side. */
const STATES = ["Default", "Hover", "Active", "Disabled"] as const;

export default async function DesignSystemPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-[1180px] px-6 py-10">
      <header className="pb-8">
        <div className="font-mono text-[11px] tracking-[0.16em] text-muted">COMPONENT SHEET</div>
        <h1 className="mt-3 font-display text-[42px] text-ink">The design system, rendered</h1>
        <p className="mt-3 max-w-[70ch] text-[16px] leading-relaxed text-ink-2">
          Every swatch, badge and control below imports the same tokens the product does, and every
          contrast figure is computed at render by <code className="font-mono text-[13px]">lib/design/contrast.ts</code>.
          A green tick is a measured pass against the floor named in that block, not a claim.
          Values live in <code className="font-mono text-[13px]">lib/design/palette.ts</code>;{" "}
          <code className="font-mono text-[13px]">app/globals.css</code> mirrors them and{" "}
          <code className="font-mono text-[13px]">palette.lock.test.ts</code> fails the build if the two ever disagree.
        </p>
      </header>

      <div className="space-y-10">
        {/* ── 01 VERDICT ─────────────────────────────────────────────────────────────────── */}
        <Section
          n="01"
          title="The verdict ramp"
          note="Reserved. These eight values appear nowhere else in the system, ever — that separation is why the brand anchor could move from navy to petrol without touching a verdict. A badge label is 12–14px, so it is normal text and is held to 4.5:1, never the 3:1 large-text allowance."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {VERDICT_SCALE_ORDER.map((key) => {
              const v = VERDICT_PALETTE[key];
              const copy = VERDICT_COPY[key];
              return (
                <div key={key} className="rounded-card border border-line bg-surface p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-[11px] text-muted">LEVEL {copy.level} OF 4</span>
                    <span className="font-mono text-[11px] text-muted">{key}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <VerdictBadge verdict={v.token as Verdict} />
                    <VerdictBadge verdict={v.token as Verdict} size="sm" />
                  </div>

                  {/* the same ink with no fill — badges are not always filled */}
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <span className={`text-[14px] font-semibold ${VERDICTS[v.token as Verdict].ink}`}>
                      {copy.name} (unfilled)
                    </span>
                    <span
                      className="rounded-chip border px-2 py-0.5 text-[11px] font-semibold"
                      style={{ borderColor: v.ink, color: v.ink }}
                    >
                      outlined
                    </span>
                  </div>

                  <dl className="mt-4 space-y-1 border-t border-line pt-3">
                    <div className="flex items-center justify-between">
                      <dt className="font-mono text-[11px] text-muted">{v.ink} on {v.bg}</dt>
                      <dd><Ratio fg={v.ink} bg={v.bg} /></dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="font-mono text-[11px] text-muted">ink on --surface</dt>
                      <dd><Ratio fg={v.ink} bg={NEUTRAL.surface} /></dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="font-mono text-[11px] text-muted">ink on --base</dt>
                      <dd><Ratio fg={v.ink} bg={NEUTRAL.base} /></dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ── 02 NEUTRALS ────────────────────────────────────────────────────────────────── */}
        <Section
          n="02"
          title="Neutrals"
          note="Cool grey, near-zero chroma. --muted carries every caption and every 10.5–11px mono label, which are normal text — so it is measured against all six grounds, not just white."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Swatch name="--ink" hex={NEUTRAL.ink} on={GROUNDS.slice(0, 3)} />
            <Swatch name="--ink-2" hex={NEUTRAL.ink2} on={GROUNDS.slice(0, 3)} />
            <Swatch name="--muted" hex={NEUTRAL.muted} on={GROUNDS} />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {GROUNDS.map(([name, hex]) => (
              <div key={name} className="rounded-card border border-line bg-surface">
                <div className="h-12 rounded-t-card border-b border-line" style={{ background: hex }} />
                <div className="p-2.5">
                  <div className="text-[12px] font-semibold text-ink">--{name}</div>
                  <div className="font-mono text-[11px] text-muted">{hex.toUpperCase()}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-card border border-line bg-surface p-3">
              <div className="text-[13px] font-semibold text-ink">--line (decorative)</div>
              <div className="mt-2 border-t border-line pt-2 font-mono text-[11px] text-muted">
                {NEUTRAL.line} · {ratio(NEUTRAL.line, NEUTRAL.surface).toFixed(2)}:1 — exempt from 1.4.11
              </div>
            </div>
            <div className="rounded-card border border-line bg-surface p-3">
              <div className="text-[13px] font-semibold text-ink">--line-strong (decorative)</div>
              <div className="mt-2 border-t border-line-strong pt-2 font-mono text-[11px] text-muted">
                {NEUTRAL.lineStrong} · {ratio(NEUTRAL.lineStrong, NEUTRAL.surface).toFixed(2)}:1 — exempt
              </div>
            </div>
            <div className="rounded-card border border-control-border bg-surface p-3">
              <div className="text-[13px] font-semibold text-ink">--control-border</div>
              <div className="mt-2 flex items-center justify-between border-t border-control-border pt-2">
                <span className="font-mono text-[11px] text-muted">{NEUTRAL.controlBorder}</span>
                <Ratio fg={NEUTRAL.controlBorder} bg={NEUTRAL.surface} floor={NON_TEXT} />
              </div>
            </div>
          </div>
        </Section>

        {/* ── 03 BRAND + ACCENTS ─────────────────────────────────────────────────────────── */}
        <Section
          n="03"
          title="Brand and accents"
          note="Petrol anchors the brand; the four accents are wayfinding only. Cool hues may never mean a verdict, and the verdict hues never appear here — that is the whole organising rule, and it is what makes the two systems independent."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Swatch name="--anchor" hex={BRAND.anchor} on={[["base", NEUTRAL.base], ["surface", NEUTRAL.surface], ["brand-tint", BRAND.tint]]} />
            <Swatch name="--action" hex={BRAND.action} on={[["base", NEUTRAL.base], ["surface", NEUTRAL.surface], ["sand", NEUTRAL.sand]]} />
            <Swatch name="--brand-tint" hex={BRAND.tint} on={[["(ground for anchor)", BRAND.anchor]]} floor={NON_TEXT} />
            <Swatch name="--blue" hex={ACCENT.blue} on={[["base", NEUTRAL.base], ["blue-tint", ACCENT.blueTint]]} />
            <Swatch name="--cyan" hex={ACCENT.cyan} on={[["base", NEUTRAL.base], ["cyan-tint", ACCENT.cyanTint], ["hero grad", "#E4F0F1"]]} />
            <Swatch name="--plum" hex={ACCENT.plum} on={[["pale", NEUTRAL.pale], ["plum-tint", ACCENT.plumTint]]} />
            <Swatch name="--violet" hex={ACCENT.violet} on={[["sand", NEUTRAL.sand], ["violet-tint", ACCENT.violetTint]]} />
          </div>

          <div className="mt-4 rounded-card p-5" style={{ background: BRAND.anchor }} data-ground="dark">
            <div className="font-mono text-[11px] tracking-[0.14em]" style={{ color: ACCENT.cyanTint }}>
              ON THE DARK GROUND
            </div>
            <p className="mt-2 text-[15px]" style={{ color: ON_DARK.navFg }}>
              --nav-fg carries primary text on --anchor{" "}
              <span className="font-mono text-[11px]">({ratio(ON_DARK.navFg, BRAND.anchor).toFixed(2)}:1)</span>
            </p>
            <p className="mt-1 text-[14px]" style={{ color: ON_DARK.navFgDim }}>
              --nav-fg-dim carries secondary text{" "}
              <span className="font-mono text-[11px]">({ratio(ON_DARK.navFgDim, BRAND.anchor).toFixed(2)}:1)</span>
            </p>
            <button
              type="button"
              className="mt-4 rounded-control px-4 py-2 text-[14px] font-semibold"
              style={{ background: NEUTRAL.surface, color: BRAND.anchor }}
            >
              Tab to me — the ring switches to the dark-ground token
            </button>
          </div>
        </Section>

        {/* ── 04 CONTROLS ────────────────────────────────────────────────────────────────── */}
        <Section
          n="04"
          title="Controls, at every state"
          note="Hover and active are shown as forced visuals so they can be compared side by side; the last column in each row is genuinely interactive — tab to it for the real focus ring, press it for the scale(.97). Disabled controls are deliberately NOT held to 4.5:1 (WCAG exempts inactive controls) but are kept legible anyway."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line">
                  <th className="py-2 pr-4 text-[11px] font-semibold uppercase tracking-wide text-muted">Variant</th>
                  {STATES.map((s) => (
                    <th key={s} className="py-2 pr-4 text-[11px] font-semibold uppercase tracking-wide text-muted">{s}</th>
                  ))}
                  <th className="py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Live</th>
                </tr>
              </thead>
              <tbody className="align-middle">
                <tr className="border-b border-line">
                  <td className="py-3 pr-4 text-[13px] font-semibold text-ink">Primary</td>
                  <td className="py-3 pr-4"><span className="inline-flex rounded-control bg-action px-5 py-2.5 text-[15px] font-semibold text-white">Vet a supplier</span></td>
                  <td className="py-3 pr-4"><span className="inline-flex rounded-control bg-anchor px-5 py-2.5 text-[15px] font-semibold text-white">Vet a supplier</span></td>
                  <td className="py-3 pr-4"><span className="inline-flex scale-[.97] rounded-control bg-anchor px-5 py-2.5 text-[15px] font-semibold text-white">Vet a supplier</span></td>
                  <td className="py-3 pr-4"><span className="inline-flex cursor-not-allowed rounded-control bg-action/40 px-5 py-2.5 text-[15px] font-semibold text-white">Vet a supplier</span></td>
                  <td className="py-3"><button type="button" className="rounded-control bg-action px-5 py-2.5 text-[15px] font-semibold text-white transition hover:bg-anchor">Press me</button></td>
                </tr>
                <tr className="border-b border-line">
                  <td className="py-3 pr-4 text-[13px] font-semibold text-ink">Secondary</td>
                  <td className="py-3 pr-4"><span className="inline-flex rounded-control border border-control-border bg-surface px-5 py-2.5 text-[15px] font-semibold text-anchor">See a report</span></td>
                  <td className="py-3 pr-4"><span className="inline-flex rounded-control border border-control-border bg-subtle px-5 py-2.5 text-[15px] font-semibold text-anchor">See a report</span></td>
                  <td className="py-3 pr-4"><span className="inline-flex scale-[.97] rounded-control border border-control-border bg-subtle px-5 py-2.5 text-[15px] font-semibold text-anchor">See a report</span></td>
                  <td className="py-3 pr-4"><span className="inline-flex cursor-not-allowed rounded-control border border-line bg-surface px-5 py-2.5 text-[15px] font-semibold text-muted">See a report</span></td>
                  <td className="py-3"><button type="button" className="rounded-control border border-control-border bg-surface px-5 py-2.5 text-[15px] font-semibold text-anchor transition hover:bg-subtle">Press me</button></td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 text-[13px] font-semibold text-ink">Text link</td>
                  <td className="py-3 pr-4"><span className="text-[15px] font-semibold text-action">Read the method →</span></td>
                  <td className="py-3 pr-4"><span className="text-[15px] font-semibold text-anchor underline">Read the method →</span></td>
                  <td className="py-3 pr-4"><span className="text-[15px] font-semibold text-anchor underline">Read the method →</span></td>
                  <td className="py-3 pr-4"><span className="text-[15px] font-semibold text-muted">Read the method →</span></td>
                  <td className="py-3"><a href="#top" className="text-[15px] font-semibold text-action underline-offset-4 transition hover:text-anchor hover:underline">Tab to me</a></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="ds-a" className="block text-[12px] font-semibold text-ink-2">Field — default</label>
              <input id="ds-a" placeholder="Example Trading LLC" className="mt-1.5 w-full rounded-field border border-control-border bg-surface px-3 py-2 text-[14px] text-ink placeholder:text-muted" />
              <p className="mt-1 font-mono text-[11px] text-muted">
                placeholder {ratio(NEUTRAL.muted, NEUTRAL.surface).toFixed(2)}:1 — held to 4.5, not the grey default
              </p>
            </div>
            <div>
              <label htmlFor="ds-b" className="block text-[12px] font-semibold text-ink-2">Field — error</label>
              <input id="ds-b" defaultValue="not-a-domain" aria-invalid className="mt-1.5 w-full rounded-field border-2 border-deny-ink bg-surface px-3 py-2 text-[14px] text-ink" />
              <p className="mt-1 text-[12px] text-deny-ink">Enter a full web address, like exampletrading.com</p>
            </div>
            <div>
              <label htmlFor="ds-c" className="block text-[12px] font-semibold text-muted">Field — disabled</label>
              <input id="ds-c" disabled defaultValue="Locked while the case runs" className="mt-1.5 w-full cursor-not-allowed rounded-field border border-line bg-subtle px-3 py-2 text-[14px] text-muted" />
            </div>
          </div>
        </Section>

        {/* ── 05 STATUS ──────────────────────────────────────────────────────────────────── */}
        <Section
          n="05"
          title="Status tags"
          note="A status is not a verdict. These use cool accents and neutrals so that green, amber, orange and red keep meaning exactly one thing anywhere a client looks."
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-chip bg-blue-tint px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-blue">Researching</span>
            <span className="rounded-chip bg-subtle px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted">Queued</span>
            <span className="rounded-chip bg-cyan-tint px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-cyan">Coming soon</span>
            <span className="rounded-chip bg-brand-tint px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-anchor">Delivered</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {([["Researching", ACCENT.blue, ACCENT.blueTint], ["Queued", NEUTRAL.muted, NEUTRAL.subtle], ["Coming soon", ACCENT.cyan, ACCENT.cyanTint], ["Delivered", BRAND.anchor, BRAND.tint]] as const).map(([label, fg, bg]) => (
              <div key={label} className="flex items-center justify-between rounded-card border border-line bg-surface px-3 py-2">
                <span className="text-[12px] text-muted">{label}</span>
                <Ratio fg={fg} bg={bg} />
              </div>
            ))}
          </div>
        </Section>

        {/* ── 06 TYPE ────────────────────────────────────────────────────────────────────── */}
        <Section
          n="06"
          title="Typography"
          note="Newsreader on h1/h2; Inter with cv11 + ss03 for everything else, which gives a single-storey a and a disambiguated l/I — small, and it matters when someone is reading a case ID carefully. IBM Plex Mono for data. Inter stays off headings: Inter at display size is the look this palette exists to avoid."
        >
          <div className="space-y-4 rounded-card border border-line bg-surface p-6">
            <div>
              <span className="font-mono text-[11px] text-muted">H1 · Newsreader 500 · 60/29–32px</span>
              <h1 className="text-[clamp(29px,4.8vw,60px)] text-ink">Know who you&apos;re buying from</h1>
            </div>
            <div>
              <span className="font-mono text-[11px] text-muted">H2 · Newsreader 500 · 46/24–26px</span>
              <h2 className="text-[clamp(24px,3.7vw,46px)] text-ink">Five areas. Each states its own limit.</h2>
            </div>
            <div>
              <span className="font-mono text-[11px] text-muted">H3 · Inter 650 · 20/17px</span>
              <h3 className="text-[20px] text-ink">Does this business actually exist?</h3>
            </div>
            <div>
              <span className="font-mono text-[11px] text-muted">Body · Inter 400 · 17/16px · cv11 ss03</span>
              <p className="max-w-[70ch] text-[17px] leading-relaxed text-ink-2">
                Illegible lookalikes are the test: Il1 · O0 · rn/m · a. Body is 16px minimum on web,
                sentence case, and never pure black — ink is softer and pairs cleanly with every accent.
              </p>
            </div>
            <div>
              <span className="font-mono text-[11px] text-muted">Data · IBM Plex Mono 400/500 · case ids, figures</span>
              <p className="font-mono text-[14px] text-ink tnum">AWI-SAMPLE-001 · 24h · $99 · 3 of 5</p>
            </div>
            <div>
              <span className="font-mono text-[11px] text-muted">Caption · 13–14px</span>
              <p className="text-[13px] text-muted">Masked demonstration. Case reference is illustrative.</p>
            </div>
          </div>
        </Section>

        {/* ── 07 SURFACES ────────────────────────────────────────────────────────────────── */}
        <Section n="07" title="Surfaces and radius" note="Two card radii by register: 10px stays on the dense operator and portal surfaces, 14px is the marketing card. Controls are 8px, fields 7px, chips 5px.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {([["rounded-chip", "5px"], ["rounded-field", "7px"], ["rounded-control", "8px"], ["rounded-card", "10px — operator/portal"], ["rounded-card-lg", "14px — marketing"]] as const).map(([cls, label]) => (
              <div key={cls} className={`${cls} border border-line bg-surface p-4`}>
                <div className="text-[13px] font-semibold text-ink">{cls}</div>
                <div className="font-mono text-[11px] text-muted">{label}</div>
              </div>
            ))}
            <div className="rounded-card-lg border border-line bg-surface p-4 shadow-[0_22px_52px_-30px_rgba(0,61,72,.32)]">
              <div className="text-[13px] font-semibold text-ink">Lifted card</div>
              <div className="font-mono text-[11px] text-muted">the one elevation in the system</div>
            </div>
          </div>
        </Section>

        {/* ── 08 MOTION ──────────────────────────────────────────────────────────────────── */}
        <Section
          n="08"
          title="Motion"
          note="Two curves, three durations. The browser's own ease / ease-in-out / linear are banned, so Tailwind's transition defaults are overridden at the token layer — a bare `transition` anywhere in the codebase is already on-system. Hover a row to see its curve. Nothing on this page animates on its own, and nothing in the operator console ever does."
        >
          <div className="space-y-2">
            {([
              ["--ease-entrance", MOTION.easeEntrance, "entrances, expansions, reveals"],
              ["--ease-position", MOTION.easePosition, "position changes"],
            ] as const).map(([name, curve, use]) => (
              <div key={name} className="group flex items-center gap-4 rounded-card border border-line bg-surface p-3">
                <div className="w-40 shrink-0">
                  <div className="font-mono text-[11px] text-ink">{name}</div>
                  <div className="text-[11px] text-muted">{use}</div>
                </div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-subtle">
                  <div
                    className="h-full w-6 rounded-full bg-action transition-transform group-hover:translate-x-[calc(100%*11)]"
                    style={{ transitionDuration: MOTION.durSlow, transitionTimingFunction: curve }}
                  />
                </div>
                <code className="w-[188px] shrink-0 font-mono text-[10px] text-muted">{curve}</code>
              </div>
            ))}
            <div className="grid gap-2 sm:grid-cols-3">
              {([["--dur-fast", MOTION.durFast, "hover, focus, press"], ["--dur-base", MOTION.durBase, "dropdowns, popovers"], ["--dur-slow", MOTION.durSlow, "page-level, scroll-triggered"]] as const).map(([n2, d, use]) => (
                <div key={n2} className="rounded-card border border-line bg-surface p-3">
                  <div className="font-mono text-[11px] text-ink">{n2} · {d}</div>
                  <div className="text-[11px] text-muted">{use}</div>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-[13px] text-muted">
            Under <code className="font-mono">prefers-reduced-motion</code> every one of these resolves to a
            legible static state, never a broken one — reveals ship visible by default and the client
            component arms the hidden state on mount, so no-JS and headless renders keep their content.
          </p>
        </Section>

        {/* ── 09 FOCUS ───────────────────────────────────────────────────────────────────── */}
        <Section
          n="09"
          title="The focus ring is contextual"
          note="No single hue clears 3:1 on both a white card and the petrol section — cyan measures 5.24:1 on surface and 2.30:1 on anchor. So the ground redefines the token and the control inherits the right ring, rather than someone having to remember. Tab through both panels."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-card border border-line bg-surface p-5">
              <div className="font-mono text-[11px] text-muted">LIGHT GROUND · --color-focus = --cyan</div>
              <button type="button" className="mt-3 rounded-control border border-control-border bg-surface px-4 py-2 text-[14px] font-semibold text-anchor">Tab to me</button>
              <div className="mt-3"><Ratio fg={FOCUS.onLight} bg={NEUTRAL.surface} floor={NON_TEXT} /></div>
            </div>
            <div className="rounded-card p-5" style={{ background: BRAND.anchor }} data-ground="dark">
              <div className="font-mono text-[11px]" style={{ color: ON_DARK.navFgDim }}>DARK GROUND · --color-focus = --cyan-tint</div>
              <button type="button" className="mt-3 rounded-control px-4 py-2 text-[14px] font-semibold" style={{ background: "transparent", color: ON_DARK.navFg, border: `1px solid ${ON_DARK.navFgDim}` }}>Tab to me</button>
              <div className="mt-3"><Ratio fg={FOCUS.onDark} bg={BRAND.anchor} floor={NON_TEXT} /></div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
