import type { Metadata } from "next";
import { Schibsted_Grotesk, Hanken_Grotesk, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

// Display / headlines — news-grade authority, distinctive (anti-slop).
const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

// Body / UI — humanist, warm, highly readable.
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Data — case IDs, figures, tabular numerals.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${schibsted.variable} ${hanken.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
