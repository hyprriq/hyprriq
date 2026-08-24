// Brand theming for Clerk's <SignIn /> / <SignUp /> components so the auth UI
// matches the HyprrIQ palette. The (auth) shell provides the heading and the
// sign-in/up switch link, so Clerk's own header + footer are hidden and the
// card chrome is stripped — the form sits flush in our right panel.
// Shared brand variables — a literal palette because Clerk does color math it
// cannot do on a CSS var. Must mirror --color-brand in globals.css.
const brandVariables = {
  // Mirrors lib/design/palette.ts: colorPrimary = BRAND.action, text = NEUTRAL.ink / ink2.
  // The old values were the pre-2026-08-23 navy #173e63 with warm-grey text (#1a1917 / #56544e),
  // which now reads visibly warm against the cool-neutral shell around it.
  // palette.lock.test.ts asserts these three stay equal to the registry.
  colorPrimary: "#005a68",
  colorText: "#0e191d",
  colorTextSecondary: "#3d484d",
  colorBackground: "#ffffff",
  colorInputBackground: "#ffffff",
  colorInputText: "#0e191d",
  borderRadius: "0.625rem",
  fontFamily: "var(--font-inter), system-ui, sans-serif",
  // ── 16px IS A FUNCTIONAL REQUIREMENT HERE, NOT A PREFERENCE (2026-08-24) ──────────────────
  // MEASURED: Clerk's default rendered its own inputs at 13px and 32px tall. iOS Safari zooms the
  // page when a focused input is under 16px AND DOES NOT ZOOM BACK OUT — so the bug fired on the
  // FIRST screen a client meets, before they had paid anything. Every field in our own forms was
  // raised to 16px the same day; Clerk's are the ones we do not own, so they are set here.
  // Clerk scales its internal type from this base, so the whole component grows proportionally.
  fontSize: "16px",
} as const;

export const clerkAppearance = {
  variables: brandVariables,
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "bg-transparent shadow-none border-0 p-0 m-0 w-full",
    // The (auth) shell owns the heading + the sign-in/up switch, so Clerk's own
    // header/footer are hidden and the form sits flush in our right panel.
    header: "hidden",
    footer: "hidden",
    // The variables above set the type scale; these set the TOUCH TARGETS. Clerk's fields and
    // primary action were 32px tall, under the 44px bar this project holds every control to.
    formFieldInput: "min-h-11 text-[16px]",
    formButtonPrimary: "min-h-11 text-[15px]",
    socialButtonsBlockButton: "min-h-11",
  },
};

// <UserProfile /> is a full multi-section component (Profile / Security), so it
// KEEPS its own navigation — only the brand variables and a flush, chrome-light
// card are shared. Hiding the header here would strip the section nav.
export const clerkProfileAppearance = {
  variables: brandVariables,
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none border border-line rounded-card",
    navbar: "bg-subtle",
  },
};
