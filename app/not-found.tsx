import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-base px-5 text-center">
      <Link href="/" className="font-display text-xl font-bold tracking-tight text-ink">
        Hyprr<span className="text-brand">IQ</span>
      </Link>
      <p className="mt-10 font-mono text-sm tnum text-muted">404</p>
      <h1 className="mt-3 max-w-md text-[clamp(1.8rem,4vw,2.6rem)] font-bold leading-tight text-ink">
        This page isn&rsquo;t in our records.
      </h1>
      <p className="mx-auto mt-4 max-w-sm text-lg text-ink-2">
        The link may be old or mistyped. Let&rsquo;s get you back to solid ground.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          Back to home
        </Link>
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center rounded-full border border-line-strong bg-surface px-6 py-3 text-base font-semibold text-ink transition-colors hover:bg-subtle"
        >
          See pricing
        </Link>
      </div>
    </main>
  );
}
