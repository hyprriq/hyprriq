"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ── "HAVE AN ACCESS CODE?" (founder-ruled 2026-08-21) — the typed-coupon redemption surface.
// Rendered ONLY for plan-less accounts (the RPC refuses plan-holders anyway; not rendering it
// for them keeps the surface honest). Copy says "full assessment", never a tier name.

export function GrantCodeBox() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <div className="mt-4 rounded-lg border border-line bg-base p-4">
      <div className="text-[13px] font-semibold text-ink">Have an access code?</div>
      <p className="mt-1 text-[13px] text-ink-2">
        Codes from our team apply a free full assessment to your account.
      </p>
      {message?.ok ? (
        <p className="mt-2 text-[13px] font-semibold text-verify-ink">{message.text}</p>
      ) : (
        <>
          <form
            className="mt-3 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy || !code.trim()) return;
              setBusy(true);
              setMessage(null);
              try {
                const res = await fetch("/api/grants/redeem", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ code }),
                });
                const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
                if (res.ok && data?.ok) {
                  setMessage({ ok: true, text: data.message ?? "Applied." });
                  router.refresh();
                } else {
                  setMessage({ ok: false, text: data?.message ?? "That didn't go through — try again in a moment." });
                }
              } catch {
                setMessage({ ok: false, text: "That didn't go through — try again in a moment." });
              } finally {
                setBusy(false);
              }
            }}
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="HYPRR-XXXXXXXX"
              className="w-full min-w-0 rounded-lg border border-line bg-surface min-h-11 px-3 py-2 font-mono text-[16px] text-ink placeholder:text-muted focus:border-line-strong focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !code.trim()}
              className="shrink-0 rounded-lg bg-ink px-4 py-2 text-[13px] font-semibold text-surface hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Applying…" : "Apply"}
            </button>
          </form>
          {message && !message.ok && <p className="mt-2 text-[12px] text-deny-ink">{message.text}</p>}
        </>
      )}
    </div>
  );
}
