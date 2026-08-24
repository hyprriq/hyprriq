import type { Metadata } from "next";
import { SITE_URL, SEARCH_INDEXING_ENABLED } from "@/lib/constants/site";
import { CookieNotice } from "@/components/marketing/cookie-notice";
import { Newsreader, Inter, IBM_Plex_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";

// ── TYPE STACK — ruled 2026-08-23 (HyprrIQ_DEV_BRIEF.md §Typography). ────────────────────────
// Replaces Fraunces / Instrument Sans / JetBrains Mono. Explicitly NOT Fraunces, Space Grotesk,
// Playfair, Poppins, Montserrat, DM Sans or Manrope.
//
// ON "SELF-HOST ALL THREE. No third-party request on first paint": `next/font` already does this.
// It downloads each face at build time and serves it from this origin — there is no runtime call
// to fonts.googleapis.com or fonts.gstatic.com, and no manual font-file vendoring is needed to
// satisfy the requirement. `display: swap` is the next/font default.

// Display / headlines — Newsreader. Variable with optical sizing so small headings stay crisp and
// large ones gain ink. Preloaded: the h1 is the LCP element on the marketing pages.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  axes: ["opsz"],
});

// Body / UI — Inter. cv11 + ss03 are enabled globally in globals.css (single-storey `a`,
// disambiguated l/I). Preloaded against the brief's letter — see the note on the mono below.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Data — case IDs, figures, tabular numerals, the small mono labels.
// NOT preloaded: IBM Plex Mono is static (not variable), so it costs a request per weight, and it
// renders only 9-11px chrome labels — never first-paint content. This is the brief's "preload the
// display face only" applied where it pays; Inter stays preloaded because it carries all body copy
// on twelve of the thirteen pages and dropping its preload moves the cost onto text, not chrome.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  preload: false,
});

// Reading — REPORT PROSE ONLY (founder-ruled single exception to "no new fonts", 2026-08-14):
// Source Serif 4, designed for on-screen long-form reading. Applies to findings, the risk
// statement, the leading interpretation, what-to-monitor, checklist items — never interface
// chrome, tables, forms, or the admin console.
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  // metadataBase resolves the OG/Twitter image URLs (app/opengraph-image.tsx) absolutely — cards
  // are broken without it on any host that isn't the canonical origin.
  metadataBase: new URL(SITE_URL),
  // ── SITE-WIDE noindex UNTIL LIVE STRIPE (founder condition 1, domain move) ─────────────────
  // Emitted as a META TAG, with robots.txt left permissive, because the crawler has to be ALLOWED
  // IN to be told not to index — see the note on SEARCH_INDEXING_ENABLED. One flag, one flip.
  robots: SEARCH_INDEXING_ENABLED
    ? undefined
    : { index: false, follow: false, googleBot: { index: false, follow: false } },
  title: "HyprrIQ — Source intelligence for Amazon wholesale",
  description:
    "Before you commit capital, HyprrIQ investigates the vendor and brand behind your next wholesale buy — and hands you a one-page verdict with the exact questions to ask.",
  openGraph: {
    type: "website",
    siteName: "HyprrIQ",
    title: "HyprrIQ — Source intelligence for Amazon wholesale",
    description:
      "A structured verdict on your supplier, the evidence behind it, and the exact questions to ask — within 24 hours.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "HyprrIQ — Source intelligence for Amazon wholesale",
    description:
      "A structured verdict on your supplier, the evidence behind it, and the exact questions to ask — within 24 hours.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ClerkProvider is intentionally NOT at the root — it's scoped to the
  // (portal) and (admin) layouts so public marketing pages ship zero auth
  // JavaScript (faster LCP, better SEO, no third-party auth call on landing).
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${inter.variable} ${plexMono.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* First-visit cookie notice (locked legal build note): strictly necessary cookies only,
            so a dismissible NOTICE, not a consent banner; dismissal lives in localStorage. */}
        <CookieNotice />
      </body>
    </html>
  );
}
