// ── EMAIL DESIGN PREVIEW (ADR-EMAIL-001, action item 1) — renders templates to browser-openable
// HTML for founder approval, the same fast-feedback loop the PDF design used. READ-ONLY: no
// sends, no DB.
//
//   npx tsx --tsconfig tsconfig.json scripts/email-preview.ts <out-dir>
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { render } from "@react-email/render";
import { createElement } from "react";
import { DeliveryNotification } from "@/lib/email/templates/DeliveryNotification";
import { SubmissionConfirmation } from "@/lib/email/templates/SubmissionConfirmation";
import { Welcome } from "@/lib/email/templates/Welcome";
import { AdminInvitation } from "@/lib/email/templates/AdminInvitation";
import { OpsAlert } from "@/lib/email/templates/OpsAlert";
import { PaymentFailed } from "@/lib/email/templates/PaymentFailed";
import { LowCredit } from "@/lib/email/templates/LowCredit";
import { RenewalReminder } from "@/lib/email/templates/RenewalReminder";
import { scanHard } from "@/lib/utils/banned-language";

async function main() {
  const outDir = process.argv[2] ?? ".";
  mkdirSync(outDir, { recursive: true });

  const variants = [
    {
      file: "delivery-with-pdf.html",
      el: createElement(DeliveryNotification, {
        caseNumber: "AWI-2608-042",
        vendorName: "Meridian Trade Supply",
        caseUrl: "https://hyprriq.com/portal/cases/example",
        hasAttachment: true,
      }),
    },
    {
      file: "delivery-no-pdf.html",
      el: createElement(DeliveryNotification, {
        caseNumber: "AWI-2608-042",
        vendorName: null,
        caseUrl: "https://hyprriq.com/portal/cases/example",
        hasAttachment: false,
      }),
    },
    // ── 2026-08-21 batch (post-approval re-skins + welcome): same fast-feedback loop.
    {
      file: "submission-confirmation.html",
      el: createElement(SubmissionConfirmation, {
        caseNumber: "AWI-2608-044",
        vendorName: "Meridian Trade Supply",
        caseUrl: "https://hyprriq.com/portal/cases/example",
      }),
    },
    {
      file: "welcome.html",
      el: createElement(Welcome, { name: "Alex", portalUrl: "https://hyprriq.com/portal" }),
    },
    {
      file: "admin-invitation.html",
      el: createElement(AdminInvitation, {
        to: "ops@example.com",
        signUpUrl: "https://hyprriq.com/admin/sign-up?ticket=example",
        invitedByEmail: "The HyprrIQ founder",
        expiresDays: 7,
      }),
    },
    {
      file: "ops-alert.html",
      el: createElement(OpsAlert, {
        heading: "Pipeline failed for case AWI-2608-044",
        fragmentHtml: "<p>All retries exhausted; case marked research_failed.</p><p>Timeout acquiring evidence pack.</p>",
      }),
    },
    // ── Emails 4–7 (built 2026-08-21, post-migration).
    {
      file: "payment-failed.html",
      el: createElement(PaymentFailed, { name: "Alex", billingUrl: "https://hyprriq.com/portal/billing" }),
    },
    {
      file: "low-credit-1.html",
      el: createElement(LowCredit, { name: "Alex", threshold: 1, renewalDate: "2026-09-14", portalUrl: "https://hyprriq.com/portal" }),
    },
    {
      file: "low-credit-0.html",
      el: createElement(LowCredit, { name: null, threshold: 0, renewalDate: null, portalUrl: "https://hyprriq.com/portal" }),
    },
    {
      file: "renewal-reminder.html",
      el: createElement(RenewalReminder, { name: "Alex", renewalDate: "2026-09-14", billingUrl: "https://hyprriq.com/portal/billing" }),
    },
  ];

  for (const v of variants) {
    const html = await render(v.el);
    // The gate scans the RENDERED string — the whole point of in-repo templates.
    const violations = scanHard(html);
    if (violations.length) throw new Error(`${v.file} trips the gate: ${violations.join(", ")}`);
    writeFileSync(join(outDir, v.file), html, "utf8");
    console.log(`✔ ${v.file} (${html.length} bytes, gate clean)`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
