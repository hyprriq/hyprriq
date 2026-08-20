import * as Sentry from "@sentry/nextjs";

// ── SENTRY, SERVER SIDE (tracker 5.3 — "flying without error reporting") ─────────────────────
//
// KEY-SAFE like every other integration here (Resend, Stripe): no SENTRY_DSN → init is skipped
// and the SDK is inert. The founder creates the Sentry project and sets SENTRY_DSN (server) +
// NEXT_PUBLIC_SENTRY_DSN (browser) in Vercel; nothing else is required. Source-map upload is
// deliberately NOT wired (needs an org auth token — a founder step, later, optional).
export function register() {
  if (!process.env.SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? "local",
    // Errors are the point; keep performance sampling light so the free tier lasts.
    tracesSampleRate: 0.1,
  });
}

// Server-component and route-handler errors flow through this hook (Next 15+ contract).
export const onRequestError = Sentry.captureRequestError;
