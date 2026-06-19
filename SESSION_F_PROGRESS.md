## Session F Progress

### Done
- [x] hyprriq.com homepage — committed `9afff3a` — pricing fix, trust strip, hero CTA, sample-report download, manifesto section. Currently on Vercel staging, not yet promoted to production domain.
- [x] Supabase 20-table schema — migrated and live, `/api/health` returns OK.
- [x] **Session C — branded auth pages — COMPLETE.** Split-screen Sign In / Sign Up at `app/(auth)/sign-in/[[...sign-in]]/page.tsx` and `.../sign-up/[[...sign-up]]/page.tsx`. Left brand panel is custom JSX via `components/auth/auth-shell.tsx` (verdict pills on sign-in, feature pills on sign-up); right panel is Clerk `<SignIn/>`/`<SignUp/>` themed via `lib/clerk-appearance.ts` (Clerk header/footer hidden, our heading + switch link supplied by the shell). Copy in `lib/content/auth.ts`. `ClerkProvider` scoped to `app/(auth)/layout.tsx` (provider-only). Catch-all path routing, `routing="path"`. Redirects: both sign-in and sign-up → `/portal/onboarding` (`fallbackRedirectUrl`). Placeholder `app/(portal)/portal/onboarding/page.tsx` created so the redirect doesn't 404. Build + lint clean. **Auth method = email verification code + Google OAuth** (password OFF, email CODE on, link off — Clerk dashboard setting, done founder-side). Commit: `d710f15` (branch `staging`).
- [x] **Color correction (2026-06-19):** brand blue moved to the prototype values — `brand #1B4B8A`, `hover #2A6ACC`, `brand-ink #0F2A4E`, `tint #E8F0FB` — at the source (`globals.css` `@theme`). Homepage + auth now share one token set; auth-shell gradient uses `var(--color-brand)`/`var(--color-brand-ink)`; Clerk `colorPrimary` mirrors `#1B4B8A` (literal, Clerk needs it). DESIGN.md updated.

### In progress
- (nothing active — Session C committed; Session F is a separate new thread)

### Not started
- [ ] Session F — portal build (onboarding, dashboard, cases, billing, support, help, admin)

### Open questions / flagged for approval
- **Brand blue: resolved.** Homepage + auth both use the prototype blue (`#1B4B8A`/`#2A6ACC`/`#0F2A4E`) from `globals.css` `@theme` — one source of truth, no more drift.
- **Clerk route convention:** using catch-all `app/(auth)/sign-in/[[...sign-in]]/page.tsx` (Clerk's documented App Router pattern) — prevents 404s on Clerk's multi-step sub-routes.
- **Clerk dashboard (done founder-side):** Password OFF, Email verification CODE ON (link OFF), Google OAuth ON; Paths `/sign-in`, `/sign-up`, after → `/portal/onboarding`.
