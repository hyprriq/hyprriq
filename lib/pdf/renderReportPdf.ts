import "server-only";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCaseTrackResults } from "@/lib/data/track-results";
import { getClientDecisionSnapshot } from "@/lib/data/synthesis";
import { buildClientFindings } from "@/lib/admin/reviewView";
import { projectClientReport } from "@/lib/portal/clientReport";
import { SECTIONS } from "@/lib/content/reportDocument";
import { loadReportAssets } from "@/lib/pdf/reportAssets";
import {
  buildReportHtml, footerText, PALETTE_COLOUR, type Palette, type ReportContent,
} from "@/lib/pdf/reportTemplate";

// ── THE REPORT PDF RENDERER — the integration entry point (see docs/PDF_INTEGRATION_HANDOFF.md).
// Loads a delivered case through the SAME projection chain the portal uses, builds the document
// HTML, and prints it with headless Chromium. Deterministic: one fixed template, same inputs →
// same document.
//
// CALL: renderCaseReportPdf({ case: caseId }) → { pdf, html, pages, content }
//
// TWO HARD RULES, enforced here and not overridable from a route:
//  1. Only DELIVERED cases render (a PDF is the delivered artifact, never a preview of one).
//  2. A missing client name THROWS. No deliverable is addressed to nobody. The internal-proof
//     escape is an explicit parameter, never an ambient env var.
// ──

export class ReportNotRenderable extends Error {
  constructor(public readonly reason: "not_found" | "not_delivered" | "no_snapshot" | "no_client_name", message: string) {
    super(message);
    this.name = "ReportNotRenderable";
  }
}

interface CaseRow {
  id: string; case_number: string; vendor_name: string | null; brands_submitted: string[] | null;
  status: string; verdict: string | null; delivered_at: string | null; delivered_attempt: number | null;
  additional_questions: { question?: string }[] | null;
  clients: { full_name: string | null; company_name: string | null } | null;
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—");

export interface LoadOptions {
  /** Case UUID or case_number. */
  case: string;
  /**
   * INTERNAL PROOFS ONLY. Renders a visibly-marked placeholder where the client's name belongs
   * instead of throwing. Never set this on a client-facing path — the resulting file is
   * undeliverable by inspection, which is the point.
   */
  allowMissingClientName?: boolean;
}

/** Loads the delivered case through the portal's projection chain. Server-only. */
export async function loadReportContent(opts: LoadOptions): Promise<ReportContent> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(opts.case);
  const { data } = await supabaseAdmin
    .from("cases")
    .select("id, case_number, vendor_name, brands_submitted, status, verdict, delivered_at, delivered_attempt, additional_questions, clients(full_name, company_name)")
    .eq(isUuid ? "id" : "case_number", opts.case)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) throw new ReportNotRenderable("not_found", `case ${opts.case} not found`);
  const row = data as unknown as CaseRow;

  if (row.status !== "delivered" && row.status !== "complete") {
    throw new ReportNotRenderable("not_delivered", `case ${row.case_number} is not delivered — a report PDF exists only for delivered cases`);
  }

  // The DELIVERED attempt, never the latest — a re-investigated case keeps its frozen record (H1).
  const rows = await getCaseTrackResults(row.id, row.delivered_attempt ?? undefined);
  const snap = await getClientDecisionSnapshot(row.id);
  const report = projectClientReport(
    (snap?.decision_snapshot ?? null) as Record<string, unknown> | null,
    snap?.vendor_questions,
    row.additional_questions ?? [],
  );
  if (!report) throw new ReportNotRenderable("no_snapshot", `case ${row.case_number} has no decision snapshot for the delivered attempt`);

  const cl = row.clients;
  let clientName = cl?.company_name ? `${cl?.full_name ?? ""} (${cl.company_name})`.trim() : (cl?.full_name ?? "");
  if (!clientName || clientName === "—") {
    if (!opts.allowMissingClientName) {
      throw new ReportNotRenderable(
        "no_client_name",
        `case ${row.case_number} has no client name on file — refusing to render a deliverable addressed to nobody. (Root cause: Stripe checkout captures customer_details.name and the webhook discards it — dev-lane fix.)`,
      );
    }
    clientName = "[Client name missing — internal proof]";
  }

  return {
    caseNumber: row.case_number,
    vendor: row.vendor_name ?? "—",
    brands: row.brands_submitted ?? [],
    clientName,
    deliveredAt: fmt(row.delivered_at),
    verdict: row.verdict ?? "verify_before_purchase",
    report,
    findings: buildClientFindings(rows),
  };
}

// ── Chromium ──
// THE SERVERLESS SWAP POINT. Local/VM/container: the installed Chrome (below). On a platform
// with no browser binary (e.g. Vercel functions), replace this one function with
// @sparticuz/chromium — everything above and below is unchanged. See the handoff doc.
async function launchBrowser() {
  const puppeteer = (await import("puppeteer-core")).default;
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean) as string[];
  const executablePath = candidates.find((p) => fs.existsSync(p));
  if (!executablePath) throw new Error("No Chrome/Chromium binary found — set CHROME_PATH, or swap launchBrowser() for @sparticuz/chromium on serverless.");
  return puppeteer.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
}

/** Prints one HTML document to PDF bytes. */
export async function printHtmlToPdf(html: string, footer: string): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    // A temp file (rather than setContent) keeps relative resolution and print CSS identical to
    // the browser-preview path, so what the founder reviews is what the client receives.
    const tmp = path.join(os.tmpdir(), `hyprriq-report-${process.pid}-${Math.abs(html.length)}.html`);
    fs.writeFileSync(tmp, html);
    try {
      await page.goto(pathToFileURL(tmp).href, { waitUntil: "networkidle0" });
      const bytes = await page.pdf({
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: "<span></span>",
        footerTemplate: `<div style="width:100%;font-size:7px;color:#43494F;padding:0 60pt;">${footer
          .replace(/&/g, "&amp;").replace(/</g, "&lt;")} · Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
      });
      return Buffer.from(bytes);
    } finally {
      fs.unlinkSync(tmp);
    }
  } finally {
    await browser.close();
  }
}

/** Reads back which page each numbered section starts on (drives the contents page). */
async function sectionPages(pdf: Buffer): Promise<{ toc: Record<string, number>; pageCount: number }> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(pdf), useSystemFonts: true }).promise;
  const pages: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    pages.push((tc.items as { str: string }[]).map((i) => i.str).join(" ").replace(/\s+/g, " "));
  }
  const toc: Record<string, number> = {};
  for (const s of SECTIONS) {
    // Page 2 is the contents page, which also names every section — skip it.
    const idx = pages.findIndex((t, i) => i + 1 > 2 && t.includes(s.no) && t.includes(s.title));
    if (idx >= 0) toc[s.no] = idx + 1;
  }
  return { toc, pageCount: doc.numPages };
}

export interface RenderResult {
  pdf: Buffer;
  /** The exact document as HTML — self-contained; open it in any browser to review. */
  html: string;
  toc: Record<string, number>;
  pageCount: number;
  content: ReportContent;
}

export interface RenderOptions extends LoadOptions {
  /** Defaults to the deliverable colour palette. PALETTE_PRINT_CHECK is an internal proof only. */
  palette?: Palette;
}

/**
 * Renders a delivered case to its client report PDF.
 * Two print passes: the first measures where each section lands, the second prints the real
 * contents-page numbers.
 */
export async function renderCaseReportPdf(opts: RenderOptions): Promise<RenderResult> {
  const content = await loadReportContent(opts);
  const assets = loadReportAssets();
  const palette = opts.palette ?? PALETTE_COLOUR;
  const footer = footerText(content.clientName);

  const measured = await printHtmlToPdf(buildReportHtml(content, { palette, assets }), footer);
  const { toc } = await sectionPages(measured);

  const html = buildReportHtml(content, { palette, toc, assets });
  const pdf = await printHtmlToPdf(html, footer);
  const { pageCount } = await sectionPages(pdf);
  return { pdf, html, toc, pageCount, content };
}
