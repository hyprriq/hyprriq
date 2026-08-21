import type { Metadata } from "next";
import { LegalPage, H2, P, LegalTable } from "@/components/marketing/legal-page";

// ── COOKIE POLICY — TRANSCRIBED VERBATIM from HyprrIQ_LEGAL_PAGES_FINAL.md (LOCKED copy,
// founder 2026-08-21). Do not author, edit, tighten or improve here. NOTE (flagged in the build
// report, not fixed here): the live site also sets a functional invite-code cookie
// (hyprriq_grant) that this locked table does not list.

export const metadata: Metadata = {
  title: "Cookie Policy — HyprrIQ",
  description: "The cookies HyprrIQ uses — strictly necessary only; no advertising, tracking or analytics.",
};

export default function CookiePolicyPage() {
  return (
    <LegalPage title="Cookie Policy">
      <H2>What we use</H2>
      <P>
        <b>Strictly necessary cookies only.</b> These keep you signed in and keep the service secure. The
        service cannot work without them.
      </P>
      <LegalTable
        head={["Cookie", "Set by", "Purpose", "Duration"]}
        rows={[
          ["Session and authentication", "Clerk", "Keeps you signed in; protects the session", "Session"],
          ["Security tokens", "HyprrIQ", "Protects forms against cross-site request forgery", "Session"],
          ["Payment session", "Stripe", "Completes checkout securely", "Session"],
        ]}
      />

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
