## Session F Progress

### Done
- [x] hyprriq.com homepage — committed `9afff3a` — pricing fix, trust strip, hero CTA, sample-report download, manifesto section. Currently on Vercel staging, not yet promoted to production domain.
- [x] Supabase 20-table schema — migrated and live, `/api/health` returns OK.
- [x] **Session C — branded auth pages — COMPLETE.** Split-screen Sign In / Sign Up at `app/(auth)/sign-in/[[...sign-in]]/page.tsx` and `.../sign-up/[[...sign-up]]/page.tsx`. Left brand panel is custom JSX via `components/auth/auth-shell.tsx` (verdict pills on sign-in, feature pills on sign-up); right panel is Clerk `<SignIn/>`/`<SignUp/>` themed via `lib/clerk-appearance.ts` (Clerk header/footer hidden, our heading + switch link supplied by the shell). Copy in `lib/content/auth.ts`. `ClerkProvider` scoped to `app/(auth)/layout.tsx` (provider-only). Catch-all path routing, `routing="path"`. Redirects: both sign-in and sign-up → `/portal/onboarding` (`fallbackRedirectUrl`). Placeholder `app/(portal)/portal/onboarding/page.tsx` created so the redirect doesn't 404. Build + lint clean. Used our locked brand `#1E40AF`/`#16307E` (not the prototype's `#1B4B8A`). **Magic link + Google OAuth are a Clerk DASHBOARD setting — confirm password is OFF, magic link + Google ON.** Commit: `d710f15` (branch `staging`).

### In progress
- (nothing active — Session C committed; Session F is a separate new thread)

### Not started
- [ ] Session F — portal build (onboarding, dashboard, cases, billing, support, help, admin)

### Open questions / flagged for approval
- **Design token deviation (intentional):** the prototype's auth panel uses `#1B4B8A` (old navy). Using our shipped/locked brand instead — `brand #1E40AF`, `brand-ink #16307E` — so auth pages match the homepage. Flag if you specifically want the prototype's exact navy.
- **Clerk route convention:** using catch-all `app/(auth)/sign-in/[[...sign-in]]/page.tsx` (Clerk's documented App Router pattern) rather than a plain `page.tsx` — prevents 404s on Clerk's multi-step sub-routes.
- **Password disabled is a Clerk Dashboard setting**, not code. Ensure Clerk dashboard has: Email magic link ON, Google OAuth ON, Password OFF.
