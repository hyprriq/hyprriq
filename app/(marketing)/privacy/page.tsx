import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, H2, P, LegalTable } from "@/components/marketing/legal-page";
import { COMPANY } from "@/lib/content/legal";

// ── PRIVACY POLICY — TRANSCRIBED VERBATIM from HyprrIQ_LEGAL_PAGES_FINAL.md (LOCKED copy,
// founder 2026-08-21). Do not author, edit, tighten or improve here. PERMANENT PATH: /privacy
// (Stripe points at it).

export const metadata: Metadata = {
  title: "Privacy Policy — HyprrIQ",
  description: "How Hyprr Retail LLC collects, uses and protects data on HyprrIQ.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <H2>1. Who controls your data</H2>
      <P>
        <b>{COMPANY.legalName}</b>, {COMPANY.address}, is the data controller. HyprrIQ is our product,
        operating under the HyprrX brand.
      </P>
      <P>
        <b>Privacy contact:</b> {COMPANY.legalEmail}
      </P>
      <P>
        <b>HyprrIQ is offered to business customers in the United States.</b> We do not currently offer
        accounts to customers in the United Kingdom or the European Economic Area.
      </P>

      <H2>2. What we collect</H2>
      <P>
        <b>When you sign up:</b> name, email address, and where you provide it, company name and billing
        details.
      </P>
      <P>
        <b>When you submit a case:</b> the supplier name, website and marketplace you enter; the brand names
        you enter; any notes you write; and any documents you upload.
      </P>
      <P>
        <b>Automatically:</b> authentication and session information, and basic technical data needed to
        operate the service securely.
      </P>
      <P>
        <b>Payment details are collected and held by Stripe.</b> We never receive or store your card number.
      </P>

      <H2>3. Information about suppliers and third parties</H2>
      <P>
        To produce a report we research the supplier you name. That research is overwhelmingly about{" "}
        <b>businesses</b> — company registrations, addresses, websites, trade listings, marketplace policies.
      </P>
      <P>
        It may also include <b>limited information about individuals</b> where that information is published
        in a business context: a named director in a company register, or a named employee on a
        company&rsquo;s public profile.
      </P>
      <P>
        <b>Our basis for this is our legitimate interest</b> in providing commercial due-diligence research
        our clients need to make informed purchasing decisions, using information already published in a
        business context. We consider this proportionate: the information is public, business-related, used
        only to answer a specific commercial question, and never used to make decisions about the individuals
        themselves.
      </P>
      <P>
        <b>If you are named in a report and wish to exercise your rights, contact {COMPANY.legalEmail}.</b>
      </P>
      <P>
        We do not deliberately collect sensitive personal information, and we do not use this information for
        profiling, advertising, or automated decisions about individuals.
      </P>

      <H2>4. Why we use your data</H2>
      <LegalTable
        head={["Purpose", "Basis"]}
        rows={[
          ["Providing the service you bought", "Performance of a contract"],
          ["Processing payments", "Performance of a contract"],
          ["Transactional email — submission and delivery notices, support replies", "Performance of a contract"],
          ["Keeping the service secure and preventing abuse", "Legitimate interest"],
          ["Researching the supplier you name", "Performance of a contract (for you); legitimate interest (as to third-party business information)"],
          ["Meeting tax, accounting and legal obligations", "Legal obligation"],
          ["Defending payment disputes and legal claims", "Legitimate interest"],
          [<span key="m">Marketing email</span>, <span key="b"><b>Your consent only</b> — see §7</span>],
        ]}
      />
      <P>
        <b>
          We do not sell your personal information. We do not use it to train AI models. We do not use it for
          advertising.
        </b>
      </P>

      <H2>5. Who processes data for us</H2>
      <P>Each provider below is bound by a data-processing agreement and may act only on our instructions.</P>
      <LegalTable
        head={["Provider", "Purpose"]}
        rows={[
          ["Supabase", "Database and file storage"],
          ["Vercel", "Hosting"],
          ["Clerk", "Sign-in and account security"],
          ["Stripe", "Payments"],
          ["Anthropic", "Automated research and analysis"],
          ["Serper", "Web search"],
          ["WHOIS XML API", "Domain records"],
          ["Cloudmersive", "Malware scanning of uploads"],
          ["Resend", "Transactional email"],
          ["Inngest", "Background processing"],
        ]}
      />
      <P>
        <b>What goes to our research providers:</b> the supplier and brand names you enter, and the contents
        of documents you upload, are processed by our search and analysis providers in order to produce your
        report.
      </P>

      <H2>6. Where your data is held</H2>
      <P>
        Our infrastructure and service providers are located in the <b>United States</b>. Your data is stored
        and processed there.
      </P>

      <H2>7. Marketing email</H2>
      <P>
        We send marketing email <b>only to people who have asked for it.</b> When you subscribe we record your
        email address, the fact of your consent, the date and time, and where you subscribed from.
      </P>
      <P>
        <b>Every marketing email carries an unsubscribe link.</b> Unsubscribing is permanent and immediate,
        and we keep a record of it so you are not re-added.
      </P>
      <P>
        <b>Transactional emails are different</b> — submission confirmations, delivery notices, payment and
        account messages. These are part of the service you bought and are not marketing. They do not carry an
        unsubscribe link, because unsubscribing from them would mean not being told when your own report is
        ready.
      </P>

      <H2>8. How long we keep it</H2>
      <P>
        See the <Link href="/data-policy" className="underline">Data Protection &amp; Retention Policy</Link>{" "}
        for the full table. In summary: uploaded documents 12 months or 30 days after closure, whichever is
        sooner · delivered reports while your account is active, then 30 days after closure · case and audit
        records 180 days after delivery · account details 30 days after closure ·{" "}
        <b>transaction records 7 years, as tax and accounting law requires.</b>
      </P>

      <H2>9. Your rights</H2>
      <P>
        You may <b>access</b> your data, ask us to <b>correct</b> it, ask us to <b>delete</b> it, ask for a{" "}
        <b>copy</b> in a portable format, and <b>withdraw consent</b> to marketing at any time.
      </P>
      <P>
        Email <b>{COMPANY.legalEmail}</b>. We respond within <b>30 days</b>.
      </P>
      <P>
        <b>One limit, stated plainly:</b> we must keep transaction and invoice records for 7 years to meet tax
        and accounting obligations. Those cannot be deleted on request. Everything else can.
      </P>
      <P>
        <b>California residents:</b> the CCPA gives you the right to know what personal information we
        collect, to request deletion, to request a copy, and not to be discriminated against for exercising
        those rights. <b>We do not sell personal information and we do not share it for cross-context
        behavioural advertising.</b> Email {COMPANY.legalEmail}; we respond within 45 days.
      </P>
      <P>
        Residents of Colorado, Connecticut, Utah and Virginia have comparable rights and may use the same
        contact.
      </P>

      <H2>10. Security</H2>
      <P>
        Data is encrypted in transit and at rest. Access is restricted and role-based, and administrative
        actions are logged. Uploads are size- and type-restricted and{" "}
        <b>scanned for malware before they are stored</b>. Database access is governed by row-level security
        so a client&rsquo;s records are reachable only by that client.
      </P>
      <P>
        If a breach occurs that presents a risk to you, we will notify you and the relevant authorities as the
        law requires.
      </P>

      <H2>11. Children</H2>
      <P>
        The service is for businesses. It is not directed at anyone under 18 and we do not knowingly collect
        their information.
      </P>

      <H2>12. Changes</H2>
      <P>Material changes will be notified by email at least 14 days before taking effect.</P>
    </LegalPage>
  );
}
