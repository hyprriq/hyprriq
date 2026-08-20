"use client";

import Link from "next/link";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Wordmark } from "@/components/brand/wordmark";

// Root error boundary (Next.js App Router). Must be a client component and
// accepts a reset() to retry the failed render.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry wired 2026-08-20 (tracker 5.3). captureException is a no-op until the DSN env vars
    // are set — key-safe like every other integration.
    Sentry.captureException(error);
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-base px-5 text-center">
      <Link href="/" aria-label="HyprrIQ home" className="inline-block">
        <Wordmark height={22} />
      </Link>
      <p className="mt-10 font-mono text-sm tnum text-muted">500</p>
      <h1 className="mt-3 max-w-md text-[clamp(1.8rem,4vw,2.6rem)] font-bold leading-tight text-ink">
        Something broke on our end.
      </h1>
      <p className="mx-auto mt-4 max-w-sm text-lg text-ink-2">
        That&rsquo;s on us, not you. Try again — and if it keeps happening, email{" "}
        <a href="mailto:support@hyprriq.com" className="font-semibold text-brand hover:text-brand-hover">
          support@hyprriq.com
        </a>
        .
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full border border-line-strong bg-surface px-6 py-3 text-base font-semibold text-ink transition-colors hover:bg-subtle"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
