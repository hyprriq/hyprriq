"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Cancel-at-period-end control for the Billing page. Active subscription → an
// explicit confirm step (never a one-click cancel). Already cancelling → a
// Resume option so the client can undo before the period ends.
export function CancelSubscription({
  renewalLabel,
  cancelling,
}: {
  renewalLabel: string;
  cancelling: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(resume: boolean) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || "Could not update subscription.");
      setConfirming(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (cancelling) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => call(true)}
          disabled={busy}
          className="min-h-11 inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-[14px] font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {busy ? "…" : "Resume plan"}
        </button>
        {error && <span className="text-[12px] text-deny-ink">{error}</span>}
      </div>
    );
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-[13px] font-semibold text-muted hover:text-deny-ink"
      >
        Cancel subscription
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-canvas p-4">
      <div className="text-[14px] font-semibold text-ink">Cancel your subscription?</div>
      <p className="mt-1 text-[13px] text-ink-2">
        Your plan stays active until <span className="font-semibold">{renewalLabel}</span>, then
        won&rsquo;t renew. You keep full access until then.
      </p>
      {/* DOWNLOAD PROMPT (founder-ruled 2026-08-21): the Terms and the Data Policy tell clients
          to download before closure — this makes it one click from the cancellation screen. A
          client who cancels and loses a report they paid for is a fair complaint. */}
      <p className="mt-2 text-[13px] text-ink-2">
        Your delivered reports remain yours —{" "}
        <Link href="/portal/cases" className="font-semibold text-brand underline hover:opacity-80">
          download your report PDFs
        </Link>{" "}
        for anything you want to keep. Under the Data Policy, data is removed on the published
        retention schedule after an account closes.
      </p>
      {error && <p className="mt-2 text-[13px] text-deny-ink">{error}</p>}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => call(false)}
          disabled={busy}
          className="min-h-11 inline-flex items-center justify-center rounded-lg bg-deny-ink px-3.5 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Cancelling…" : "Yes, cancel at period end"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="min-h-11 inline-flex items-center justify-center rounded-lg border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink-2 hover:bg-subtle"
        >
          Keep my plan
        </button>
      </div>
    </div>
  );
}
