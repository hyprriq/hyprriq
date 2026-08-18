/**
 * REPORT PDF — command-line wrapper (design lane).
 * The renderer itself lives in lib/pdf/ and is what the app integrates:
 *   lib/pdf/renderReportPdf.ts   ← entry point: renderCaseReportPdf({ case })
 *   lib/pdf/reportTemplate.ts    ← the document (pure)
 *   lib/pdf/reportAssets.ts      ← embedded fonts + wordmark
 * See docs/PDF_INTEGRATION_HANDOFF.md.
 *
 * Run:  npx tsx scripts/pdf/report-html.ts [case_number] [--print-check]
 *
 * Writes to docs/pdf-samples/:
 *   <case>-report.pdf    THE DELIVERABLE — the client's report, in colour.
 *   <case>-report.html   the same document as a self-contained page; open it in a browser to
 *                        review pages without a rebuild.
 *   <case>-report-print-check.pdf   only with --print-check. NOT a deliverable: a greyscale
 *                        proof that no meaning is carried by hue (mono office printer).
 *
 * PDF_ALLOW_MISSING_NAME=1 renders a visibly-marked internal proof for a case with no client
 * name on file. Never use it for anything a client sees.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

async function run() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const printCheck = process.argv.includes("--print-check");
  const caseNumber = args[0] ?? "AWI-2607-022";

  const { renderCaseReportPdf } = await import("@/lib/pdf/renderReportPdf");
  const { PALETTE_PRINT_CHECK } = await import("@/lib/pdf/reportTemplate");

  const outDir = path.join(process.cwd(), "docs/pdf-samples");
  fs.mkdirSync(outDir, { recursive: true });
  const allowMissingClientName = process.env.PDF_ALLOW_MISSING_NAME === "1";

  const r = await renderCaseReportPdf({ case: caseNumber, allowMissingClientName });
  fs.writeFileSync(path.join(outDir, `${caseNumber}-report.pdf`), r.pdf);
  fs.writeFileSync(path.join(outDir, `${caseNumber}-report.html`), r.html);
  console.log(`wrote ${caseNumber}-report.pdf  (${r.pageCount} pages, contents ${JSON.stringify(r.toc)})`);
  console.log(`wrote ${caseNumber}-report.html (browser preview)`);

  if (printCheck) {
    const g = await renderCaseReportPdf({ case: caseNumber, allowMissingClientName, palette: PALETTE_PRINT_CHECK });
    fs.writeFileSync(path.join(outDir, `${caseNumber}-report-print-check.pdf`), g.pdf);
    console.log(`wrote ${caseNumber}-report-print-check.pdf (greyscale proof — not a deliverable)`);
  }

  console.log(`content: ${r.content.findings.length} areas · ${r.content.report.questions.length} questions · ${r.content.report.what_to_monitor.length} monitor items · verdict ${r.content.verdict}`);
}

// The projection chain is server-only poisoned; re-exec under the react-server condition once.
if (!process.env.PDF_CHILD) {
  const res = spawnSync(
    "npx",
    ["tsx", "--conditions=react-server", "--tsconfig", "tsconfig.json", "--env-file=.env.local", "scripts/pdf/report-html.ts", ...process.argv.slice(2)],
    { shell: true, stdio: "inherit", env: { ...process.env, PDF_CHILD: "1" } },
  );
  process.exit(res.status ?? 1);
} else {
  run().then(() => process.exit(0)).catch((e) => { console.error(String(e?.message ?? e)); process.exit(1); });
}
