import { VERDICT_SCALE_ORDER } from "@/lib/content/reportCopy";

// ── ABSENCE IS NOT A VALUE (founder-locked 2026-08-22) ───────────────────────────────────────
//
// The founding invariant is that the model proposes and CODE DECIDES — and a render-time
// default that invents "Verify Before Purchase" is code deciding a verdict with no engine
// involved. Four sites carried exactly that fabrication (report-view ×2, renderReportPdf,
// reportTemplate); in the PDF case the invented verdict would have been attached to a
// delivered, frozen document forever.
//
// THIS MODULE IS THE ONE NOTION OF "IS A VERDICT PRESENT" at every render surface. It decides
// NOTHING about what a verdict is — the engine's verdict column is read, validated against the
// canonical scale (VERDICT_SCALE_ORDER, the shared copy module's own order — never a second
// list), and either returned typed or refused. Unrecognized strings are absent too: a lookup
// that would miss the meta table must never half-render.
//
// The caller lock (verdictPresence.lock.test.ts) walks the render layers and fails the build
// if any file re-grows a fallback TO A VERDICT VALUE. Falling back to an honest NON-verdict
// ("pending", "—") remains legal — absence may be named, never replaced.
//
// Pure and isomorphic (client components import this); the LOUD side lives in
// verdictAbsent.server.ts.

export type PresentVerdict = (typeof VERDICT_SCALE_ORDER)[number];

export class VerdictAbsentError extends Error {
  constructor(public readonly caseRef: string, public readonly surface: string, public readonly raw: string | null | undefined) {
    super(
      `verdict absent at render (case ${caseRef}, surface ${surface}): got ${raw === undefined ? "undefined" : JSON.stringify(raw)} — ` +
      `refusing to display a verdict the engine never issued`,
    );
    this.name = "VerdictAbsentError";
  }
}

/** The typed verdict when present and canonical; null for null/undefined/empty/unrecognized. */
export function presentVerdict(raw: string | null | undefined): PresentVerdict | null {
  return (VERDICT_SCALE_ORDER as readonly string[]).includes(raw ?? "") ? (raw as PresentVerdict) : null;
}

/** The throwing form — for surfaces where reaching this point without a verdict IS the bug. */
export function requireVerdict(raw: string | null | undefined, ctx: { caseRef: string; surface: string }): PresentVerdict {
  const v = presentVerdict(raw);
  if (!v) throw new VerdictAbsentError(ctx.caseRef, ctx.surface, raw);
  return v;
}

// The client-facing refusal (portal report page). Implies NO verdict, promises no timeline,
// gives the honest mechanism and a path. Joins MUST_PASS in the same commit.
export const VERDICT_ABSENT_TITLE = "This report can't be shown right now";
export const VERDICT_ABSENT_BODY =
  "Something on our side didn't pass the checks we run before showing a report, so we're holding it back rather than show you something unverified. The issue is recorded for our team, and your report and credit are safe. If you need this urgently, message support and include the case number.";

// The operator-facing note (admin review's client-view preview). Names the truth instead of
// previewing a fabricated client screen — a wrong preview shown to an operator becomes a wrong
// report.
export const VERDICT_ABSENT_PREVIEW_NOTE =
  "No verdict is on this case yet, so there is no client screen to preview — the client view renders only from a computed verdict, never a placeholder.";
