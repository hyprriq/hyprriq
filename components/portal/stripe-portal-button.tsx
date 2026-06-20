"use client";

import { useState } from "react";

export function StripePortalButton({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal-session", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data?.message || "Billing isn't available right now.");
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button type="button" onClick={open} disabled={busy} className={className}>
        {busy ? "Opening…" : children}
      </button>
      {error && <span className="text-[12px] text-deny-ink">{error}</span>}
    </span>
  );
}
