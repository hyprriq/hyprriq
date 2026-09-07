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
  // ── GLOSSES ARE FINDINGS, NEVER ACTIONS (founder-ruled 2026-09-08): "Proceed" was removed —
  // Source Clear means the evidence supports what the supplier described; it has never meant
  // proceed, which is a commercial decision we do not make. "Due diligence" went with it (an
  // action gloss in noun's clothing). ⚠ UNRULED WORDING: "Evidence supports" and "Unresolved
  // items" are my finding-shaped replacements pending founder ratification; "With caveats" and
  // "High risk" were already finding-shaped and stand.
  pills: [
    { tone: "clear" as const, name: "Source Clear", desc: "Evidence supports" },
    { tone: "conditional" as const, name: "Usable With Conditions", desc: "With caveats" },
    { tone: "verify" as const, name: "Verify Before Purchase", desc: "Unresolved items" },
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
    // §0 (2026-08-13): "60+" was an unverified count — nothing in the codebase enumerates it.
    // "Five" was plan-dependent ($99 runs three) — the 2026-08-14 area-claims ruling's shape.
    { color: "#93C5FD", name: "Structured assessment areas, one clear verdict" },
    { color: "#FCD34D", name: "Clear, unbiased verdicts" },
    { color: "#C4B5FD", name: "Built by operators" },
  ],
  switch: { text: "Already have an account?", linkText: "Sign in", href: "/sign-in" },
};
