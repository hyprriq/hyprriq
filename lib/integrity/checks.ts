// ── THE STANDING INTEGRITY CHECKS (founder-locked 2026-08-22) ────────────────────────────────
//
// THE PRINCIPLE, in the founder's words: every census run by hand this week becomes a standing
// check. Hand-auditing works at 45 cases with one person reading everything; it does not work at
// 500. These run themselves, on every case, forever.
//
// THREE SHAPES, and each check declares its own:
//   BLOCK   — prevents the bad thing at the moment it would happen (publish gate, build gate).
//   ALERT   — runs on a schedule, finds drift across the corpus, pages once per NEW finding.
//   SURFACE — visible in /admin/integrity so the founder can look without running SQL.
// Most are BLOCK. Anything only visible corpus-wide is ALERT. Everything is SURFACE.
//
// ⛔ EVERY DETECTOR HERE SHIPPED WITH A MEASURED FALSE-POSITIVE COUNT OF ZERO across all 45
// cases (scripts/integrity-measure.ts). A check that fires on healthy cases does not ship — a
// false-alarm system is worse than none, because it teaches the founder to dismiss the alarm.

export type CheckShape = "BLOCK" | "ALERT";

export interface CheckSpec {
  id: string;
  /** Plain English. The founder reads this, not the code. */
  title: string;
  /** What it means when this fires, and what to do. */
  meaning: string;
  shapes: CheckShape[];
  /** Where each shape is enforced. */
  where: string;
  /** Measured on the corpus the day it shipped. */
  measured: string;
}

export const CHECKS: CheckSpec[] = [
  {
    id: "internal_markers",
    title: "Internal citation markers in a client's report",
    meaning:
      "An engine working-note (A-014, RG-002, src_7, EV-001) is present in text a client reads. " +
      "It means a cleaner missed a shape nobody had seen. Fix the projection, never the render site.",
    shapes: ["BLOCK", "ALERT"],
    where: "BLOCK: the publish gate refuses (422). ALERT: the nightly sweep re-checks already-delivered reports.",
    measured: "45/45 clean on 2026-08-22, after 17 real leaks across 4 cases (3 delivered) were closed.",
  },
  {
    id: "internal_content",
    title: "Internal vocabulary in a client's report",
    meaning:
      "An internal key or engine scaffold (brand_risk, soft_fail, 'Module 4', '[leading hypothesis]') " +
      "reached client prose. The marker leak was one instance of this wider class.",
    shapes: ["BLOCK", "ALERT"],
    where: "BLOCK: the publish gate's presence checkpoint. ALERT: the nightly sweep.",
    measured: "45/45 clean on 2026-08-22, after '(brand_risk)' was found on a delivered report.",
  },
  {
    id: "verdict_replay_divergence",
    title: "A delivered verdict the engine would no longer produce",
    meaning:
      "Replaying today's engine over a delivered case's own frozen inputs yields a different verdict. " +
      "It is INVESTIGATED, never smoothed — see the divergence law in docs/goldenCases.md.",
    shapes: ["ALERT"],
    where: "ALERT only: it can only be seen by replaying the whole corpus. Nightly sweep.",
    measured: "2 known divergences on 2026-08-22 (AWI-2606-003, AWI-2607-022), both older pipelines.",
  },
  {
    id: "delivered_without_verdict",
    title: "A delivered case carrying no verdict",
    meaning:
      "A client can reach a report with no verdict behind it. The render surfaces refuse rather than " +
      "invent one, so the client sees a holding-back panel — but the case should never be in this state.",
    shapes: ["ALERT"],
    where: "ALERT: nightly sweep. The render surfaces already refuse (absence-is-not-a-value).",
    measured: "0 of 45 on 2026-08-22.",
  },
  {
    id: "live_case_ids_on_surfaces",
    title: "A marketing or preview surface showing a real-looking case ID",
    meaning:
      "A mock is using the live AWI-YYMM-NNN shape, so it can collide with a real case. " +
      "Presentation surfaces must use the reserved AWI-SAMPLE-NNN series.",
    shapes: ["BLOCK"],
    where: "BLOCK: the build (sampleIdentifiers.lock.test.ts walks the filesystem).",
    measured: "5 surfaces corrected on 2026-08-22; the lock catches any NEW surface.",
  },
];

export const CHECK_BY_ID = new Map(CHECKS.map((c) => [c.id, c]));

// ── THE 1e VOCABULARY. Internal content that is NOT a citation marker (those live in the
// presence checkpoint). Measured across 45 cases: zero legitimate occurrences.
//
// ⚠ These are asserted because a client would never write or read them. Compare the shapes that
// are deliberately NOT here: product models, ASINs, SEC filing names (S-1, 10-K) — real client
// content that a wider rule would corrupt. See clientTokenCheckpoint's header.
export const INTERNAL_CONTENT_PATTERNS: { name: string; re: RegExp }[] = [
  // Track keys and their short aliases. The substitution derives from AREA_NAMES, but a cleaner
  // may always miss; this is the backstop that refuses instead of guessing.
  { name: "track-key", re: /(?<![A-Za-z0-9_])(?:supplier_identity|supply_chain_relationship|brand_risk_assessment|brand_risk|documentation_review|sourcing_logic|category_compliance|intake_scope_guard)(?![A-Za-z0-9_])/ },
  // Internal signal enums — the operator's vocabulary, never the client's.
  { name: "signal-enum", re: /(?<![A-Za-z0-9_])(?:soft_fail|hard_fail|manual_review_required|founder_review_status|n_a)(?![A-Za-z0-9_])/ },
  // Engine reasoning scaffold left in prose.
  { name: "hypothesis-tag", re: /\[(?:leading|alternative)\s+hypothesis[^\]]*\]/i },
  // Synthesis module / track numbering.
  { name: "module-ref", re: /(?<![A-Za-z0-9])Module\s*\d(?![0-9])/i },
  { name: "track-number", re: /(?<![A-Za-z0-9])Track\s*\d(?![0-9])/i },
];
