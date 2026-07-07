"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OUTCOME_TYPES, OUTCOME_LABELS, type OutcomeType, type CaseOutcome } from "@/lib/constants/outcomes";

// H6 — founder records what actually happened with a delivered case (case_outcomes ground truth).
// Rendered only for delivered/complete cases; the row was seeded at delivery, this fills it in.
// Same explicit-save pattern as InternalNotes. Constants come from lib/constants/outcomes
// (client-safe — this component must never import the server data layer).

function formatStamp(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function OutcomePanel({ caseId, existing }: { caseId: string; existing: CaseOutcome | null }) {
  const router = useRouter();
  const reported = !!existing?.outcome_reported_at;
  const [editing, setEditing] = useState(!reported);
  const [outcomeType, setOutcomeType] = useState<string>(existing?.outcome_type ?? "");
  const [notes, setNotes] = useState(existing?.outcome_notes ?? "");
  const [correct, setCorrect] = useState<boolean | null>(existing?.prediction_correct ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (busy || !outcomeType) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/cases/${caseId}/outcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome_type: outcomeType, outcome_notes: notes || undefined, prediction_correct: correct ?? undefined }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Could not record the outcome.");
      }
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-muted">Outcome</div>
        {existing?.verdict_at_delivery && (
          <span className="rounded bg-subtle px-1.5 py-0.5 text-[11px] font-semibold text-muted">
            delivered as {existing.verdict_at_delivery.replaceAll("_", " ")}
          </span>
        )}
      </div>

      {!editing && reported ? (
        <div className="mt-2 text-[13px] text-ink-2">
          <div className="font-medium text-ink">{OUTCOME_LABELS[(existing?.outcome_type ?? "other") as OutcomeType] ?? existing?.outcome_type}</div>
          {existing?.outcome_notes && <p className="mt-1">{existing.outcome_notes}</p>}
          <div className="mt-1 text-[12px] text-muted">
            Prediction {existing?.prediction_correct === null ? "not judged" : existing?.prediction_correct ? "correct" : "incorrect"} · recorded {formatStamp(existing?.outcome_reported_at ?? null)}
          </div>
          <button type="button" onClick={() => setEditing(true)}
            className="mt-2 text-[12px] font-semibold text-brand hover:text-brand-hover">
            Edit outcome
          </button>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <select value={outcomeType} onChange={(e) => setOutcomeType(e.target.value)}
            className="w-full rounded-lg border border-line bg-base px-3 py-2 text-[13px] text-ink outline-none focus:border-brand">
            <option value="">What happened with this supplier?</option>
            {OUTCOME_TYPES.map((t) => <option key={t} value={t}>{OUTCOME_LABELS[t]}</option>)}
          </select>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            placeholder="Notes (optional) — what happened, when, how it was resolved."
            className="w-full resize-y rounded-lg border border-line bg-base px-3 py-2 text-[13px] text-ink outline-none placeholder:text-muted focus:border-brand" />
          <div className="flex items-center gap-2 text-[12px] text-muted">
            <span>Prediction:</span>
            <button type="button" onClick={() => setCorrect(correct === true ? null : true)}
              className={`rounded px-2 py-0.5 font-semibold ${correct === true ? "bg-clear-bg text-clear-ink" : "bg-subtle text-muted"}`}>
              correct
            </button>
            <button type="button" onClick={() => setCorrect(correct === false ? null : false)}
              className={`rounded px-2 py-0.5 font-semibold ${correct === false ? "bg-deny-bg text-deny-ink" : "bg-subtle text-muted"}`}>
              incorrect
            </button>
          </div>
          {error && <p className="text-[13px] text-deny-ink">{error}</p>}
          <div className="flex justify-end">
            <button type="button" onClick={save} disabled={busy || !outcomeType}
              className="rounded-lg bg-brand px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50">
              {busy ? "Saving…" : "Save outcome"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
