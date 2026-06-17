// Brand theming for Clerk's hosted <SignIn /> / <SignUp /> components so the
// auth UI matches the HyprrIQ palette. The surrounding (auth) layout provides
// the framing, so the Clerk card itself is borderless/transparent here.
// (Shape is validated against the component's `appearance` prop at the call site.)
export const clerkAppearance = {
  variables: {
    colorPrimary: "#1e40af",
    colorText: "#1a1917",
    colorTextSecondary: "#56544e",
    colorBackground: "#ffffff",
    colorInputBackground: "#ffffff",
    borderRadius: "0.625rem",
  },
  elements: {
    rootBox: "w-full",
    card: "shadow-none border-0 bg-transparent w-full",
    headerTitle: "font-display",
    footerActionLink: "text-[#1e40af] hover:text-[#1a3793]",
  },
};
