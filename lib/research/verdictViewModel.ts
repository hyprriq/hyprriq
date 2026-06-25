import type { TrackKey } from "@/lib/constants/tracks";
import { trackByNumber } from "@/lib/constants/tracks";
import type { ConfidenceBand } from "@/lib/research/confidence";
import type {
  EvidenceItem, IosVersion, SynthesisOutput, TrackSignal, Unknown, VerdictResult,
} from "@/lib/research/contracts";
import type { TrackResultRow } from "@/lib/data/track-results";
import { computeVerdict } from "@/lib/research/verdictEngine";

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

export interface VerdictViewModel {
  engineComplete: boolean;                 // synthesis present → engine reached report-ready
  verdict: VerdictResult | null;           // recomputed; null until synthesis exists
  executiveSummary: ExecutiveSummaryView | null;
  crossTrack: CrossTrackView | null;
  tracks: TrackIntelView[];                // finding tracks (1–5), ordered
  trace: EngineTraceView;
}

export function buildVerdictViewModel(input: {
  trackRows: TrackResultRow[];
  synthesis: SynthesisOutput | null;
  ios: IosVersion | null;
}): VerdictViewModel {
  const { trackRows, synthesis, ios } = input;

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

  return { engineComplete, verdict, executiveSummary, crossTrack, tracks, trace };
}

function dimensionFor(trackNumber: number): string {
  try {
    return trackByNumber(trackNumber).dimension;
  } catch {
    return `Track ${trackNumber}`;
  }
}
