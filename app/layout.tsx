import type { Metadata } from "next";
import { Fraunces, Instrument_Sans, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";

// Display / headlines — Fraunces: research-firm gravitas (ruled skin, 2026-08-05).
// Variable with optical sizing so small headings stay crisp and large ones gain ink.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

// Body / UI — Instrument Sans: clean humanist, explicitly not Inter.
const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
});

// Data — case IDs, figures, tabular numerals.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
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
  title: "HyprrIQ — Source intelligence for Amazon wholesale",
  description:
    "Before you commit capital, HyprrIQ investigates the vendor and brand behind your next wholesale buy — and hands you a one-page verdict with the exact questions to ask.",
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
      className={`${fraunces.variable} ${instrument.variable} ${jetbrainsMono.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
