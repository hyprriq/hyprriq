"use client";

import { useEffect, useState, useCallback } from "react";
import { CAPABILITIES, type Capability } from "@/lib/auth/capabilities";

// ── ADMIN ACCESS FIX — the thin user-management screen (function only; UI/UX thread restyles).
// Calls the existing users APIs. The STRUCTURAL RULES are surfaced, not discovered as errors:
// super_admin rows show "founder-managed (SQL)" with no controls; the caller's own row shows
// "your row" with no controls; sub-user creation offers only the six capabilities + FULL ACCESS. ──

interface AdminUserRow {
  user_id: string; email: string; role: string; capabilities: string[]; disabled: boolean; created_by: string | null;
}

export function UsersManager({ selfId }: { selfId: string }) {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCaps, setNewCaps] = useState<Capability[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (!res.ok) { setError((await res.json().catch(() => null))?.error ?? "load failed"); return; }
    setUsers((await res.json()).users ?? []);
  }, []);
  // Initial fetch from the external API — the setState happens after the network await, but the
  // react-hooks heuristic flags it; the fetch-on-mount is intentional for this functional screen.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function create(preset: boolean) {
    if (busy || !newUserId.trim() || !newEmail.trim()) return;
    setBusy(true); setError(null);
    const res = await fetch("/api/admin/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preset ? { user_id: newUserId, email: newEmail, preset: "full_access" } : { user_id: newUserId, email: newEmail, capabilities: newCaps }),
    });
    if (!res.ok) setError((await res.json().catch(() => null))?.error ?? "create failed");
    else { setNewUserId(""); setNewEmail(""); setNewCaps([]); await load(); }
    setBusy(false);
  }

  async function patch(id: string, body: { capabilities?: string[]; disabled?: boolean }) {
    if (busy) return;
    setBusy(true); setError(null);
    const res = await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) setError((await res.json().catch(() => null))?.error ?? "update failed");
    else await load();
    setBusy(false);
  }

  return (
    <div className="space-y-5">
      {error && <p className="rounded-lg bg-deny-bg px-3 py-2 text-[13px] text-deny-ink">{error}</p>}

      <div className="rounded-card border border-line bg-surface p-4">
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">Admin users</div>
        <table className="w-full text-[13px]">
          <tbody>
            {users.map((u) => {
              const isSelf = u.user_id === selfId;
              const isSuper = u.role === "super_admin";
              return (
                <tr key={u.user_id} className="border-t border-line/60 first:border-t-0 align-top">
                  <td className="py-2 pr-3">
                    <div className="font-medium text-ink">{u.email}</div>
                    <div className="text-[11px] text-muted">{u.user_id}</div>
                  </td>
                  <td className="py-2 pr-3">
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${isSuper ? "bg-clear-bg text-clear-ink" : "bg-subtle text-muted"}`}>{u.role}</span>
                    {u.disabled && <span className="ml-1 rounded bg-deny-bg px-1.5 py-0.5 text-[11px] font-semibold text-deny-ink">disabled</span>}
                  </td>
                  <td className="py-2 pr-3 text-muted">{isSuper ? "all capabilities" : (u.capabilities.join(", ") || "none")}</td>
                  <td className="py-2 text-right">
                    {isSuper ? (
                      <span className="text-[11px] text-muted">founder-managed (SQL)</span>
                    ) : isSelf ? (
                      <span className="text-[11px] text-muted">your row</span>
                    ) : (
                      <div className="flex justify-end gap-2">
                        {CAPABILITIES.map((cap) => (
                          <label key={cap} className="flex items-center gap-1 text-[11px] text-muted">
                            <input type="checkbox" checked={u.capabilities.includes(cap)} disabled={busy}
                              onChange={(e) => patch(u.user_id, { capabilities: e.target.checked ? [...u.capabilities, cap] : u.capabilities.filter((c) => c !== cap) })} />
                            {cap}
                          </label>
                        ))}
                        <button type="button" disabled={busy} onClick={() => patch(u.user_id, { disabled: !u.disabled })}
                          className="rounded border border-line px-2 py-0.5 text-[11px] font-semibold text-ink hover:bg-subtle">
                          {u.disabled ? "enable" : "disable"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && <tr><td className="py-3 text-muted">No admin-permission rows yet — the founder seeds the super admin via SQL (migration template); legacy founder access works meanwhile.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="rounded-card border border-line bg-surface p-4">
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">Create sub-user</div>
        <p className="mb-2 text-[12px] text-muted">Sub-users only — a super_admin row can only be seeded by the founder in SQL. You cannot edit your own row.</p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[12px] text-muted">Clerk user id<br />
            <input value={newUserId} onChange={(e) => setNewUserId(e.target.value)} className="mt-1 w-64 rounded-lg border border-line bg-base px-2 py-1.5 text-[13px] text-ink" placeholder="user_..." />
          </label>
          <label className="text-[12px] text-muted">Email (label)<br />
            <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="mt-1 w-64 rounded-lg border border-line bg-base px-2 py-1.5 text-[13px] text-ink" placeholder="name@example.com" />
          </label>
        </div>
        <div className="mt-2 flex flex-wrap gap-3">
          {CAPABILITIES.map((cap) => (
            <label key={cap} className="flex items-center gap-1 text-[12px] text-muted">
              <input type="checkbox" checked={newCaps.includes(cap)}
                onChange={(e) => setNewCaps(e.target.checked ? [...newCaps, cap] : newCaps.filter((c) => c !== cap))} />
              {cap}
            </label>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" disabled={busy} onClick={() => create(false)}
            className="rounded-lg bg-brand px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
            Create with selected capabilities
          </button>
          <button type="button" disabled={busy} onClick={() => create(true)}
            className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-ink hover:bg-subtle disabled:opacity-50">
            Create with FULL ACCESS
          </button>
        </div>
      </div>
    </div>
  );
}
