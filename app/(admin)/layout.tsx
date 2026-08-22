import { ClerkProvider } from "@clerk/nextjs";
import { requireOperatorAccess } from "@/lib/data/admin";

// Admin layout — founder/admin dashboard (/admin/*).
//
// ── THE BOUNDARY IS REAL NOW (2026-08-22). This layout used to enforce AUTHENTICATION ONLY —
// `await auth.protect()` plus a deferred role-check marker that outlived the session that promised it,
// under its own warning not to expose admin data until the role check landed. Every admin page
// did call requireAdmin(), so nothing leaked; but deny-by-default was carried entirely by
// eighteen pages each remembering, and the NEXT admin page to be added would have been one
// forgotten line away from serving operator data to any signed-in client.
//
// requireOperatorAccess() is the layout-weight guard (same operator test and invitation claim as
// requireAdmin, without the per-page display/scope reads). Pages keep their own requireAdmin()
// call — that is defense in depth, not redundancy: this stops the unknown, that shapes the page.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOperatorAccess();
  return <ClerkProvider>{children}</ClerkProvider>;
}
