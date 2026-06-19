// Placeholder onboarding route (Session C). It exists so Clerk's
// after-sign-in / after-sign-up redirect lands somewhere real instead of 404ing.
// The real 3-step onboarding (and the clients.onboarding_completed check that
// redirects to /portal/dashboard when already done) is built in Session F.
export default function OnboardingPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-base px-5 text-center">
      <p className="font-display text-xl font-bold tracking-tight text-ink">
        Hyprr<span className="text-brand">IQ</span>
      </p>
      <h1 className="mt-8 text-[clamp(1.6rem,3.5vw,2.2rem)] font-bold text-ink">
        You&rsquo;re signed in.
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-lg text-ink-2">
        Your research portal is being set up. Onboarding lands here soon.
      </p>
    </main>
  );
}
