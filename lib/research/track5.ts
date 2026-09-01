import { supabaseAdmin } from "@/lib/supabase/admin";
import type {
  TrackContext, TrackOutput, EvidenceItem,
  SourcingLogicOutput, SourcingContradictionRecord,
} from "@/lib/research/contracts";
import { SOURCING_CONTRADICTION_CONTRACT_VERSION, SOURCING_LOGIC_CONTAINER_VERSION } from "@/lib/research/contracts";
import { sourcingClientSummary } from "@/lib/research/sourcingLogicSummary";
import { weightFor } from "@/lib/research/weights";
import type { TrackKey } from "@/lib/constants/tracks";

// ── Track 5 — Sourcing Logic (LIVE 2026-07-14 via sub-gate B; founder-ruled OQ-B1/B2/B3). ──
// ARBITRATION-ONLY: it flags, it NEVER votes. No weight table, no TRACK_WEIGHTS entry, no
// registry entries — non-voting is structural at both ends (this module emits no evidence items
// and no signal; stageFindingTrack's non_voting branch persists n_a without ever touching
// deriveTrackSignal). AT-B1 (byte-identical verdicts with Track 5 on vs off) is the gate's proof.
//
// OQ-B3 (RULED, 2026-07-14): DERIVED-ONLY, ZERO NEW ACQUISITION. This module reads exclusively the
// persisted case_track_results rows of THIS attempt (both orchestrators run Track 5 after tracks
// 1–4 persist — registry execution_order 2). No model calls, no plugins, no web: fully
// deterministic scenario logic over already-collected evidence, so rejudge/replay reproduce it
// exactly. (Consequence on record: the v2.1 partner-programme check needs web research and is
// deliberately OUT of v1 — no flag is manufactured without a data source.)
//
// Its contradiction records are CONTRACT-FROZEN to the Synthesis Module-4 shape (m4c-1.0.0,
// OQ-B2): when the synthesis gate builds Module 4's firewall, a corpus of real records in this
// exact shape already exists. risk_level is capped at "high" BY CODE and is_load_bearing is
// always false — Track 5 can never arm computeVerdict's critical-contradiction lock, and
// load-bearing is Module 4's judgment, not a code default.

const SCORED_TRACKS = new Set<string>([
  "supplier_identity", "supply_chain_relationship", "brand_risk_assessment", "documentation_review",
]);

interface AttemptRow {
  track_number: number;
  track_key: string;
  track_verdict_signal: string | null;
  attempt_number: number | null;
  evidence_items: EvidenceItem[] | null;
  compiled_findings_json: Record<string, unknown> | null;
}

const idsOf = (items: EvidenceItem[], pred: (i: EvidenceItem) => boolean): string[] =>
  items.filter(pred).map((i) => i.evidence_id);

export async function runTrack5(ctx: TrackContext): Promise<TrackOutput> {
  // H2 — a failed read THROWS (the durable step retries); arbitration must never silently run on
  // a partial record. H1 — only THIS attempt's rows: Track 5 arbitrates the record being judged.
  const { data, error } = await supabaseAdmin
    .from("case_track_results")
    .select("track_number, track_key, track_verdict_signal, attempt_number, evidence_items, compiled_findings_json")
    .eq("case_id", ctx.case_id)
    .is("deleted_at", null);
  if (error) throw new Error(`track_5 arbitration read failed: ${error.message}`);
  const attempt = ctx.attempt_number ?? 1;
  const rows = ((data ?? []) as AttemptRow[]).filter(
    (r) => (r.attempt_number ?? 1) === attempt && r.track_number >= 1 && r.track_number <= 4,
  );

  const flags: string[] = [];
  const contradictions: SourcingContradictionRecord[] = [];

  // ── Flags (derived-only — every flag names its stored data source) ──
  // b2b archetype: Tracks 2/3 store b2b_only advisory metadata (never scored there either).
  const b2bRows = rows.filter((r) => r.compiled_findings_json?.b2b_only_detected === true);
  const b2b_archetype_flag = b2bRows.length > 0;
  const b2b_brands = [...new Set(b2bRows.flatMap((r) => (r.compiled_findings_json?.b2b_only_brands as string[] | null) ?? []))];
  if (b2b_archetype_flag) flags.push("b2b_only_archetype");
  // The Amendment-2 unowned facet made VISIBLE to synthesis: brands submitted, no relationship
  // dimension on this plan — vendor-directed enforcement is assessed by neither track.
  if ((ctx.brands_submitted?.length ?? 0) > 0 && !rows.some((r) => r.track_number === 2)) {
    flags.push("no_relationship_dimension");
  }
  // Track 4 ran but had nothing to review (OQ-A3 absence — visible, never scored).
  if (rows.some((r) => r.track_number === 4 && r.compiled_findings_json?.nothing_to_review === true)) {
    flags.push("no_documentation_provided");
  }
  // The resolved identity's own unconfirmed flag rides through for scenario arbitration.
  if (ctx.supplier_identity?.identity_unconfirmed === true) flags.push("identity_unconfirmed");

  // ── Contradiction detectors (each record cites evidence ids from the stored rows) ──
  const items = (r: AttemptRow): EvidenceItem[] => r.evidence_items ?? [];
  const track4 = rows.find((r) => r.track_key === "documentation_review");
  const doc4Positive = track4
    ? items(track4).filter((i) => i.weight_key && (weightFor("documentation_review", i.weight_key)?.points ?? 0) > 0)
    : [];

  // (1) documentation_comfort_vs_web_risk — the no-override guard's scenario, RECORDED for Module 4:
  // vendor-supplied paperwork presents positively while independent research validated a
  // disqualifier. One record per vetoing dimension.
  if (doc4Positive.length > 0) {
    for (const r of rows) {
      if (r.track_key === "documentation_review") continue;
      const vetoItems = items(r).filter((i) => i.weight_key && weightFor(r.track_key as TrackKey, i.weight_key)?.hard_fail === true);
      const vetoed = r.track_verdict_signal === "hard_fail" || vetoItems.length > 0;
      if (!vetoed) continue;
      contradictions.push({
        contradiction_type: "documentation_comfort_vs_web_risk",
        assertion_a: {
          track_key: "documentation_review",
          statement: `vendor-supplied documentation validated positively (${doc4Positive.map((i) => i.weight_key).join(", ")})`,
          evidence_ids: doc4Positive.map((i) => i.evidence_id),
        },
        assertion_b: {
          track_key: r.track_key,
          statement: `independent research on ${r.track_key} validated a disqualifier (signal ${r.track_verdict_signal ?? "unknown"})`,
          evidence_ids: idsOf(items(r), (i) => !!i.weight_key && weightFor(r.track_key as TrackKey, i.weight_key)?.hard_fail === true),
        },
        interpretation:
          "The document and the web record point in opposite directions. The no-override rule keeps the verdict risk-driven (documents raise concern, never manufacture comfort); recorded for synthesis arbitration.",
        risk_level: "high",
        is_load_bearing: false,
      });
    }
  }

  // (2) cross_track_signal_divergence — pass on one dimension, hard_fail on another (extreme
  // divergence worth arbitration). The documentation-comfort pairing is owned by detector (1),
  // so the pass side here excludes documentation_review.
  const passRows = rows.filter((r) => r.track_verdict_signal === "pass" && r.track_key !== "documentation_review");
  const hardRows = rows.filter((r) => r.track_verdict_signal === "hard_fail");
  for (const p of passRows) {
    for (const h of hardRows) {
      if (p.track_key === h.track_key) continue;
      contradictions.push({
        contradiction_type: "cross_track_signal_divergence",
        assertion_a: {
          track_key: p.track_key,
          statement: `${p.track_key} scored pass on ${items(p).length} validated evidence item(s)`,
          evidence_ids: items(p).map((i) => i.evidence_id),
        },
        assertion_b: {
          track_key: h.track_key,
          statement: `${h.track_key} hard-failed (validated disqualifier)`,
          evidence_ids: idsOf(items(h), (i) => !!i.weight_key && weightFor(h.track_key as TrackKey, i.weight_key)?.hard_fail === true),
        },
        interpretation:
          "One dimension is strongly positive while another carries an affirmative disqualifier — the sourcing scenario is internally divergent; recorded for synthesis arbitration.",
        risk_level: "medium",
        is_load_bearing: false,
      });
    }
  }

  // ── Scenario coherence (code-templated; tension > insufficient_data > consistent) ──
  const scored = rows.filter((r) => SCORED_TRACKS.has(r.track_key) && r.track_verdict_signal && r.track_verdict_signal !== "n_a");
  const signalList = scored.map((r) => `${r.track_key}=${r.track_verdict_signal}`).join(", ");
  const scenario_coherence: SourcingLogicOutput["scenario_coherence"] =
    contradictions.length > 0
      ? { assessment: "tension", basis: `cross-dimension contradiction(s) detected over [${signalList}]` }
      : scored.length < 2
        ? { assessment: "insufficient_data", basis: `fewer than two scored dimensions available for arbitration (${signalList || "none"})` }
        : { assessment: "consistent", basis: `no cross-dimension contradictions over [${signalList}]` };

  // ── WHAT THE CLIENT READS (founder-ruled 2026-09-01) ─────────────────────────────────
  // "When it finds no contradictions that is a RESULT, not an absence." Previously the client saw
  // only the scope note, so a track that RAN and found nothing rendered as an empty section.
  //
  // ⚠ comparability is computed from the SAME inputs the detectors used, not re-derived from the
  // conclusion — `contradictions.length === 0` cannot tell "compared and clear" from "nothing to
  // compare", and on the case that exposed this it was the latter.
  const comparability = {
    documentsToCompare: doc4Positive.length > 0,
    opposingSignals: passRows.length > 0 && hardRows.length > 0,
  };
  const client_summary = sourcingClientSummary(scenario_coherence.assessment, comparability);

  const sourcing_logic: SourcingLogicOutput = {
    contract_version: SOURCING_CONTRADICTION_CONTRACT_VERSION,
    container_version: SOURCING_LOGIC_CONTAINER_VERSION,
    flags, b2b_archetype_flag, b2b_brands,
    scenario_coherence,
    comparability,
    client_summary,
    // RENAMED 2026-09-01 — see the note on SourcingLogicOutput. The local variable keeps the
    // detectors' own word (each record IS a contradiction in the m4c sense); the FIELD is what
    // stopped colliding with Module 4's verdict-bearing set.
    coherence_conflict_count: contradictions.length,
    coherence_conflicts: contradictions,
  };

  return {
    track_key: "sourcing_logic",
    evidence_items: [],           // NEVER — nothing vote-bearing can exist, so no consensus site applies
    evidence_weights_applied: [],
    reasoning_notes: `sourcing-logic arbitration (non-voting): ${scenario_coherence.assessment}; ${flags.length} flag(s), ${contradictions.length} contradiction record(s) — derived from this attempt's stored track outputs only`,
    unknowns: [],
    non_voting: true,
    sourcing_logic,
  };
}
