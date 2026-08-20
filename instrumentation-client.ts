import * as Sentry from "@sentry/nextjs";

// Browser-side Sentry — key-safe: no NEXT_PUBLIC_SENTRY_DSN → inert. Replays deliberately off
// (client report content must never ship to a third party as session video — same privacy
// reasoning as the founder's no-hosted-render-API ruling for PDFs).
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "local",
    tracesSampleRate: 0.1,
  });
}

// Navigation instrumentation hook (required export when the file exists).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
