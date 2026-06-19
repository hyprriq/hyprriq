// Brand theming for Clerk's <SignIn /> / <SignUp /> components so the auth UI
// matches the HyprrIQ palette. The (auth) shell provides the heading and the
// sign-in/up switch link, so Clerk's own header + footer are hidden and the
// card chrome is stripped — the form sits flush in our right panel.
export const clerkAppearance = {
  variables: {
    // Must mirror --color-brand in globals.css (Clerk needs a literal; it does
    // color math it can't do on a CSS var).
    colorPrimary: "#1b4b8a",
    colorText: "#1a1917",
    colorTextSecondary: "#56544e",
    colorBackground: "#ffffff",
    colorInputBackground: "#ffffff",
    colorInputText: "#1a1917",
    borderRadius: "0.625rem",
    fontFamily: "var(--font-hanken), system-ui, sans-serif",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "bg-transparent shadow-none border-0 p-0 m-0 w-full",
    header: "hidden",
    footer: "hidden",
  },
};
