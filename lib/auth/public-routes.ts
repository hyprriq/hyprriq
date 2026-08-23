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
  // ⚠ CAUGHT IN A BROWSER, NOT IN A TEST (2026-08-20): /sample-report shipped its first render
  // redirecting to /sign-in. A marketing page behind auth is worse than a missing one — the
  // highest-converting page in the funnel would have demanded a login from every prospect.
  // Any NEW marketing route needs a line here; the marketing-route lock in public-routes.test.ts
  // now fails if one is added without it.
  "/sample-report",
  "/how-to-read",
  "/partners",
  "/about",
  // The 2026-08-24 launch build — the rest of the thirteen ruled marketing routes. Every one of
  // these is a cold-visitor page; the marketing-route lock in public-routes.test.ts fails the
  // build if a route under app/(marketing) is added without a line here, which is the whole
  // reason /sample-report's redirect-to-sign-in was caught in a browser and never again.
  "/what-we-check",
  "/method",
  "/what-we-dont-do",
  "/security",
  "/how-we-handle-your-data",
  "/contact",
  "/faq",
  // The six legal pages (locked copy, built 2026-08-21). /terms and /privacy are PERMANENT —
  // Stripe live mode points at them and those URLs must never move.
  "/terms",
  "/privacy",
  "/data-policy",
  "/refund-policy",
  "/payment-policy",
  "/cookie-policy",
  "/sign-in(.*)",
  "/sign-up(.*)",
  // Invite links (acquisition grants, 2026-08-21): the URL is handed to people who have no
  // account yet BY DESIGN — behind auth it would demand a login from the exact person it exists
  // to acquire. The slug is the secret; every real check lives in the redemption RPC.
  "/grant/(.*)",
  // ⚠ CLASS FIX (2026-08-22, found during the /partners mailto replacement): /unsubscribe and
  // /api/newsletter shipped WITHOUT public entries — the marketing-route lock only walks
  // app/(marketing), so neither was caught. A logged-out footer signup died on a Clerk 401
  // ("that didn't go through"), and a campaign unsubscribe click would have bounced to sign-in —
  // a CAN-SPAM problem, on the exact URL the ADR calls permanent. Both are locked by name in
  // public-routes.test.ts now; /api/partner-request (same cold-visitor class) joins them.
  "/unsubscribe",
  "/api/newsletter",
  "/api/partner-request",
  // Contact intake (2026-08-24) — same cold-visitor class as the partner request.
  "/api/contact",
  // Typed-code validation at registration (2026-08-22): the person checking a code has no
  // account yet, by definition. Only /check is public — redeem and attach stay authenticated.
  "/api/grants/check",
  "/api/webhooks/(.*)",
  "/api/health",
  "/api/inngest(.*)",
  // robots.txt and sitemap.xml are static file routes: the middleware matcher already skips
  // extensioned paths, so they stay reachable without a line here (verified live).
];
