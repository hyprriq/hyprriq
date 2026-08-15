import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "How it works", href: "/how-it-works" },
      { label: "Pricing", href: "/pricing" },
      { label: "The four outcomes", href: "/how-it-works#outcomes" },
    ],
  },
  {
    heading: "Company",
    // About/Terms/Privacy REMOVED 2026-08-08 (founder-ruled: no dead href="#" links) — they
    // return with the legal-pages ruling (tracker 1.6) and the About page (2.7).
    links: [{ label: "Contact", href: "mailto:hello@hyprriq.com" }],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-5 py-14 sm:grid-cols-4 lg:px-8">
        <div className="col-span-2 sm:col-span-1">
          <Link href="/" aria-label="HyprrIQ home" className="inline-block">
            <Wordmark height={20} />
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-2">
            Source intelligence for Amazon wholesale. We surface what&rsquo;s
            observable — and the questions worth asking — so you buy with your
            eyes open.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.heading}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {col.heading}
            </p>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-sm text-ink-2 transition-colors hover:text-ink"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>&copy; {new Date().getFullYear()} Hyprr Retail LLC. All rights reserved.</p>
          <p>
            HyprrIQ reports observable signals. We never confirm vendor
            authorization — we help you verify it.
          </p>
        </div>
      </div>
    </footer>
  );
}
