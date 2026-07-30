// ── ADMIN BATCH — UX-1: the live pipeline progress tracker (DIAGNOSTIC view). Pure read of the
// existing status columns (track_0..6_status + case status) — no new writes. When a case breaks
// mid-pipeline, this shows WHERE. Function over polish (the admin redesign waits for the UI/UX
// thread, per the batch constraint). ──

export type StageState = "done" | "working" | "failed" | "pending" | "skipped" | "manual";

export interface StageView { key: string; label: string; state: StageState; raw: string | null }

// Pure derivation — testable without rendering.
export function deriveStages(c: {
  status: string;
  track_0_status: string | null; track_1_status: string | null; track_2_status: string | null;
  track_3_status: string | null; track_4_status: string | null; track_5_status: string | null;
  track_6_status?: string | null;
}): StageView[] {
  const researching = c.status === "research_running";
  const mapTrack = (raw: string | null): StageState =>
    raw === "complete" ? "done"
    : raw === "failed" ? "failed"
    : raw === "skipped" ? "skipped"
    : raw === "manual_required" ? "manual"
    : researching ? "working" : "pending";
  const map0 = (raw: string | null): StageState =>
    raw === "complete" ? "done" : raw === "escalated" ? "manual" : raw === "paused" ? "manual" : researching ? "working" : "pending";
  const postResearch: StageState =
    ["awaiting_review", "manual_override_required", "qa_in_progress", "approved", "delivered", "complete"].includes(c.status) ? "done"
    : c.status === "research_failed" ? "failed"
    : researching ? "working" : "pending";
  return [
    { key: "intake", label: "Intake", state: map0(c.track_0_status), raw: c.track_0_status },
    { key: "t1", label: "Supplier Identity", state: mapTrack(c.track_1_status), raw: c.track_1_status },
    { key: "t2", label: "Supply Chain", state: mapTrack(c.track_2_status), raw: c.track_2_status },
    { key: "t3", label: "Brand Risk", state: mapTrack(c.track_3_status), raw: c.track_3_status },
    { key: "t4", label: "Documentation", state: mapTrack(c.track_4_status), raw: c.track_4_status },
    { key: "t5", label: "Sourcing Logic", state: mapTrack(c.track_5_status), raw: c.track_5_status },
    { key: "t6", label: "Category Compliance", state: mapTrack(c.track_6_status ?? null), raw: c.track_6_status ?? null },
    { key: "synthesis", label: "Synthesis + Verdict", state: postResearch, raw: c.status },
  ];
}

const DOT: Record<StageState, string> = {
  done: "bg-clear-bg text-clear-ink border-clear-ink/30",
  working: "bg-amber-50 text-amber-700 border-amber-300 animate-pulse",
  failed: "bg-deny-bg text-deny-ink border-deny-ink/30",
  manual: "bg-deny-bg text-deny-ink border-deny-ink/30",
  skipped: "bg-subtle text-muted border-line",
  pending: "bg-surface text-muted border-line",
};
const GLYPH: Record<StageState, string> = { done: "✓", working: "●", failed: "✕", manual: "⚠", skipped: "—", pending: "·" };

export function PipelineProgress({ stages }: { stages: StageView[] }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">Pipeline Progress</div>
      <div className="flex flex-wrap gap-2">
        {stages.map((s) => (
          <span key={s.key} title={s.raw ?? "pending"}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[12px] font-medium ${DOT[s.state]}`}>
            <span aria-hidden>{GLYPH[s.state]}</span>{s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
