import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { PUBLIC_ROUTES } from "@/lib/auth/public-routes";

// Public routes — everything else requires an authenticated Clerk session. The list (incl. the
// server-to-server endpoints that MUST bypass Clerk) lives in lib/auth/public-routes.ts, guarded
// by a regression test.
const isPublicRoute = createRouteMatcher(PUBLIC_ROUTES);

// Clerk v7: the callback receives an async `auth`; protect with
// `await auth.protect()` (not the v5-era `auth().protect()`).
export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next internals and all static files, unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
    // ── /prototype IS NOT PUBLIC (2026-08-24) ─────────────────────────────────────────────────
    // The skip list above deliberately ignores extensioned paths, which meant every file under
    // public/prototype answered 200 to the open internet on the production domain — internal admin
    // mockups, client report mockups, the design-system reference, real company names and
    // live-shaped case references among them. MEASURED on hyprriq.com: /prototype/index.html,
    // /prototype/DESIGN_SYSTEM_reference.html, /prototype/backup/client/report.html and
    // /prototype/admin/review-direction-a.html all returned 200, and the last of those still
    // carries AWI-2607-022.
    //
    // This entry runs the middleware for those paths REGARDLESS of extension, so they fall to the
    // default (authenticated) branch like every other non-public route. Surgical on purpose: it
    // does not change how any other static file is handled, and it deletes nothing.
    "/prototype/:path*",
  ],
};
