// ── REPORT DOCUMENT — structural copy (PDF rebuild brief, 2026-08-16). The document's OWN
// language: section titles, contents-page lines, table headers, captions, footer. These dress
// the report for print; they never restate or replace engine content. ONE FIXED TEMPLATE:
// every report renders through these same strings — never per-report invention.
// All strings here are client-facing → they join the banned-language MUST_PASS fixture
// (imported, never copied — standing rule 8).
import { DOC_TITLE } from "@/lib/content/documentIdentity";

export const SECTIONS = [
  { no: "01", title: "The verdict", toc: "The decision, the four-level scale, and the single most important risk." },
  // Claims ruling 2026-08-14: plan-neutral — no case context reaches these constants inside the
  // paused PDF renderer, so no count is claimed (reported; count-derivation lands with the PDF lane).
  { no: "02", title: "Assessment findings", toc: "The assessment areas your plan includes, examined in detail." },
  { no: "03", title: "What we could not confirm", toc: "The reading, its limits, and what to monitor." },
  { no: "04", title: "Verification checklist", toc: "The questions to put to the supplier before you commit." },
  { no: "05", title: "Scope, definitions & limits", toc: "How to read this report, and what it does not claim." },
] as const;

export const CONTENTS_TITLE = "Contents";

export const AREAS_TABLE = {
  caption: "The assessment areas at a glance",
  colArea: "Assessment area",
  colStatus: "Certainty",
} as const;

export const CHECKLIST_TABLE = {
  colNo: "No.",
  colQuestion: "Question to put to your supplier",
  analystNote: "Added by our review team during quality review.",
} as const;

export const MONITOR_TABLE_CAPTION = "What to monitor after purchase";

export const BOUNDARY_CALLOUT_LABEL = "Limits of this reading";

// Areas the engine marks Not assessed / Informational carry a one-line engine statement, not
// findings prose — the document presents it as a scope note (v2 formatting fix §4).
export const SCOPE_NOTE_LABEL = "Scope note";

export const COVER_META_LABELS = {
  preparedFor: "Prepared for",
  delivered: "Delivered",
  caseRef: "Case reference",
  inside: "What's inside",
} as const;

/**
 * THE PHONE SIGNPOST (founder-ruled 2026-08-24, option C).
 *
 * The PDF stays a PRINT AND FILING document and is not being redesigned. Measured, it cannot be
 * made legible on a phone by resizing: the page is 8.5in = 816 CSS px, which a 390px screen fits
 * at scale 0.478, so the 10pt body lands at about 6.4 CSS px. Reaching a comfortable 16px would
 * need a ~25pt body — roughly thirty characters to a line — and even A5 only reaches 8.9px. The
 * arithmetic rules that option out rather than an opinion.
 *
 * So the phone path is the PORTAL, which already renders this report responsively at 16px, and
 * which the delivery email already leads with. This one line is the only thing the PDF gains: a
 * signpost for the client who opens the attachment directly and would otherwise be pinching.
 *
 * No promise, no outcome language — it points at a page.
 */
export const coverPhoneLine = (portalUrl: string) =>
  `Reading this on a phone? The same report is in your portal, sized for a small screen — ${portalUrl}`;

export const coverInsideLine = (questionCount: number) =>
  `Verdict · the assessment areas your plan includes · ${questionCount} verification questions`;

// Running footer for the full document (brief §3: document · client · page).
export const documentFooter = (clientName: string, page: number, total: number) =>
  `${DOC_TITLE} · Prepared for ${clientName} · Page ${page} of ${total}`;
