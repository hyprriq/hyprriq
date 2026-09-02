import { TRACKS } from "@/lib/constants/tracks";

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
// ── THE TRACK-KEY ALTERNATION IS GENERATED, NOT HAND-LISTED (founder-ruled 2026-09-01) ───────
//
// ⚠ WHY. `(EV-011, supply_chain)` reached a client PDF. The pattern matched
// `supply_chain_relationship`, so the TRUNCATED form walked past it — standing rule 11, a pattern
// that cannot match the shape that actually occurs.
//
// ⛔ AND IT HAD ALREADY HAPPENED ONCE, WHICH IS THE REAL FINDING. A 2026-08-22 census found
// "(brand_risk)" on a delivered report and the fix ADDED `brand_risk` to this alternation by hand.
// That fixed the instance and left the class, so `supply_chain` leaked the same way nine days
// later. The founder's read: "The pattern list was written from full keys and the prose carries
// short ones." A list that must be remembered will be forgotten; a derivation cannot be.
//
// THE BOUNDARY, stated so it can be argued with: every MULTI-SEGMENT prefix of a registered track
// key. Two segments minimum — single words ("supply", "brand", "sourcing", "documentation") are
// ordinary English and a rule matching them would corrupt real client content, which is exactly
// the failure this file's header warns about for ASINs and SEC filing names.
//
// Adding a track now extends the pattern automatically. Nobody has to remember.
const TRACK_KEY_FORMS: string[] = (() => {
  const out = new Set<string>();
  // category_compliance is track 6 and carries no TRACKS row; it is named here for that reason
  // ONLY, and any key with a row must never be added by hand.
  for (const key of [...TRACKS.map((t) => t.track_key as string), "category_compliance"]) {
    const parts = key.split("_");
    for (let n = 2; n <= parts.length; n++) out.add(parts.slice(0, n).join("_"));
  }
  // Longest first so the reported match is the fullest form present, not its prefix.
  return [...out].sort((a, b) => b.length - a.length);
})();

export const INTERNAL_CONTENT_PATTERNS: { name: string; re: RegExp }[] = [
  // Track keys AND every multi-segment prefix — generated above from the registry.
  { name: "track-key", re: new RegExp(`(?<![A-Za-z0-9_])(?:${TRACK_KEY_FORMS.join("|")})(?![A-Za-z0-9_])`) },
  // Internal signal enums — the operator's vocabulary, never the client's.
  { name: "signal-enum", re: /(?<![A-Za-z0-9_])(?:soft_fail|hard_fail|manual_review_required|founder_review_status|n_a)(?![A-Za-z0-9_])/ },
  // Engine reasoning scaffold left in prose.
  { name: "hypothesis-tag", re: /\[(?:leading|alternative)\s+hypothesis[^\]]*\]/i },
  // Synthesis module / track numbering.
  { name: "module-ref", re: /(?<![A-Za-z0-9])Module\s*\d(?![0-9])/i },
  // ⚠ THE SEPARATOR IS NOT ALWAYS A SPACE. This required whitespace ("Track 3") and therefore
  // never matched `track_3`, which the 2026-09-01 census found in client prose on TWO delivered
  // cases ("stub track_3 for case 6c4ad68d-…"). Same rule-11 shape as the track keys above: the
  // pattern was written from how a human writes it and the prose carries how code writes it.
  { name: "track-number", re: /(?<![A-Za-z0-9])Track[\s_-]*\d(?![0-9])/i },
  // ── A RAW UUID IS INTERNAL CONTENT BY ANY DEFINITION (founder-ruled 2026-09-01) ───────────
  //
  // Found by the snake_case census, not by anyone looking for it: FOUR case UUIDs sit in delivered
  // client prose — "stub track_3 for case 6c4ad68d-b2a7-446a-9064-e60f0683c13c" on AWI-2607-023 and
  // the seed case. Those two are frozen and stay frozen; this closes the class.
  //
  // ⚠ THE ONE REAL FALSE POSITIVE, MEASURED AND DISCLOSED RATHER THAN DISCOVERED LATER. The 8-4-4-4-12
  // hex shape is shared by HARDWARE/SYSTEM UUIDs — a Dell service tag reports as
  // 4C4C4544-0033-4D10-8035-B7C04F423233 — and a client vetting a computer-hardware supplier could
  // legitimately hold one. That is not hypothetical for this corpus: TD SYNNEX is in it.
  //
  // IT STAYS CASE-INSENSITIVE ANYWAY, and the reason is the one this codebase already ruled on for
  // the focus ring: crying wolf is recoverable, going quiet is not. A false refusal costs an
  // operator one prose override; a missed identifier ships a client someone else's database key.
  // Narrowing to lowercase would exempt the Dell shape and is a ONE-CHARACTER change if the founder
  // prefers it — recorded here so the trade is visible rather than rediscovered.
  //
  // Measured clean against the shapes a client legitimately writes: ASINs, SKUs, Amazon order ids
  // (114-3941689-2851415), EANs, part numbers, MAC addresses and invoice numbers are all ignored.
  { name: "uuid", re: /(?<![A-Za-z0-9-])[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?![A-Za-z0-9-])/i },
];
