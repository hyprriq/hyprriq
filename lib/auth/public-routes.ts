// Public route patterns — no Clerk session required. The middleware matcher (proxy.ts) covers ALL
// /api routes, so any server-to-server endpoint that authenticates via its OWN signature (and never
// carries a Clerk session) MUST be listed here, or Clerk blocks the integration with a 401:
//   - /api/webhooks/(.*) — Stripe (verified by STRIPE_WEBHOOK_SECRET)
//   - /api/inngest(.*)   — Inngest serve (verified by INNGEST_SIGNING_KEY)
// Omitting one is a silent integration outage (cost a debugging cycle on 2026-06-28). Guarded by
// public-routes.test.ts.
export const PUBLIC_ROUTES: string[] = [
  "/",
  "/pricing",
  "/how-it-works",
  "/about",
  "/terms",
  "/privacy",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks/(.*)",
  "/api/health",
  "/api/inngest(.*)",
];
