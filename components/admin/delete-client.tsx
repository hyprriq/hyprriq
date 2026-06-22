"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Item 4 — admin-only double-confirmation delete. The destructive button only
// enables once the typed email exactly matches the client's. Hard delete; the
// API enforces all guards server-side (this is UX, not the security boundary).
export function DeleteClient({
  clientId,
  clientEmail,
  clientName,
}: {
  clientId: string;
  clientEmail: string;
  clientName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = confirm.trim().toLowerCase() === clientEmail.toLowerCase();

  async function destroy() {
    if (busy || !matches) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm_email: confirm.trim(), reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Delete failed.");
      }
      router.push("/admin/clients");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-card border border-deny-ink/30 bg-deny-bg/40 p-5">
      <h2 className="text-[14px] font-semibold text-deny-ink">Danger zone</h2>
      <p className="mt-1 text-[13px] text-ink-2">
        Permanently delete this client and all associated data (cases, files,
        support requests). This cannot be undone. Billing records are retained for
        compliance.
      </p>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 rounded-lg border border-deny-ink/40 px-4 py-2 text-[13px] font-semibold text-deny-ink transition-colors hover:bg-deny-bg"
        >
          Delete account…
        </button>
      ) : (
        <div className="mt-4 rounded-lg border border-deny-ink/30 bg-surface p-4">
          <p className="text-[13px] font-medium text-ink">
            This permanently destroys all data for{" "}
            <span className="font-bold">{clientName || clientEmail}</span>. This cannot be undone.
          </p>
          <label className="mt-3 block">
            <span className="text-[12px] font-medium text-ink-2">
              Type <span className="font-bold">{clientEmail}</span> to confirm
            </span>
            <input
              type="text"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              className="mt-1 w-full rounded-lg border border-line bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-deny-ink"
            />
          </label>
          <label className="mt-3 block">
            <span className="text-[12px] font-medium text-ink-2">Reason (optional, logged)</span>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. GDPR erasure request"
              className="mt-1 w-full rounded-lg border border-line bg-base px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-brand"
            />
          </label>
          {error && <p className="mt-3 text-[13px] text-deny-ink">{error}</p>}
          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => { setOpen(false); setConfirm(""); setError(null); }}
              disabled={busy}
              className="text-[13px] font-medium text-muted hover:text-ink disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={destroy}
              disabled={busy || !matches}
              className="rounded-lg bg-deny-ink px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Deleting…" : "Permanently delete"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
