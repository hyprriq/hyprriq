import "server-only";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCaseTrackResults } from "@/lib/data/track-results";
import { getClientDecisionSnapshot } from "@/lib/data/synthesis";
import { getProseOverrides } from "@/lib/data/proseOverrides";
import { overlayTrackRows } from "@/lib/portal/overlayDelivery";
import { resolveOperatorName } from "@/lib/data/operatorNames";
import { composeClientName } from "@/lib/pdf/clientName";
import { buildClientFindings } from "@/lib/admin/reviewView";
import { projectClientReport } from "@/lib/portal/clientReport";
import { assertNoInternalTokens } from "@/lib/portal/clientTokenCheckpoint";
import { SECTIONS } from "@/lib/content/reportDocument";
import { loadReportAssets } from "@/lib/pdf/reportAssets";
import {
  buildReportHtml, footerText, PALETTE_COLOUR, type Palette, type ReportContent,
} from "@/lib/pdf/reportTemplate";
import { presentVerdict } from "@/lib/portal/verdictPresence";
import { logVerdictAbsent } from "@/lib/portal/verdictAbsent.server";

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
  constructor(public readonly reason: "not_found" | "not_delivered" | "no_snapshot" | "no_client_name" | "no_verdict", message: string) {
    super(message);
    this.name = "ReportNotRenderable";
  }
}

interface CaseRow {
  id: string; case_number: string; client_id: string | null; vendor_name: string | null; brands_submitted: string[] | null; brands_confirmed: string[] | null;
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
    .select("id, case_number, client_id, vendor_name, brands_submitted, brands_confirmed, status, verdict, delivered_at, delivered_attempt, additional_questions, clients(full_name, company_name)")
    .eq(isUuid ? "id" : "case_number", opts.case)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) throw new ReportNotRenderable("not_found", `case ${opts.case} not found`);
  const row = data as unknown as CaseRow;

  if (row.status !== "delivered" && row.status !== "complete") {
    throw new ReportNotRenderable("not_delivered", `case ${row.case_number} is not delivered — a report PDF exists only for delivered cases`);
  }

  // The DELIVERED attempt, never the latest — a re-investigated case keeps its frozen record (H1).
  const rawRows = await getCaseTrackResults(row.id, row.delivered_attempt ?? undefined);
  // PROSE OVERRIDES ("Show + Fix" piece 2): the PDF is a client surface, so the operator's
  // rewording lands here exactly as it does on the portal projection and the publish gate.
  // (The snapshot side is overlaid inside getClientDecisionSnapshot — one reader per surface.)
  const overrides = await getProseOverrides(
    row.id,
    row.delivered_attempt ?? (rawRows.length ? Math.max(...rawRows.map((r) => r.attempt_number ?? 1)) : 1),
  );
  const { rows } = overlayTrackRows(rawRows, overrides);
  const snap = await getClientDecisionSnapshot(row.id);
  const report = projectClientReport(
    (snap?.decision_snapshot ?? null) as Record<string, unknown> | null,
    snap?.vendor_questions,
    row.additional_questions ?? [],
  );
  if (!report) throw new ReportNotRenderable("no_snapshot", `case ${row.case_number} has no decision snapshot for the delivered attempt`);

  const cl = row.clients;
  // RESOLVE-DON'T-STORE (founder-ruled 2026-08-20): the cover name comes from Clerk at render
  // time — clients.full_name is a first-visit copy that goes stale the moment a client edits
  // their profile, and this name prints on a paid deliverable. Stored value stays the fallback;
  // the no_client_name refusal below is unchanged when both are empty.
  const liveClient = await resolveOperatorName(row.client_id ?? "");
  let clientName = composeClientName(liveClient?.name, cl?.full_name, cl?.company_name);
  if (!clientName || clientName === "—") {
    if (!opts.allowMissingClientName) {
      throw new ReportNotRenderable(
        "no_client_name",
        `case ${row.case_number} has no client name on file — refusing to render a deliverable addressed to nobody. (Root cause: Stripe checkout captures customer_details.name and the webhook discards it — dev-lane fix.)`,
      );
    }
    clientName = "[Client name missing — internal proof]";
  }

  // ── THE PRESENCE CHECKPOINT BINDS HERE (founder-ruled 2026-08-18). It is already inherited
  // twice over — projectClientReport above and buildClientFindings below both assert at their
  // tails — but the ruling names PDF RENDER as a binding point, so the assembled content is
  // asserted as one payload rather than only in the two halves that happened to build it.
  //
  // ⛔ THE TEMPLATE MUST NEVER GROW TOKEN-STRIPPING TO SATISFY THIS. If it fires, the leak is
  // upstream in the projection and that is where it gets fixed. The cleaners are shape-based and
  // may always miss; this is presence-based and may never be widened into a shape matcher —
  // teaching the template to strip is exactly the merge the law forbids.
  // ── ABSENCE IS NOT A VALUE (founder-locked 2026-08-22): the old fallback-to-VBP here would
  // have attached a verdict the engine never issued to a delivered, FROZEN document — forever.
  // A missing/unrecognized verdict now refuses in the exact no_client_name pattern:
  // loud (console + audit_log + ops pager), then ReportNotRenderable("no_verdict") — the PDF job
  // treats it like every other refusal (alarm; delivery email goes out WITHOUT an attachment).
  const verdict = presentVerdict(row.verdict);
  if (!verdict) {
    await logVerdictAbsent({ caseRef: row.case_number, surface: "pdf_render", raw: row.verdict });
    throw new ReportNotRenderable(
      "no_verdict",
      `case ${row.case_number} is delivered but carries no usable verdict (${JSON.stringify(row.verdict)}) — refusing to freeze a fabricated verdict into a permanent document; an upstream invariant is broken (publish requires a verdict)`,
    );
  }

  const content = {
    caseNumber: row.case_number,
    vendor: row.vendor_name ?? "—",
    // RESOLVED brand names on the cover (founder-ruled 2026-08-20) — what was researched, not what
    // was typed; the submitted spellings render as "Submitted as: …" when any differ.
    brands: row.brands_confirmed?.length ? row.brands_confirmed : (row.brands_submitted ?? []),
    brandsSubmitted: row.brands_submitted ?? [],
    clientName,
    deliveredAt: fmt(row.delivered_at),
    verdict,
    report,
    findings: buildClientFindings(rows),
  };
  assertNoInternalTokens(content, `PDF render ${row.case_number}`);
  return content;
}

// ── Chromium ──
// THE SERVERLESS SWAP POINT, now two-lane. Serverless (Vercel/Lambda): @sparticuz/chromium — the
// platform ships NO browser binary, so without this lane the deployed render job fails on every
// invocation ("No Chrome/Chromium binary found"), which is exactly the state §4 shipped in.
// Local/VM/container: the installed Chrome (below), unchanged. Fonts are unaffected either way —
// the template embeds its faces as data URIs (lib/pdf/reportAssets.ts), never system fonts.
async function launchBrowser() {
  const puppeteer = (await import("puppeteer-core")).default;
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const executablePath = await chromium.executablePath();
    return puppeteer.launch({
      executablePath,
      headless: true,
      args: [...chromium.args, "--no-sandbox", "--disable-dev-shm-usage"],
    });
  }
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
