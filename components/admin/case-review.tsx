"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Score = "pass" | "infer" | "flag" | "fail" | "na";
type Verdict = "source_clear" | "usable_with_conditions" | "verify_before_purchase" | "do_not_rely";

const DIMENSIONS = [
  "Supplier Identity",
  "Supply Chain Relationship",
  "Brand Risk Assessment",
  "Documentation Review",
  "Sourcing Logic",
];

const SCORES: { key: Score; label: string; cls: string }[] = [
  { key: "pass", label: "Pass", cls: "bg-clear-bg text-clear-ink border-clear-ink/40" },
  { key: "infer", label: "Infer", cls: "bg-conditional-bg text-conditional-ink border-conditional-ink/40" },
  { key: "flag", label: "Flag", cls: "bg-verify-bg text-verify-ink border-verify-ink/40" },
  { key: "fail", label: "Fail", cls: "bg-deny-bg text-deny-ink border-deny-ink/40" },
  { key: "na", label: "N/A", cls: "bg-subtle text-muted border-line" },
];

const VERDICTS: { key: Verdict; name: string; desc: string; cls: string }[] = [
  { key: "source_clear", name: "✓ Source Clear", desc: "Observable indicators consistent with credible source", cls: "border-l-clear-ink" },
  { key: "usable_with_conditions", name: "⇡ Usable With Conditions", desc: "Proceed with specific caveats noted", cls: "border-l-conditional-ink" },
  { key: "verify_before_purchase", name: "△ Verify Before Purchase", desc: "Additional due diligence required", cls: "border-l-verify-ink" },
  { key: "do_not_rely", name: "✕ Do Not Rely", desc: "Significant concerns identified", cls: "border-l-deny-ink" },
];

export function CaseReview({
  caseId,
  initial,
}: {
  caseId: string;
  initial: { verdict: string | null };
}) {
  const router = useRouter();
  const validInitial = VERDICTS.some((v) => v.key === initial.verdict)
    ? (initial.verdict as Verdict)
    : null;
  const [scores, setScores] = useState<Record<number, Score>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [confidence, setConfidence] = useState<"low" | "medium" | "high">("medium");
  const [verdict, setVerdict] = useState<Verdict | null>(validInitial);
  const [busy, setBusy] = useState<"draft" | "approve" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const scoredCount = Object.keys(scores).length;

  async function send(action: "draft" | "approve") {
    if (busy) return;
    if (action === "approve" && !verdict) {
      setError("Select a verdict before approving.");
      return;
    }
    setBusy(action);
    setError(null);
    try {
      const dimensions = Object.entries(scores).map(([index, score]) => ({
        index: Number(index),
        score,
        note: notes[Number(index)] ?? "",
      }));
      const res = await fetch(`/api/admin/cases/${caseId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, verdict, confidence, dimensions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not save.");
      if (action === "approve") {
        setDone("Report approved & delivered.");
        router.refresh();
      } else {
        setDone("Draft saved.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      {/* Scoring column */}
      <div className="space-y-3">
        <h3 className="font-display text-sm font-bold text-ink">Research Builder</h3>
        {DIMENSIONS.map((name, i) => {
          const idx = i + 1;
          return (
            <div key={name} className="rounded-card border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[13px] font-semibold text-ink">{name}</div>
                <div className="flex gap-1.5">
                  {SCORES.map((s) => {
                    const on = scores[idx] === s.key;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setScores({ ...scores, [idx]: s.key })}
                        aria-pressed={on}
                        className={`rounded-md border px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
                          on ? s.cls : "border-line bg-base text-ink-2 hover:bg-subtle"
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <textarea
                value={notes[idx] ?? ""}
                onChange={(e) => setNotes({ ...notes, [idx]: e.target.value })}
                rows={2}
                placeholder={`Notes on ${name.toLowerCase()}…`}
                className="mt-2 w-full rounded-lg border border-line bg-base px-3 py-2 text-[13px] text-ink outline-none placeholder:text-muted focus:border-brand"
              />
            </div>
          );
        })}

        <div className="rounded-card border border-line bg-surface p-4">
          <div className="text-[13px] font-semibold text-ink">Overall Confidence</div>
          <div className="mt-2 flex gap-2">
            {(["low", "medium", "high"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setConfidence(c)}
                aria-pressed={confidence === c}
                className={`flex-1 rounded-lg border px-3 py-2 text-[13px] font-semibold capitalize transition-colors ${
                  confidence === c ? "border-brand bg-brand-tint text-brand-ink" : "border-line bg-base text-ink-2 hover:bg-subtle"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Verdict column */}
      <div className="space-y-4">
        <div className="rounded-card border border-line bg-surface p-4">
          <div className="text-[13px] font-bold text-ink">Select Verdict</div>
          <div className="mt-3 space-y-2">
            {VERDICTS.map((v) => {
              const on = verdict === v.key;
              return (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setVerdict(v.key)}
                  aria-pressed={on}
                  className={`block w-full rounded-lg border border-l-[3px] ${v.cls} px-3 py-2.5 text-left transition-colors ${
                    on ? "border-brand bg-brand-tint" : "border-line bg-base hover:bg-subtle"
                  }`}
                >
                  <div className="text-[13px] font-bold text-ink">{v.name}</div>
                  <div className="text-[11.5px] text-ink-2">{v.desc}</div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 space-y-1.5 rounded-lg border border-line bg-base p-3 text-[12px]">
            <div className="flex justify-between"><span className="text-muted">Dimensions scored</span><span className={`font-semibold ${scoredCount >= 5 ? "text-clear-ink" : "text-ink"}`}>{scoredCount} of 5</span></div>
            <div className="flex justify-between"><span className="text-muted">Verdict selected</span><span className="font-semibold text-ink">{verdict ? VERDICTS.find((v) => v.key === verdict)!.name.replace(/^[^ ]+ /, "") : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted">Confidence</span><span className="font-semibold capitalize text-ink">{confidence}</span></div>
          </div>

          {error && <p className="mt-3 text-[12px] text-deny-ink">{error}</p>}
          {done && <p className="mt-3 text-[12px] font-semibold text-clear-ink">✓ {done}</p>}

          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() => send("draft")}
              disabled={busy !== null}
              className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-subtle disabled:opacity-60"
            >
              {busy === "draft" ? "Saving…" : "Save Draft"}
            </button>
            <button
              type="button"
              onClick={() => send("approve")}
              disabled={!verdict || busy !== null}
              className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "approve" ? "Delivering…" : "Approve & Deliver"}
            </button>
            {!verdict && <p className="text-center text-[11.5px] text-muted">Select verdict first</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
