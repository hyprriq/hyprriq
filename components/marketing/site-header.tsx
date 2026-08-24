"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";

// ── SITE HEADER — built to hyprriq_flow_v2.html's nav (2026-08-24) ────────────────────────────
//
// TWO DELIBERATE DEPARTURES FROM THE SPEC FILE, both because it is a ONE-PAGE document and this
// is a thirteen-page site:
//
// 1. THE LINKS ARE ROUTES, NOT ANCHORS. The spec's nav points at #get / #service / #output /
//    #proof / #price — homepage section ids. Shared across thirteen pages those are dead links
//    on twelve of them. Every destination here comes from the locked URL map, and the labels name
//    the page they land on rather than the homepage section they used to scroll to.
//
// 2. THERE IS A MOBILE MENU. The spec hides the nav outright below 960px (`.nl{display:none}`)
//    and leaves only the logo, Sign in and the CTA — workable when every destination is a scroll
//    away on the same page, and a dead end when they are twelve separate routes. The founder's
//    bar for this sitting is that a page which only works on desktop is not done.
//
// THE WORDMARK IS THE SHARED LOCKUP. Founder ruling 4 (2026-08-24) made the marketing text
// lockup the identity across the whole product, replacing the Fraunces + copper SVG on auth,
// admin, portal, error and 404. It lives in components/brand/wordmark.tsx; this header sizes it
// through className so it can be responsive.

const NAV = [
  { label: "What we check", href: "/what-we-check" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Our method", href: "/method" },
  { label: "Pricing", href: "/pricing" },
  { label: "For agencies", href: "/partners" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-base/[0.88] backdrop-blur-[14px]">
      <div className="mx-auto flex h-[58px] max-w-[1180px] items-center justify-between gap-3 px-5 sm:h-[66px] lg:px-10">
        <Link href="/" aria-label="HyprrIQ home" className="flex min-h-11 flex-none items-center">
          <Wordmark className="text-[19px] sm:text-[22px]" />
        </Link>

        {/* The spec drops the nav at 960px; the mobile menu below picks it up. */}
        <nav aria-label="Main" className="hidden items-center gap-[26px] lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[14.5px] font-medium text-ink-2 transition-colors hover:text-anchor"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-none items-center gap-3 sm:gap-5">
          <Link
            href="/sign-in"
            className="flex min-h-11 items-center whitespace-nowrap text-[14px] font-medium text-ink-2 transition-colors hover:text-anchor sm:text-[14.5px]"
          >
            Sign in
          </Link>
          <Link
            href="/pricing"
            className="flex min-h-11 items-center whitespace-nowrap rounded-control bg-action px-3.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-anchor sm:px-5 sm:text-[14.5px]"
          >
            Vet a supplier
          </Link>
          {/* 44px tap target (h-11 w-11), per the mobile bar. */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="site-menu"
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-control text-ink lg:hidden"
          >
            {open ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="site-menu" aria-label="Main, mobile" className="border-t border-line bg-surface px-5 py-2 lg:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center rounded-control px-2 text-[16px] font-medium text-ink-2 transition-colors hover:bg-subtle hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
          <div className="my-2 border-t border-line" />
          {[
            { label: "See a real report", href: "/sample-report" },
            { label: "How to read a report", href: "/how-to-read" },
            { label: "Questions", href: "/faq" },
            { label: "Contact", href: "/contact" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center rounded-control px-2 text-[16px] font-medium text-ink-2 transition-colors hover:bg-subtle hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
