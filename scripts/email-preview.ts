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
