import { Text } from "@react-email/components";
import { EmailLayout, bodyText, mutedText } from "@/lib/email/templates/EmailLayout";

// ── EMAIL #2 — SUBMISSION CONFIRMATION (re-skin of the 2026-08-10 plain-text sender) ─────────
//
// LOCKED content rules carried verbatim from the sender this re-skins (machine-checked in
// notify.test.ts): no report content, no verdict/findings vocabulary, NO delivery-time promise;
// links to the portal. The words below are the approved sender's words in the approved layout.

export function SubmissionConfirmation({
  caseNumber,
  vendorName,
  caseUrl,
}: {
  caseNumber: string;
  vendorName: string | null;
  caseUrl: string;
}) {
  return (
    <EmailLayout
      preview={`Case ${caseNumber} is submitted and in the queue.`}
      heading="We received your case"
      action={{ label: "Track your case", href: caseUrl }}
    >
      <Text style={bodyText}>
        Your research request{vendorName ? <> for <b>{vendorName}</b></> : null} (case{" "}
        <span style={{ fontFamily: "Consolas, Menlo, monospace", fontSize: 14 }}>{caseNumber}</span>) has been
        submitted and is now in the queue.
      </Text>
      <Text style={bodyText}>
        Its status updates in your portal as the work progresses, and you&rsquo;ll get another email when your
        report is delivered.
      </Text>
      <Text style={mutedText}>Questions in the meantime? Use the support page in your portal.</Text>
    </EmailLayout>
  );
}
