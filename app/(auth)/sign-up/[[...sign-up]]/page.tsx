import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/auth-shell";
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
    </AuthShell>
  );
}
