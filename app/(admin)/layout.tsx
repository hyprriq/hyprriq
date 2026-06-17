import { auth } from "@clerk/nextjs/server";
import { ClerkProvider } from "@clerk/nextjs";

// Admin layout — founder/admin dashboard (/admin/*). Requires an
// authenticated Clerk session. Admin UI pages are built in Session 5.
//
// NOTE (Session 1 skeleton): this currently enforces *authentication* only.
// Admin-ROLE enforcement is wired in a later session — admin status lives in
// `clients.is_admin` (Supabase), so the full guard will either (a) look up
// is_admin via the server Supabase client, or (b) mirror the role into Clerk
// `publicMetadata` and check it here. Do not expose real admin data behind
// this guard until that role check is in place.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await auth.protect();
  // TODO(Session 5): enforce admin role (clients.is_admin === true).
  return <ClerkProvider>{children}</ClerkProvider>;
}
