import type { Metadata } from "next";
import { LegalPage, H2, P, LegalTable } from "@/components/marketing/legal-page";

// ── COOKIE POLICY — REWRITTEN UNDER THE 2026-08-22 TRUTH-AUDIT RULING: the table below lists
// what the app ACTUALLY sets, verified against the code (the only first-party app cookie is
// hyprriq_grant, set by app/grant/[code]/route.ts and cleared by /api/grants/attach; Clerk sets
// the auth cookies via middleware; NO Stripe cookie is set on our domain — checkout happens on
// Stripe's own pages). The old table's "Security tokens — HyprrIQ (CSRF)" and "Payment session
// — Stripe" rows described cookies we do not set and were removed.

export const metadata: Metadata = {
  title: "Cookie Policy — HyprrIQ",
  description: "The cookies HyprrIQ uses — strictly necessary only; no advertising, tracking or analytics.",
};

export default function CookiePolicyPage() {
  return (
    <LegalPage title="Cookie Policy">
      <H2>What we use</H2>
      <P>
        <b>Only the cookies the service needs to work:</b> the cookies that keep you signed in, and one
        functional cookie that remembers an invite you clicked.
      </P>
      <LegalTable
        head={["Cookie", "Set by", "Purpose", "Duration"]}
        rows={[
          ["Session and authentication", "Clerk", "Keeps you signed in; protects the session", "Session"],
          ["Invite code (hyprriq_grant)", "HyprrIQ", "Remembers an invite link you clicked so your free assessment applies when you register", "7 days, removed as soon as it is used"],
        ]}
      />
      <P>
        Checkout happens on Stripe&rsquo;s own payment pages, which set their own cookies there — not on
        this site. We also store a small flag in your browser&rsquo;s local storage when you dismiss the
        cookie notice, so it doesn&rsquo;t reappear; local storage is not sent to us.
      </P>

      <H2>What we do not use</H2>
      <P>
        <b>We do not use advertising cookies, tracking pixels, or third-party analytics.</b> We do not build
        profiles of visitors and we do not share browsing data with advertisers.
      </P>
      <P>
        <b>If that changes, we will ask for your consent first</b> and update this page before setting
        anything new.
      </P>

      <H2>Controlling cookies</H2>
      <P>
        You can block or delete cookies in your browser settings. Blocking strictly necessary cookies will
        prevent you from signing in.
      </P>

      <H2>Changes</H2>
      <P>
        If we introduce any cookie beyond those above, we will update this page and request consent where
        required.
      </P>
    </LegalPage>
  );
}
