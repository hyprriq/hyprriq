"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ── THE REPLY FORM (founder-ruled 2026-09-01) ────────────────────────────────────────────────
//
// ⚠ THE GATE DECIDES, NOT THIS COMPONENT. There is no client-side language check here on
// purpose: the route runs scanHard server-side and returns 422 with the labels, exactly as the
// prose-override panel does. A client-side copy would be a second definition of the copy law and
// would drift from the one that actually blocks.
//
// Status is a REQUIRED choice, never inferred from whether text was typed. "I answered" and
// "this is resolved" are different statements and an operator often means only the first.

const STATUSES = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
] as const;

export function SupportReply({
  ticketId,
  currentStatus,
  existingResponse,
  clientEmail,
}: {
  ticketId: string;
  currentStatus: string;
  existingResponse: string | null;
  clientEmail: string | null;
}) {
  const router = useRouter();
  const [text, setText] = useState(existingResponse ?? "");
  const [status, setStatus] = useState(currentStatus);
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function save() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch(`/api/admin/support/${ticketId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: text, status, notify }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || "Could not save the reply.");
      // The email is loud-but-non-fatal server-side, so its outcome is REPORTED here rather than
      // assumed: an operator who thinks the client was emailed when they were not is worse off
      // than one who knows to follow up.
      const n = data?.notified;
      setDone(
        n?.sent
          ? `Saved. The client was emailed to read it in their portal.`
          : `Saved. No email sent${n?.reason ? ` (${n.reason})` : ""} — the reply is visible in the client's portal either way.`,
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the reply.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-card border border-line bg-surface p-5">
      <div className="font-display text-base font-bold text-ink">Reply</div>
      <p className="mt-1 text-[13px] text-muted">
        The client reads this in their portal. They are emailed that a reply is waiting — the reply
        itself is never sent by email.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={7}
        placeholder="Write the answer the client will read…"
        className="mt-3 w-full rounded-lg border border-line-strong bg-canvas px-3 py-2 text-[14px] text-ink"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="text-[13px] font-semibold text-ink-2">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="ml-2 min-h-11 rounded-lg border border-line-strong bg-canvas px-2 text-[14px] text-ink"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>

        <label className="inline-flex min-h-11 items-center gap-2 text-[13px] text-ink-2">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
          Email {clientEmail ?? "the client"}
        </label>

        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="min-h-11 ml-auto inline-flex items-center rounded-lg bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save reply"}
        </button>
      </div>

      {error && <p className="mt-3 text-[14px] text-deny-ink">{error}</p>}
      {done && <p className="mt-3 text-[14px] text-clear-ink">{done}</p>}
    </div>
  );
}
