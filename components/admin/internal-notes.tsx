"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function formatStamp(iso: string | null): string {
  if (!iso) return "never";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// Admin-only internal notes (Item 2). Explicit "Save notes" button (not blur) so
// the admin always knows the save happened; notes_updated_at shows staleness.
export function InternalNotes({
  clientId,
  initialNotes,
  initialUpdatedAt,
}: {
  clientId: string;
  initialNotes: string | null;
  initialUpdatedAt: string | null;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [savedNotes, setSavedNotes] = useState(initialNotes ?? "");
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = notes !== savedNotes;

  async function save() {
    if (busy || !dirty) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internal_notes: notes }),
      });
      if (!res.ok) throw new Error("Could not save notes.");
      const data = (await res.json()) as { notes_updated_at: string };
      setSavedNotes(notes);
      setUpdatedAt(data.notes_updated_at);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-card border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-ink">Internal notes</h2>
        <span className="rounded bg-subtle px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
          Admin only
        </span>
      </div>
      <p className="mt-1 text-[12px] text-muted">Never visible to the client. Updated {formatStamp(updatedAt)}.</p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={6}
        placeholder="Context that doesn't fit elsewhere — e.g. 'Walmart seller, new to wholesale', 'prefers phone, don't email', 'referred by …'."
        className="mt-3 w-full resize-y rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-brand"
      />
      {error && <p className="mt-2 text-[13px] text-deny-ink">{error}</p>}
      <div className="mt-3 flex items-center justify-end gap-3">
        {dirty && <span className="text-[12px] text-muted">Unsaved changes</span>}
        <button
          type="button"
          onClick={save}
          disabled={busy || !dirty}
          className="rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save notes"}
        </button>
      </div>
    </div>
  );
}
