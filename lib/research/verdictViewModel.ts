import type { TrackKey } from "@/lib/constants/tracks";
import { trackByNumber } from "@/lib/constants/tracks";
import type { ConfidenceBand } from "@/lib/research/confidence";
import type {
  EvidenceItem, IosVersion, SynthesisOutput, TrackSignal, Unknown, VerdictResult,
} from "@/lib/research/contracts";
import type { TrackResultRow } from "@/lib/data/track-results";
import { computeVerdict } from "@/lib/research/verdictEngine";
import { expectedEvidenceTypes, evidenceLabel } from "@/lib/research/weights";

// Phase 4 — the SINGLE assembly service for the admin review surface. Every admin UI section
// (Executive Intelligence Summary, Verdict Panel, Cross-Track Intelligence, Track Intelligence,
// Engine Trace) reads this view model; the UI NEVER reconstructs verdict/synthesis state itself.
// Pure (no I/O): the data layer fetches the rows, this function only assembles + recomputes.
//
// Fork A: the deterministic VerdictResult is RECOMPUTED here from persisted inputs
// (track_verdict_signal + synthesis contradictions) rather than read from a stored column —
// faithful by ADR-G004 determinism, and it makes the determinism property observable.

// "Executive Intelligence Summary" = the UI name for Module 9 (ADR-G005 decision_snapshot).
export interface ExecutiveSummaryView {
  headline: string;
  leading_interpretation: string;
  the_real_risk: string;
  what_to_monitor: string[];       // Module 9 watch points
  what_to_verify: string[];        // Module 8 vendor_questions (founder-specified mapping)
}

export interface CrossTrackView {
  contradictions: SynthesisOutput["module_4_contradictions"];
  hypotheses: SynthesisOutput["module_5_hypotheses"];
  doubt_calibration: SynthesisOutput["module_7_doubt_calibration"];
}

export interface TrackIntelView {
  track_number: number;
  track_key: TrackKey;
  dimension: string;
  signal: TrackSignal | null;
  band: ConfidenceBand | null;
  score_0_15: number | null;
  evidence_items: EvidenceItem[];
  reasoning_notes: string | null;
  unknowns: Unknown[];
}

export interface EngineTraceSignal {
  track_key: TrackKey;
  dimension: string;
  signal: TrackSignal | null;
  score_0_15: number | null;
  band: ConfidenceBand | null;
}
export interface EngineTraceView {
  ios: IosVersion | null;
  signals: EngineTraceSignal[];
}

// Phase 4.5 (item 3) — research coverage / completeness.
export interface CertaintyBreakdown { verified: number; inferred: number; unknown: number }
export interface TrackCoverage {
  track_key: TrackKey; dimension: string;
  evidence_count: number; certainty: CertaintyBreakdown; has_signal: boolean;
}
export interface EvidenceCoverage {
  tracks_run: number; tracks_skipped: number;
  total_evidence_items: number;
  certainty: CertaintyBreakdown;
  per_track: TrackCoverage[];
}

// Phase 4.5 (item 4) — missing evidence (expected, not found) vs unknowns (looked, unresolvable).
export interface MissingEvidence { evidence_type: string; label: string }
export interface TrackGaps { track_key: TrackKey; dimension: string; missing: MissingEvidence[]; unknowns: Unknown[] }
export interface EvidenceGaps { per_track: TrackGaps[] }

export interface VerdictViewModel {
  engineComplete: boolean;                 // synthesis present → engine reached report-ready
  verdict: VerdictResult | null;           // recomputed; null until synthesis exists
  executiveSummary: ExecutiveSummaryView | null;
  crossTrack: CrossTrackView | null;
  tracks: TrackIntelView[];                // finding tracks (1–5), ordered
  coverage: EvidenceCoverage | null;       // item 3
  gaps: EvidenceGaps | null;               // item 4
  trace: EngineTraceView;
}

export function buildVerdictViewModel(input: {
  trackRows: TrackResultRow[];
  synthesis: SynthesisOutput | null;
  ios: IosVersion | null;
  requiredTracks?: number[];               // finding tracks the plan should run (for skipped count)
}): VerdictViewModel {
  const { trackRows, synthesis, ios, requiredTracks } = input;

  // Finding tracks only (1–5); track_0 (intake gate) is not a finding and does not vote.
  const findingRows = trackRows
    .filter((r) => r.track_number >= 1)
    .sort((a, b) => a.track_number - b.track_number);

  // Persisted signals → the exact input the verdict engine consumes.
  const signals: Partial<Record<TrackKey, TrackSignal>> = {};
  for (const r of findingRows) {
    if (r.track_verdict_signal) signals[r.track_key as TrackKey] = r.track_verdict_signal;
  }

  const engineComplete = synthesis !== null;
  const verdict = engineComplete ? computeVerdict(signals, synthesis) : null;

  const tracks: TrackIntelView[] = findingRows.map((r) => ({
    track_number: r.track_number,
    track_key: r.track_key as TrackKey,
    dimension: dimensionFor(r.track_number),
    signal: r.track_verdict_signal,
    band: r.confidence_band,
    score_0_15: r.confidence_score,
    evidence_items: r.evidence_items ?? [],
    reasoning_notes: r.reasoning_notes,
    unknowns: r.unknowns ?? [],
  }));

  const snap = synthesis?.module_9_decision_snapshot;
  const executiveSummary: ExecutiveSummaryView | null = synthesis && snap
    ? {
        headline: snap.headline,
        leading_interpretation: snap.leading_interpretation,
        the_real_risk: snap.the_real_risk,
        what_to_monitor: snap.what_to_monitor ?? [],
        what_to_verify: synthesis.module_8_vendor_questions ?? [],
      }
    : null;

  const crossTrack: CrossTrackView | null = synthesis
    ? {
        contradictions: synthesis.module_4_contradictions ?? [],
        hypotheses: synthesis.module_5_hypotheses,
        doubt_calibration: synthesis.module_7_doubt_calibration,
      }
    : null;

  const trace: EngineTraceView = {
    ios,
    signals: tracks.map((t) => ({
      track_key: t.track_key, dimension: t.dimension,
      signal: t.signal, score_0_15: t.score_0_15, band: t.band,
    })),
  };

  const coverage = engineComplete ? computeCoverage(tracks, requiredTracks) : null;
  const gaps = engineComplete ? computeGaps(tracks) : null;

  return { engineComplete, verdict, executiveSummary, crossTrack, tracks, coverage, gaps, trace };
}

// item 3 — aggregate evidence completeness over the finding tracks.
export function computeCoverage(tracks: TrackIntelView[], requiredTracks?: number[]): EvidenceCoverage {
  const overall: CertaintyBreakdown = { verified: 0, inferred: 0, unknown: 0 };
  const per_track: TrackCoverage[] = tracks.map((t) => {
    const c: CertaintyBreakdown = { verified: 0, inferred: 0, unknown: 0 };
    for (const e of t.evidence_items) c[e.certainty] += 1;
    overall.verified += c.verified; overall.inferred += c.inferred; overall.unknown += c.unknown;
    return {
      track_key: t.track_key, dimension: t.dimension,
      evidence_count: t.evidence_items.length, certainty: c,
      has_signal: t.signal != null && t.signal !== "n_a",
    };
  });
  const ALL_FINDING = [1, 2, 3, 4, 5];
  const required = requiredTracks ?? tracks.map((t) => t.track_number);
  const tracks_skipped = ALL_FINDING.filter((n) => !required.includes(n)).length;
  return {
    tracks_run: tracks.length,
    tracks_skipped,
    total_evidence_items: overall.verified + overall.inferred + overall.unknown,
    certainty: overall,
    per_track,
  };
}

// item 4 — missing (expected ADR-G003 evidence not found) vs unknowns (looked, unresolvable).
export function computeGaps(tracks: TrackIntelView[]): EvidenceGaps {
  const per_track: TrackGaps[] = tracks.map((t) => {
    const found = new Set(t.evidence_items.map((e) => e.weight_key).filter((k): k is string => !!k));
    const missing: MissingEvidence[] = expectedEvidenceTypes(t.track_key)
      .filter((et) => !found.has(et))
      .map((et) => ({ evidence_type: et, label: evidenceLabel(et) }));
    return { track_key: t.track_key, dimension: t.dimension, missing, unknowns: t.unknowns };
  });
  return { per_track };
}

function dimensionFor(trackNumber: number): string {
  try {
    return trackByNumber(trackNumber).dimension;
  } catch {
    return `Track ${trackNumber}`;
  }
}
