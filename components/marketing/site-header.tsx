"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

// Anchor links target in-page sections until the dedicated /how-it-works and
// /pricing routes ship (next builds in this session sequence) — keeps the nav
// free of dead links in the meantime.
const NAV = [
  { label: "How it works", href: "#how-it-works" },
  { label: "The four outcomes", href: "#outcomes" },
  { label: "Pricing", href: "#pricing" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b bg-base/85 backdrop-blur-md transition-colors ${
        scrolled ? "border-line" : "border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 lg:px-8">
        <Link href="/" className="font-display text-lg font-bold tracking-tight text-ink">
          Hyprr<span className="text-brand">IQ</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-ink-2 transition-colors hover:text-ink"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/portal"
            className="text-sm font-medium text-ink-2 transition-colors hover:text-ink"
          >
            Sign in
          </Link>
          <a
            href="#pricing"
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            Get started
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-ink md:hidden"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-line bg-base px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2.5 text-base font-medium text-ink-2 hover:bg-subtle hover:text-ink"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-line pt-3">
              <Link
                href="/portal"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2.5 text-base font-medium text-ink-2 hover:bg-subtle hover:text-ink"
              >
                Sign in
              </Link>
              <a
                href="#pricing"
                onClick={() => setOpen(false)}
                className="rounded-full bg-brand px-4 py-2.5 text-center text-base font-semibold text-white hover:bg-brand-hover"
              >
                Get started
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
