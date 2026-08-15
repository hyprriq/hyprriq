// ── DOCUMENT IDENTITY STRINGS (REPORT_DOCUMENT_IDENTITY_SPEC.md, 2026-08-15) — the client-facing
// strings a delivered PDF carries beyond the report content itself. Single source: the PDF
// generator (scripts/pdf/generate-samples.tsx) and the banned-language fixture import from HERE
// (standing rule 8: imported, never copied). The legal-entity line is founder-ruled: the trading
// name alone is not sufficient on a commercial document. ──

export const DOC_TITLE = "Source Intelligence Report";

export const ISSUER = "Hyprr Retail LLC · hyprriq.com";

export const confidentialityLine = (clientName: string) =>
  `Prepared for ${clientName}. This report is for the named client and is not for redistribution.`;

export const runningFooter = (caseNumber: string, page: number, total: number, deliveredDate: string) =>
  `${caseNumber} · Page ${page} of ${total} · Delivered ${deliveredDate}`;
