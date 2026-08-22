import type { Metadata } from "next";
import { LegalPage, H2, P, OL, LegalTable } from "@/components/marketing/legal-page";
import { COMPANY } from "@/lib/content/legal";

// ── DATA PROTECTION & RETENTION POLICY — REWRITTEN UNDER THE 2026-08-22 TRUTH-AUDIT RULING
// (the code wins; the drafted copy is no longer authoritative). Every retention row states a
// commitment we keep: the uploads 12-month limit is machinery-backed (the retention sweep,
// whose code structurally forbids ANY removal without a 30-day-old warning email); the
// closure-clocked deletions are performed as part of closing an account (closure is a deliberate
// act today, not an automated one — so the rows say "within 30 days after your account closes",
// a commitment a human keeps, and never describe scheduled automation that does not run). The
// drafted 180-days-after-delivery case-record deletion had no machinery and collided with our
// ability to re-verify delivered work — replaced with while-your-account-is-active retention,
// stated plainly with its reason.

export const metadata: Metadata = {
  title: "Data Protection & Retention — HyprrIQ",
  description: "Exactly what HyprrIQ holds, where, and for how long — and how deletion works.",
};

export default function DataPolicyPage() {
  return (
    <LegalPage title="Data Protection & Retention Policy">
      <P>Exactly what we hold, where, and for how long.</P>

      <H2>What we store, and where</H2>
      <LegalTable
        head={["Data", "Where"]}
        rows={[
          ["Account details — name, email, company", "Supabase (United States)"],
          ["Sign-in credentials and sessions", "Clerk"],
          ["Case submissions — supplier, brands, marketplace, notes", "Supabase"],
          ["Uploaded documents", "Supabase Storage, private bucket"],
          ["Research evidence and findings", "Supabase"],
          ["Delivered reports and PDFs", "Supabase Storage, private bucket"],
          ["Audit and access logs", "Supabase"],
          [<span key="p">Payment records</span>, <span key="w"><b>Stripe.</b> We hold an invoice reference; we never hold card details</span>],
        ]}
      />
      <P>
        <b>Files are stored in private buckets.</b> They are not publicly reachable, and downloads are served
        only through short-lived links issued after we confirm the file belongs to you.
      </P>

      <H2>How long we keep it</H2>
      <LegalTable
        head={["Data", "Retention", "Why"]}
        rows={[
          [<b key="d">Uploaded documents</b>, "At most 12 months from upload, or within 30 days after your account closes — whichever is sooner. We email you 30 days before any document is removed", "They corroborate a specific case and are not needed beyond it"],
          [<b key="d">Delivered reports and PDFs</b>, <span key="r">While your account is active; removed <b>within 30 days after your account closes</b></span>, "So you can read and download what you paid for"],
          [<b key="d">Case records, evidence, audit trail</b>, "While your account is active; removed within 30 days after your account closes", "They are the record of what we delivered — including if a payment is ever disputed"],
          [<b key="d">Account details</b>, "Removed within 30 days after your account closes", ""],
          [<b key="d">Transaction and invoice records</b>, <b key="r">7 years</b>, "Legal obligation — tax and accounting"],
          [<b key="d">Support correspondence</b>, "While your account is active; removed with it", ""],
          [<b key="d">Marketing consent and unsubscribe records</b>, "Kept while you are subscribed; unsubscribe records kept permanently so you are not re-added", ""],
        ]}
      />

      <H2>Before we delete your documents</H2>
      <P>
        <b>We email you 30 days before uploaded documents reach the 12-month limit</b>, so you can download
        anything you want to keep.
      </P>
      <P>
        <b>Deletion is permanent.</b> Once a file is removed there is no recovery — not by us, not by request.
      </P>

      <H2>What happens when you close your account</H2>
      <OL>
        <li>
          <b>Before closure:</b> download any reports you want to keep. We prompt you to do this when you
          cancel
        </li>
        <li>
          <b>On closure:</b> no new submissions, sign-in disabled
        </li>
        <li>
          <b>Within 30 days:</b> reports, uploads, case records and account details deleted
        </li>
        <li>
          <b>Retained:</b> transaction and invoice records only, for 7 years
        </li>
      </OL>

      <H2>Dormant one-time accounts</H2>
      <P>
        If you bought a single report and never returned, we do not hold your data indefinitely.{" "}
        <b>After 24 months with no activity we email you</b>, and if there is no response within 30 days we
        close the account and follow the schedule above.
      </P>

      <H2>Deleting your data sooner</H2>
      <P>
        Email <b>{COMPANY.legalEmail}</b> and ask. We will delete everything except transaction records we are
        legally required to keep, and confirm within <b>30 days</b>.
      </P>

      <H2>Automated processing</H2>
      <P>
        Reports are produced by an automated research and analysis pipeline and reviewed by a person before
        delivery. <b>No report is delivered without human review.</b>
      </P>
    </LegalPage>
  );
}
