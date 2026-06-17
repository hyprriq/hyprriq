import { auth } from "@clerk/nextjs/server";
import { ClerkProvider } from "@clerk/nextjs";

// Portal layout — client-facing app shell (/portal/*). Requires an
// authenticated Clerk session. Portal UI pages are built in Session 3.
//
// Clerk v7: `auth` is async and `auth.protect()` redirects unauthenticated
// users to sign-in (or returns 404 on non-document requests).
// ClerkProvider is scoped here (not at root) so marketing pages stay auth-free.
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await auth.protect();
  return <ClerkProvider>{children}</ClerkProvider>;
}
