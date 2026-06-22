"use client";

import { useState } from "react";

// Starts a Stripe Checkout Session (plan purchase or credit top-up) and redirects
// to Stripe-hosted checkout. Shows a clear message if checkout isn't configured
// yet (503) rather than a broken redirect.
export function CheckoutButton({
  plan,
  topup,
  redirect,
  className,
  children,
}: {
  plan?: string;
  topup?: string;
  redirect?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan ? { plan, redirect } : { topup, redirect }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data?.message || "Checkout isn't available yet.");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button type="button" onClick={go} disabled={busy} className={className}>
        {busy ? "Redirecting…" : children}
      </button>
      {error && <span className="text-[12px] text-deny-ink">{error}</span>}
    </span>
  );
}
