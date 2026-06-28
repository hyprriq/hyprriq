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
  ],
};
