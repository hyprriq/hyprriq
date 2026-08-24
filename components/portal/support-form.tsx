"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SupportRequestType } from "@/lib/data/support";

const TYPE_OPTIONS: { label: string; value: SupportRequestType }[] = [
  { label: "General question", value: "general" },
  { label: "Case question", value: "general" },
  { label: "Escalation (urgent)", value: "technical" },
  { label: "Billing / payment", value: "billing" },
  { label: "Change request", value: "change_request" },
  { label: "Other", value: "other" },
];

export function SupportForm({
  cases,
  defaultCaseId,
}: {
  cases: { id: string; case_number: string; vendor_name: string | null }[];
  defaultCaseId?: string;
}) {
  const router = useRouter();
  const [typeIdx, setTypeIdx] = useState(0);
  const [caseId, setCaseId] = useState(defaultCaseId ?? "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit() {
    if (busy) return;
    if (!subject.trim() || !message.trim()) {
      setError("Subject and message are required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/support/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: TYPE_OPTIONS[typeIdx].value,
          case_id: caseId || null,
          subject: subject.trim(),
          body: message.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not submit request.");
      setDone(data.sr_number);
      setSubject("");
      setMessage("");
      setCaseId("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-card border border-line bg-surface p-6">
      <div className="text-sm font-bold text-ink">Submit a request</div>
      <p className="mt-1 text-[14px] text-ink-2">
        We typically respond within 1 business day. Use Escalation for urgent case issues.
      </p>

      {done && (
        <div className="mt-4 rounded-lg border border-clear-ink/30 bg-clear-bg px-4 py-3 text-[14px] text-clear-ink">
          ✓ Request <span className="font-mono font-semibold">{done}</span> submitted. We&rsquo;ll be in touch within 1 business day.
        </div>
      )}

      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="text-[14px] font-medium text-ink">Request type <span className="text-deny-ink">*</span></span>
          <select
            value={typeIdx}
            onChange={(e) => setTypeIdx(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-line bg-canvas min-h-11 px-3 py-2.5 text-[16px] text-ink outline-none focus:border-brand"
          >
            {TYPE_OPTIONS.map((o, i) => (
              <option key={o.label} value={i}>{o.label}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[14px] font-medium text-ink">Linked case <span className="font-normal text-muted">(optional)</span></span>
          <select
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-canvas min-h-11 px-3 py-2.5 text-[16px] text-ink outline-none focus:border-brand"
          >
            <option value="">Select a case…</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.case_number} — {c.vendor_name ?? "—"}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[14px] font-medium text-ink">Subject <span className="text-deny-ink">*</span></span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-canvas min-h-11 px-3 py-2.5 text-[16px] text-ink outline-none focus:border-brand"
          />
        </label>

        <label className="block">
          <span className="text-[14px] font-medium text-ink">Message <span className="text-deny-ink">*</span></span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="Describe your question or issue…"
            className="mt-1 w-full rounded-lg border border-line bg-canvas min-h-11 px-3 py-2.5 text-[16px] text-ink outline-none placeholder:text-muted focus:border-brand"
          />
        </label>

        {error && <p className="text-[14px] text-deny-ink">{error}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {busy ? "Submitting…" : "Submit Request →"}
        </button>
      </div>
    </div>
  );
}
