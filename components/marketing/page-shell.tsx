import Link from "next/link";

// ── THE SHELL FOR THE PROSE PAGES ─────────────────────────────────────────────────────────────
//
// Eleven of the thirteen launch pages are argument, not interface: /method, /what-we-dont-do,
// /security, /how-we-handle-your-data, /about, /contact, /faq and the rest. They share a shape, so
// they share these primitives rather than eleven near-copies drifting apart a padding value at a
// time.
//
// NO EYEBROW ABOVE EVERY SECTION. The homepage earns its numbered kickers — it IS a sequence, five
// numbered steps in order. Repeating a small tracked uppercase label above every section on every
// content page is scaffolding by reflex, and it reads as template. These pages carry their
// hierarchy in the headings themselves.
//
// MEASURE, NOT DECORATION: prose caps at 68ch. Past that the eye loses the line return, and these
// pages are read by someone deciding whether to trust the product.

export function PageHero({
  title,
  lede,
  ground = "base",
}: {
  title: string;
  lede?: string;
  ground?: "base" | "pale" | "mist" | "sand";
}) {
  const bg = { base: "bg-base", pale: "bg-pale", mist: "bg-mist", sand: "bg-sand" }[ground];
  return (
    <header className={`border-b border-line ${bg}`}>
      <div className="mx-auto max-w-[1180px] px-5 py-12 sm:py-20 lg:px-10">
        <h1 className="max-w-[20ch] text-ink">{title}</h1>
        {lede && (
          <p className="mt-4 max-w-[62ch] text-[17px] leading-[1.55] text-ink-2 sm:mt-5 sm:text-[19px] sm:leading-[1.58]">
            {lede}
          </p>
        )}
      </div>
    </header>
  );
}

/** A page section. `tone` picks the ground so long pages alternate instead of running flat. */
export function PageSection({
  children,
  tone = "surface",
  className = "",
  id,
}: {
  children: React.ReactNode;
  tone?: "surface" | "base" | "pale" | "mist" | "sand";
  className?: string;
  id?: string;
}) {
  const bg = {
    surface: "bg-surface", base: "bg-base", pale: "bg-pale", mist: "bg-mist", sand: "bg-sand",
  }[tone];
  return (
    <section id={id} className={`border-b border-line ${bg} ${className}`}>
      <div className="mx-auto max-w-[1180px] px-5 py-11 sm:py-16 lg:px-10">{children}</div>
    </section>
  );
}

/** Body copy at a readable measure. Headings inherit the ruled scale from globals.css. */
export function Prose({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`max-w-[68ch] text-[16px] leading-[1.65] text-ink-2 [&_a]:font-semibold [&_a]:text-action [&_a:hover]:text-anchor [&_b]:font-semibold [&_b]:text-ink [&_h2]:mt-9 [&_h2]:mb-3 [&_h2]:text-ink [&_h3]:mt-7 [&_h3]:mb-2 [&_h3]:text-ink [&_li]:mb-2 [&_p]:mb-4 [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 sm:text-[17px] ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * A stated limit, in body copy rather than a footnote. Every one of these is the product refusing
 * a claim, which is the load-bearing move on almost every page here — so it gets a treatment that
 * reads as part of the argument, not as fine print bolted underneath it.
 */
export function LimitNote({ label = "The limit:", children }: { label?: string; children: React.ReactNode }) {
  return (
    <p className="my-4 rounded-r-card border-l-2 border-cyan bg-cyan-tint px-4 py-3 text-[15px] leading-[1.6] text-ink-2 sm:px-5 sm:py-3.5 sm:text-[16px]">
      <b className="font-semibold text-ink">{label}</b> {children}
    </p>
  );
}

/** The cross-links that close most pages. Real routes only — parked pages are never linked. */
export function RelatedLinks({ links }: { links: { label: string; href: string }[] }) {
  return (
    <nav aria-label="Related pages" className="mt-9 border-t border-line pt-6">
      <ul className="flex flex-wrap gap-x-5 gap-y-1">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="flex min-h-11 items-center gap-2 text-[15px] font-semibold text-action transition-colors hover:text-anchor"
            >
              {l.label} <span aria-hidden>→</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** The closing call, shared by every page that ends in one. */
export function PageCta({
  title,
  body,
  cta,
  href,
}: {
  title: string;
  body: string;
  cta: string;
  href: string;
}) {
  return (
    <section className="bg-mist py-12 text-center sm:py-20">
      <div className="mx-auto max-w-[1180px] px-5 lg:px-10">
        <h2 className="mx-auto max-w-[24ch] text-ink">{title}</h2>
        <p className="mx-auto mt-4 max-w-[52ch] text-[16px] leading-relaxed text-ink-2 sm:text-[18px]">
          {body}
        </p>
        <Link
          href={href}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-control bg-action px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-anchor"
        >
          {cta}
        </Link>
      </div>
    </section>
  );
}
