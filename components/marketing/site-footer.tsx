import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { LEGAL_PAGES, COMPANY } from "@/lib/content/legal";

// ── SITE FOOTER — built to hyprriq_flow_v2.html's footer (2026-08-24) ─────────────────────────
//
// PARKED LINKS ARE ABSENT, NOT STUBBED (dev brief, build note 1). The spec's Learn column lists
// "Why sellers get suspended", "Wholesale glossary" and "Resources" — three of the six pages that
// are written but publish later through Sanity. Six dead internal links on launch day is a worse
// signal than six missing pages, so the column carries only what exists.
//
// /how-to-read JOINS THE MAP (founder ruling 2, 2026-08-24): it launches, so it is linked here.
//
// THE NEWSLETTER STAYS. The spec footer has no signup, but this one is live, function-complete
// and legally load-bearing — the /unsubscribe URL it feeds is permanent under CAN-SPAM. Removing
// a working acquisition surface is a business call, not a design one. Flagged, not deleted.
//
// COLOURS ARE TOKENS, NOT THE SPEC'S RAW HEXES. The spec writes #8D999E / #B7C3C7 / #6E7B80 inline;
// the last of those measures 4.09:1 on --ink and fails. The token layer already carries measured
// equivalents for exactly this ground, so the footer uses those and the lock keeps them honest.

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "What we check", href: "/what-we-check" },
      { label: "How it works", href: "/how-it-works" },
      { label: "See a real report", href: "/sample-report" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    heading: "Learn",
    links: [
      { label: "How to read a report", href: "/how-to-read" },
      { label: "Questions", href: "/faq" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "Our method", href: "/method" },
      { label: "What we don't do", href: "/what-we-dont-do" },
      { label: "Security", href: "/security" },
      { label: "How we handle your data", href: "/how-we-handle-your-data" },
      { label: "About", href: "/about" },
      { label: "For agencies", href: "/partners" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer data-ground="dark" className="bg-ink">
      <div className="mx-auto max-w-[1180px] px-5 pb-9 pt-13 lg:px-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.7fr_1fr_1fr_1.2fr] lg:gap-7">
          <div>
            <Link href="/" aria-label="HyprrIQ home" className="inline-flex min-h-11 items-center">
<Wordmark variant="reversed" height={16} />
            </Link>
            <p className="mt-3 max-w-[34ch] text-[13.5px] leading-relaxed text-nav-fg-dim">
              Wholesale supplier intelligence for Amazon resellers. A product of {COMPANY.legalName}.
              US clients only at launch.
            </p>
            <div className="mt-6 max-w-sm">
              <NewsletterSignup />
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
                {col.heading}
              </h2>
              <ul className="mt-3">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="flex min-h-11 items-center text-[14px] text-nav-fg transition-colors hover:text-white sm:min-h-0 sm:py-1"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-9 border-t border-white/10 pt-5">
          {/* All six legal pages on every page (locked build note). Stripe live mode points at
              /terms and /privacy — those two URLs are permanent. */}
          <ul className="flex flex-wrap gap-x-4">
            {LEGAL_PAGES.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="flex min-h-11 items-center text-[13px] text-nav-fg transition-colors hover:text-white sm:min-h-0 sm:py-1"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink-muted">
            {COMPANY.legalName}, a Wyoming company · {COMPANY.address}
            <br />
            &copy; {new Date().getFullYear()} {COMPANY.legalName}. Not affiliated with, endorsed by,
            or connected to Amazon or any marketplace operator.
          </p>
        </div>
      </div>
    </footer>
  );
}
