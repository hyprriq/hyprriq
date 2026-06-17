import Link from "next/link";
import { ClerkProvider } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";

// Auth experience — public, branded, on our own domain (no off-site Clerk
// redirect). Split layout: a brand panel on the left (desktop) and the Clerk
// form on the right. ClerkProvider is scoped here so the marketing pages stay
// auth-JS-free.
const TRUST = [
  "Five research dimensions, founder-reviewed",
  "One plain-English verdict, not a black-box score",
  "We show what's observable — and what to verify",
];

const SPECTRUM = ["#3F9468", "#C99A2E", "#C2742F", "#B5524A"];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <div className="grid min-h-dvh lg:grid-cols-2">
        {/* Brand panel */}
        <aside className="relative hidden flex-col justify-between bg-brand-ink px-12 py-12 text-white lg:flex">
          <Link href="/" className="font-display text-xl font-bold tracking-tight text-white">
            Hyprr<span className="text-white/70">IQ</span>
          </Link>

          <div className="max-w-md">
            <h1 className="font-display text-3xl font-bold leading-tight">
              Know what you&rsquo;re really buying — before you wire the money.
            </h1>
            <div className="mt-7 flex gap-1.5">
              {SPECTRUM.map((c) => (
                <span key={c} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: c }} />
              ))}
            </div>
            <ul className="mt-8 space-y-3">
              {TRUST.map((t) => (
                <li key={t} className="flex gap-3 text-[15px] text-white/80">
                  <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-white/60" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-sm text-white/60">
            Source intelligence for Amazon &amp; Walmart wholesale.
          </p>
        </aside>

        {/* Form panel */}
        <main className="flex flex-col bg-base px-5 py-8 sm:px-8">
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-2 transition-colors hover:text-ink"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back to home
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-center pb-12">
            {children}
          </div>
        </main>
      </div>
    </ClerkProvider>
  );
}
