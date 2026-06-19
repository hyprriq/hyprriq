"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  "Supplier information",
  "Brand assessment",
  "Document review findings",
  "Verdict reasoning",
  "Other",
];

export function ChangeRequestForm({ caseId, caseNumber }: { caseId: string; caseNumber: string }) {
  const router = useRouter();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit() {
    if (busy) return;
    if (!details.trim()) {
      setError("Please describe what needs to change.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/change-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, details: details.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || "Could not submit.");
      setDone(data.sr_number);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-card border border-line bg-surface p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-clear-bg text-xl text-clear-ink">✓</div>
        <h2 className="mt-4 font-display text-xl font-bold text-ink">Change request submitted</h2>
        <p className="mt-1 text-sm text-ink-2">
          <span className="font-mono font-semibold">{done}</span> — we review within 1 business day.
        </p>
        <Link
          href={`/portal/cases/${caseId}`}
          className="mt-5 inline-block rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
        >
          Back to case →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-line bg-surface p-6">
      <div className="text-sm font-bold text-ink">Request a change to Report {caseNumber}</div>
      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="text-[13px] font-medium text-ink">Which part of the report needs changing? <span className="text-deny-ink">*</span></span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-brand"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[13px] font-medium text-ink">What needs to change and why? <span className="text-deny-ink">*</span></span>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={5}
            placeholder="Describe the specific finding and why you believe it should be reviewed…"
            className="mt-1 w-full rounded-lg border border-line bg-base px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-brand"
          />
        </label>
        <div className="rounded-lg border border-line bg-base px-4 py-3 text-[12px] text-ink-2">
          ⓘ Change requests are reviewed within 1 business day. We will update your report if the research can be improved, or explain why the current finding is correct. This is not a refund request.
        </div>
        {error && <p className="text-[13px] text-deny-ink">{error}</p>}
        <div className="flex items-center justify-between">
          <Link href={`/portal/cases/${caseId}`} className="rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-subtle">
            Cancel
          </Link>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {busy ? "Submitting…" : "Submit Change Request"}
          </button>
        </div>
      </div>
    </div>
  );
}
