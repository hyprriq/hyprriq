import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/auth-shell";
import { GrantCodeEntry } from "@/components/auth/grant-code-entry";
import { clerkAppearance } from "@/lib/clerk-appearance";

export const metadata: Metadata = {
  title: "Create your account — HyprrIQ",
  description: "Start vetting suppliers in minutes with HyprrIQ.",
};

export default function SignUpPage() {
  return (
    <AuthShell variant="signup">
      <SignUp
        appearance={clerkAppearance}
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/portal/onboarding"
      />
      {/* Code entry at registration (founder-locked 2a, 2026-08-22): a typed access code is
          validated and parked HERE, before the account exists — so code-holders and
          link-clickers register into the same state. Discoverable on the exact screen a
          code-holder is told to visit. */}
      <GrantCodeEntry />
    </AuthShell>
  );
}
