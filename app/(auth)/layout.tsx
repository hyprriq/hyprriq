import { ClerkProvider } from "@clerk/nextjs";

// Auth route group — public Sign In / Sign Up on our own domain (no off-site
// Clerk redirect). The split-screen + per-page brand panel (verdict pills on
// sign-in, feature pills on sign-up) live in each page via <AuthShell>, so this
// layout only provides the Clerk context. ClerkProvider is scoped here (and to
// the portal/admin layouts) so marketing pages stay auth-JS-free.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProvider>{children}</ClerkProvider>;
}
