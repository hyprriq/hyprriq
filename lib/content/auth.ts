// Auth-page copy (ADR-004) — content lives here, not inline in JSX.

export const brand = {
  wordmark: "HyprrIQ",
  sub: "Source Intelligence",
  footer: "hyprriq.com — by HyprrX",
};

// Sign-in left panel: the verdict system as the trust signal.
export const signIn = {
  eyebrow: "Client portal",
  heading: "Welcome back",
  sub: "Sign in to access your research portal and reports.",
  tagline: ["Know what you're buying", "before you commit capital."],
  pills: [
    { tone: "clear" as const, name: "Source Clear", desc: "Proceed" },
    { tone: "conditional" as const, name: "Usable With Conditions", desc: "With caveats" },
    { tone: "verify" as const, name: "Verify Before Purchase", desc: "Due diligence" },
    { tone: "deny" as const, name: "Do Not Rely", desc: "High risk" },
  ],
  switch: { text: "Don't have an account?", linkText: "Sign up free", href: "/sign-up" },
};

// Sign-up left panel: the value props as the trust signal.
export const signUp = {
  eyebrow: "Get started",
  heading: "Create your account",
  sub: "Start vetting suppliers in minutes.",
  tagline: ["Start vetting suppliers", "in minutes, not days."],
  pills: [
    { color: "#6EE7B7", name: "Human-reviewed reports" },
    { color: "#93C5FD", name: "60+ public data sources" },
    { color: "#FCD34D", name: "Clear, unbiased verdicts" },
    { color: "#C4B5FD", name: "Built by operators" },
  ],
  switch: { text: "Already have an account?", linkText: "Sign in", href: "/sign-in" },
};
