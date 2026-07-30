"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ── ADMIN ACCESS FIX — the credit-adjust widget (permission: adjust_credits; the page gates
// rendering). Calls POST /api/admin/clients/[id]/credits, which goes through the H6 atomic RPCs
// and REQUIRES a reason — no raw writes, no silent adjustments. ──

export function CreditAdjust({ clientId, currentBalance }: { clientId: string; currentBalance: number }) {
  const router = useRouter();
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<number | null>(null);

  const parsed = Number(delta);
  const valid = Number.isInteger(parsed) && parsed !== 0 && reason.trim().length > 0;

  async function submit() {
    if (busy || !valid) return;
    setBusy(true); setError(null);
    const res = await fetch(`/api/admin/clients/${clientId}/credits`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delta: parsed, reason: reason.trim() }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) setError(json?.error ?? "adjust failed");
    else { setResult(json.balance); setDelta(""); setReason(""); router.refresh(); }
    setBusy(false);
  }

  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">Adjust Credits</div>
      <p className="mb-2 text-[13px] text-ink-2">
        Current balance: <span className="font-semibold text-ink">{result ?? currentBalance}</span>
        {Number.isInteger(parsed) && parsed !== 0 && (
          <span className="text-muted"> → after adjustment: <span className="font-semibold text-ink">{(result ?? currentBalance) + parsed}</span></span>
        )}
      </p>
      {error && <p className="mb-2 rounded-lg bg-deny-bg px-3 py-2 text-[13px] text-deny-ink">{error}</p>}
      {result !== null && !error && <p className="mb-2 text-[13px] text-clear-ink">Adjusted — new balance {result}. Audit row written.</p>}
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-[12px] text-muted">Delta (±)<br />
          <input value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="+2 or -1"
            className="mt-1 w-24 rounded-lg border border-line bg-base px-2 py-1.5 text-[13px] text-ink" />
        </label>
        <label className="flex-1 text-[12px] text-muted">Reason (required — audited)<br />
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. goodwill for delayed case AWI-…"
            className="mt-1 w-full rounded-lg border border-line bg-base px-2 py-1.5 text-[13px] text-ink" />
        </label>
        <button type="button" disabled={busy || !valid} onClick={submit}
          className="rounded-lg bg-brand px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
          {busy ? "Applying…" : "Apply"}
        </button>
      </div>
    </div>
  );
}
