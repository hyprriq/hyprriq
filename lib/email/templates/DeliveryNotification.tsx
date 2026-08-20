import { Text, Link } from "@react-email/components";
import { EmailLayout, bodyText, mutedText } from "@/lib/email/templates/EmailLayout";
import { SITE_URL } from "@/lib/constants/site";

// ── EMAIL #3 — REPORT DELIVERED (the design-approval template, ADR-EMAIL-001) ────────────────
//
// Content rules, inherited verbatim from the plain-text sender this re-skins:
//   · NO verdict content — the report's conclusions never sit unencrypted in a forwardable inbox
//   · the attachment line is CHOSEN FROM WHAT SHIPPED — never promises a PDF that isn't attached
//   · the "how to read" link rides INSIDE this email (founder-ruled: no second send)
// Every string goes through the banned-language email gate after render, exactly as before.

export function DeliveryNotification({
  caseNumber,
  vendorName,
  caseUrl,
  hasAttachment,
}: {
  caseNumber: string;
  vendorName: string | null;
  caseUrl: string;
  hasAttachment: boolean;
}) {
  return (
    <EmailLayout
      preview={`Your report ${caseNumber} is ready — the verdict, the evidence, and the questions to ask.`}
      heading="Your report is ready"
      action={{ label: "View your report", href: caseUrl }}
    >
      <Text style={bodyText}>
        Your source intelligence report{vendorName ? <> for <b>{vendorName}</b></> : null} (case{" "}
        <span style={{ fontFamily: "Consolas, Menlo, monospace", fontSize: 14 }}>{caseNumber}</span>) has been
        delivered.
      </Text>
      <Text style={bodyText}>
        {hasAttachment
          ? "Your full report is attached as a PDF, and it is also in your portal — the verdict, the evidence behind it, and the questions to ask your supplier."
          : "Your full report is ready to read in your portal — the verdict, the evidence behind it, and the questions to ask your supplier."}
      </Text>
      <Text style={mutedText}>
        First report? Two minutes with{" "}
        <Link href={`${SITE_URL}/portal/help`} style={{ color: "#122E4A", textDecoration: "underline" }}>
          how to read your report
        </Link>{" "}
        shows you what each verdict means and where to start.
      </Text>
    </EmailLayout>
  );
}
