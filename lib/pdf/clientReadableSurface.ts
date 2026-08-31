// Structurally typed rather than importing Finding — reviewView keeps it local, and this file
// only needs the two fields it forwards plus the ones it deliberately drops.

/**
 * WHAT A CLIENT ACTUALLY READS in a rendered report — the surface the presence checkpoint is
 * asserted against.
 *
 * ⚠ WHY THIS EXISTS. The PDF render asserted the presence checkpoint against the WHOLE assembled
 * payload, structural fields included. `findings[].track_key` holds `supplier_identity`, which is
 * one of the internal-content patterns — so EVERY PDF failed, on all five areas, with
 * `InternalTokenLeak`. The guard was reading its own lookup keys as a leak.
 *
 * THE DISTINCTION IS THE FOUNDER'S OWN, drawn during the pricing work: A KEY INSIDE PROSE FAILS;
 * A KEY AS A LOOKUP STAYS LEGAL. `track_key` never renders — the PDF prints "Supplier Legitimacy",
 * and the key is the lookup that produces it.
 *
 * ⛔ AND THE FIX IS THE PROJECTION, NEVER THE GUARD. The checkpoint's own law forbids widening it
 * with grammar or context ("the moment someone adds grammar-awareness here to fix a false positive,
 * it stops being a backstop"). Nothing in lib/portal/clientTokenCheckpoint.ts changed. What changed
 * is WHICH BYTES are handed to it — a scope decision, made once, in the open.
 *
 * ⚠ THIS PATTERN ALREADY EXISTED AND THE PDF WAS THE OUTLIER. lib/integrity/sweep.ts builds
 * `clientPayload` under the comment "ONLY the fields a client actually reads" and scans that. The
 * portal path asserts inside `cleanClientFindingJson`, which only ever sees prose. The publish gate
 * scans `projectedForClient`, also prose. FOUR call sites, THREE already scoped. This makes the
 * fourth agree rather than inventing a new rule.
 *
 * ── HOW TO CLASSIFY A NEW FIELD, because the next person adding one needs to know the side ──
 * Ask ONE question: do these exact bytes reach the reader's eye?
 *   · Printed, in any form, even inside a longer sentence  → "read"    → SCANNED
 *   · Compared, or used as a key into a lookup table       → "lookup"  → NOT scanned
 *   · Present on the object but never touched by the template → "unrendered" → NOT scanned
 * If you cannot answer without opening the template, open the template. A field guessed onto the
 * "lookup" side is a leak the backstop will no longer catch — that is the whole cost of this file,
 * and it is why the classification is asserted field-by-field in the lock rather than inferred.
 */

/** Every top-level field of the PDF content payload, classified. The lock requires completeness. */
export const PDF_CONTENT_FIELDS = {
  /** Printed on the cover. */
  caseNumber: "read",
  /** Printed — the supplier the report is about. */
  vendor: "read",
  /** Printed — resolved brand names. */
  brands: "read",
  /** Printed as "Submitted as: …" when the spellings differ. */
  brandsSubmitted: "read",
  /** Printed — the deliverable is addressed to them. */
  clientName: "read",
  /** Printed. */
  deliveredAt: "read",
  /** The projected client report. All prose. */
  report: "read",
  /**
   * A LOOKUP KEY, not prose. `requireVerdict(c.verdict)` then `VERDICT_COPY[verdict].name` and
   * `PALETTE_COLOUR.verdict[verdict]`. The reader sees "Verify Before Purchase"; they never see
   * `verify_before_purchase`. Structurally identical to track_key, and listed here explicitly so
   * that if verdict keys ever join the internal patterns, this does not fail the same way.
   */
  verdict: "lookup",
  /** Mixed — see PDF_FINDING_FIELDS. */
  findings: "mixed",
} as const;

/** Every field of a Finding as the PDF receives it, classified. */
export const PDF_FINDING_FIELDS = {
  /** Row UUID. Zero uses in reportTemplate.ts — verified, not assumed. */
  id: "unrendered",
  /** Track number. Zero uses in reportTemplate.ts. */
  track: "unrendered",
  /**
   * ⚠ THE FIELD THAT BROKE EVERY PDF FOR NINE DAYS. Used only in comparisons —
   * `isAssessmentArea(f.track_key)`, `f.track_key === "sourcing_logic"` — and as the key into
   * AREA_NAMES. The client reads "Supplier Legitimacy". Never printed.
   */
  track_key: "lookup",
  /**
   * An enum compared to produce a chip label:
   * `f.finding_certainty === "verified" ? "Verified" : "Assessed"`. The word on the page is the
   * label, never the enum.
   */
  finding_certainty: "lookup",
  /** The findings prose. THE thing a client reads. */
  compiled_findings_json: "read",
  /** The questions prose. Read. */
  questions_to_ask: "read",
} as const;

export type ReadableSurface = {
  caseNumber: string;
  vendor: string;
  brands: string[];
  brandsSubmitted: string[];
  clientName: string;
  deliveredAt: string;
  report: unknown;
  findings: { compiled_findings_json: unknown; questions_to_ask: unknown }[];
};

/**
 * Reduce the assembled PDF payload to the bytes a reader sees. Anything omitted here is NOT
 * checked by the presence backstop, which is why every omission above carries its reason.
 */
export function clientReadableSurface(content: {
  caseNumber: string;
  vendor: string;
  brands: string[];
  brandsSubmitted: string[];
  clientName: string;
  deliveredAt: string;
  report: unknown;
  findings: { compiled_findings_json: unknown; questions_to_ask: unknown }[];
}): ReadableSurface {
  return {
    caseNumber: content.caseNumber,
    vendor: content.vendor,
    brands: content.brands,
    brandsSubmitted: content.brandsSubmitted,
    clientName: content.clientName,
    deliveredAt: content.deliveredAt,
    report: content.report,
    findings: content.findings.map((f) => ({
      compiled_findings_json: f.compiled_findings_json,
      questions_to_ask: f.questions_to_ask,
    })),
  };
}
