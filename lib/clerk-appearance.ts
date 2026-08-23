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
