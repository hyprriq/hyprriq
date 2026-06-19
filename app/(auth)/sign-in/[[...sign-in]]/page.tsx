import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/auth-shell";
import { clerkAppearance } from "@/lib/clerk-appearance";

export const metadata: Metadata = {
  title: "Sign in — HyprrIQ",
  description: "Sign in to your HyprrIQ research portal.",
};

export default function SignInPage() {
  return (
    <AuthShell variant="signin">
      <SignIn
        appearance={clerkAppearance}
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/portal/onboarding"
      />
    </AuthShell>
  );
}
