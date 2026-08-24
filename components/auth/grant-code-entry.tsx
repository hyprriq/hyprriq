"use client";

import { useState } from "react";
import { GRANT_CODE_ENTRY_COPY as COPY } from "@/lib/content/partnerRequest";

// ── "HAVE AN ACCESS CODE?" AT REGISTRATION (founder-locked 2a/2b, 2026-08-22) ────────────────
// Rendered on the sign-up page, under the Clerk card — discoverable without instructions: the
// person holding a code is already looking at this screen. Validates via /api/grants/check
// BEFORE the account exists (dead codes answer in the gate's own pinned words), and a valid
// code is parked in the same cookie the invite link uses — code-typers and link-clickers end up
// in the same state. This component grants nothing; the attach flow after registration does.

export function GrantCodeEntry() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  if (result?.ok) {
    return (
      <div className="mt-4 rounded-lg border border-line bg-surface p-3">
        <p className="text-[13px] font-semibold text-verify-ink">{result.text}</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[13px] font-semibold text-brand underline-offset-2 hover:underline"
        >
          {COPY.toggle}
        </button>
      ) : (
        <div className="rounded-lg border border-line bg-surface p-3">
          <p className="text-[13px] font-semibold text-ink">{COPY.toggle}</p>
          <p className="mt-1 text-[12px] text-ink-2">{COPY.hint}</p>
          <form
            className="mt-2 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy || !code.trim()) return;
              setBusy(true);
              setResult(null);
              try {
                const res = await fetch("/api/grants/check", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ code }),
                });
                const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
                setResult({ ok: !!(res.ok && data?.ok), text: data?.message ?? COPY.error });
              } catch {
                setResult({ ok: false, text: COPY.error });
              } finally {
                setBusy(false);
              }
            }}
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="HYPRR-XXXXXXXX"
              className="w-full min-w-0 rounded-lg border border-line bg-canvas min-h-11 px-3 py-2 font-mono text-[16px] text-ink placeholder:text-muted focus:border-line-strong focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !code.trim()}
              className="shrink-0 rounded-lg bg-ink px-3 py-2 text-[13px] font-semibold text-surface hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Checking…" : COPY.apply}
            </button>
          </form>
          {result && !result.ok && <p className="mt-2 text-[12px] text-deny-ink">{result.text}</p>}
        </div>
      )}
    </div>
  );
}
