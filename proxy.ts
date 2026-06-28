import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes — everything else requires an authenticated Clerk session.
const isPublicRoute = createRouteMatcher([
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
  // Inngest's serve endpoint must bypass Clerk — it's hit server-to-server (sync + run invocations)
  // with no Clerk session, and authenticates itself via INNGEST_SIGNING_KEY. Without this, Clerk
  // blocks the sync → Inngest reports "Not found response from URL".
  "/api/inngest(.*)",
]);

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
  ],
};
