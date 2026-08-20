"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GRANTABLE_CAPABILITIES, CAPABILITY_LABELS, type Capability } from "@/lib/auth/capabilities";

// ── PERMISSION HIERARCHY (2026-08-02) — user management. Function landed 2026-08-11
// (invitations: invite/pending/claimed/expired/revoked/revoke + share-link fallback; client
// assignment; plain-English capability labels). RESTYLED 2026-08-13 (admin design pass):
// every handler, API call, and structural rule below is byte-identical to the wired version —
// only the presentation moved. The screen is organised as its two jobs:
//   1. WHO HAS ACCESS — invite (the front door), pending invitations, the team list.
//   2. WHAT THEY CAN REACH — per person: capability chips + assigned clients.
// Raw Clerk IDs are debugging data — demoted to a title tooltip on the email. The Clerk-ID
// creation path is the FALLBACK, folded into a closed disclosure at the end. ──

interface AdminUserRow {
  user_id: string; email: string; role: string; capabilities: string[]; disabled: boolean; created_by: string | null;
  // Resolved from Clerk by /api/admin/users (2026-08-20); null when Clerk has no name or is unreachable.
  name?: string | null; image_url?: string | null;
}

interface InvitationRow {
  id: number | string; email: string; capabilities: string[]; created_at: string; expires_at: string;
  accepted_at: string | null; accepted_user_id: string | null; revoked_at: string | null;
}

function invitationStatus(inv: InvitationRow): "pending" | "claimed" | "expired" | "revoked" {
  if (inv.accepted_at) return "claimed";
  if (inv.revoked_at) return "revoked";
  if (new Date(inv.expires_at).getTime() <= Date.now()) return "expired";
  return "pending";
}

// Calm, tokened invitation states — conditional=waiting, clear=done, subtle=lapsed, deny=pulled.
const INVITE_STATUS_CLS: Record<string, string> = {
  pending: "bg-conditional-bg text-conditional-ink",
  claimed: "bg-clear-bg text-clear-ink",
  expired: "bg-subtle text-muted",
  revoked: "bg-deny-bg text-deny-ink",
};

const label = (c: string) => CAPABILITY_LABELS[c as Capability] ?? c;

function CapChips({ caps, empty }: { caps: string[]; empty: string }) {
  if (caps.length === 0) return <span className="text-[12px] text-muted">{empty}</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {caps.map((c) => (
        <span key={c} className="rounded border border-line bg-subtle px-1.5 py-0.5 text-[11px] font-medium text-ink-2">
          {label(c)}
        </span>
      ))}
    </span>
  );
}

export function UsersManager({
  selfId,
  selfRole,
  selfCaps,
  assignableClients = [],
  assignments = [],
}: {
  selfId: string;
  selfRole: "super_admin" | "admin" | "sub_user";
  selfCaps: string[];
  assignableClients?: { id: string; label: string }[];
  assignments?: { admin_user_id: string; client_id: string }[];
}) {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [invites, setInvites] = useState<InvitationRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "sub_user">("sub_user");
  const [newCaps, setNewCaps] = useState<Capability[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCaps, setInviteCaps] = useState<Capability[]>([]);
  const [assignPick, setAssignPick] = useState<Record<string, string>>({});
  // What THIS grantor's checkboxes may offer — mirrors grantableBy server-side.
  const GRANTABLE = GRANTABLE_CAPABILITIES.filter(
    (c) => selfRole === "super_admin" || selfCaps.includes(c),
  );
  const canAssign = selfRole === "super_admin"; // assignment is user management — API-enforced too

  const load = useCallback(async () => {
    const [uRes, iRes] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/admin/invitations"),
    ]);
    if (!uRes.ok) { setError((await uRes.json().catch(() => null))?.error ?? "load failed"); setLoaded(true); return; }
    setUsers((await uRes.json()).users ?? []);
    if (iRes.ok) setInvites((await iRes.json()).invitations ?? []);
    setLoaded(true);
  }, []);
  // Initial fetch from the external API — the setState happens after the network await, but the
  // react-hooks heuristic flags it; the fetch-on-mount is intentional for this functional screen.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function create(preset: boolean) {
    if (busy || !newUserId.trim() || !newEmail.trim()) return;
    setBusy(true); setError(null);
    const base = { user_id: newUserId, email: newEmail, role: newRole };
    const res = await fetch("/api/admin/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preset ? { ...base, preset: "full_access" } : { ...base, capabilities: newCaps }),
    });
    if (!res.ok) setError((await res.json().catch(() => null))?.error ?? "create failed");
    else { setNewUserId(""); setNewEmail(""); setNewRole("sub_user"); setNewCaps([]); await load(); }
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

  async function invite(preset: boolean) {
    if (busy || !inviteEmail.trim()) return;
    setBusy(true); setError(null); setNotice(null);
    const res = await fetch("/api/admin/invitations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preset ? { email: inviteEmail, preset: "full_access" } : { email: inviteEmail, capabilities: inviteCaps }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) setError(json?.error ?? "invite failed");
    else {
      setInviteEmail(""); setInviteCaps([]);
      if (!json?.email_sent) setNotice(`Invitation created but the email was not sent (${json?.email_skip_reason ?? "unknown"}) — share the sign-up link directly: ${json?.share_link ?? "/sign-up"}`);
      await load();
    }
    setBusy(false);
  }

  async function revoke(id: InvitationRow["id"]) {
    if (busy) return;
    setBusy(true); setError(null);
    const res = await fetch(`/api/admin/invitations/${id}`, { method: "DELETE" });
    if (!res.ok) setError((await res.json().catch(() => null))?.error ?? "revoke failed");
    else await load();
    setBusy(false);
  }

  async function assign(staffId: string) {
    const clientId = assignPick[staffId];
    if (busy || !clientId) return;
    setBusy(true); setError(null);
    const res = await fetch(`/api/admin/clients/${clientId}/assignments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ admin_user_id: staffId }),
    });
    if (!res.ok) setError((await res.json().catch(() => null))?.error ?? "assign failed");
    else router.refresh(); // assignments arrive as server props
    setBusy(false);
  }

  async function unassign(staffId: string, clientId: string) {
    if (busy) return;
    setBusy(true); setError(null);
    const res = await fetch(`/api/admin/clients/${clientId}/assignments`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ admin_user_id: staffId }),
    });
    if (!res.ok) setError((await res.json().catch(() => null))?.error ?? "unassign failed");
    else router.refresh();
    setBusy(false);
  }

  const clientLabel = (id: string) => assignableClients.find((c) => c.id === id)?.label ?? id;

  return (
    <div className="max-w-[920px] space-y-5">
      {error && <p className="rounded-lg bg-deny-bg px-3 py-2 text-[13px] text-deny-ink">{error}</p>}
      {notice && <p className="rounded-lg bg-conditional-bg px-3 py-2 text-[13px] text-conditional-ink">{notice}</p>}

      {/* ============ JOB 1 · WHO HAS ACCESS — invite is the front door ============ */}
      <div className="rounded-card border border-line bg-surface p-4">
        <h2 className="font-display text-[15px] font-semibold text-ink">Invite someone</h2>
        <p className="mt-1 max-w-[64ch] text-[12.5px] text-ink-2">
          The invited person signs up with this email address; on their first admin visit their staff access
          activates with the permissions below. Invitations expire after 7 days and can be revoked while pending.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-[12px] font-medium text-ink-2">Email<br />
            <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="mt-1 w-64 rounded-lg border border-line bg-base px-2.5 py-1.5 text-[13px] text-ink" placeholder="name@example.com" />
          </label>
          <button type="button" disabled={busy || !inviteEmail.trim()} onClick={() => invite(false)}
            className="rounded-lg bg-brand px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
            Invite with selected permissions
          </button>
          <button type="button" disabled={busy || !inviteEmail.trim()} onClick={() => invite(true)}
            className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-ink hover:bg-subtle disabled:opacity-50">
            Invite with full access
          </button>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
          {GRANTABLE.map((cap) => (
            <label key={cap} className="flex items-center gap-1.5 text-[12px] text-ink-2">
              <input type="checkbox" checked={inviteCaps.includes(cap)}
                onChange={(e) => setInviteCaps(e.target.checked ? [...inviteCaps, cap] : inviteCaps.filter((c) => c !== cap))} />
              {label(cap)}
            </label>
          ))}
        </div>

        {invites.length > 0 && (
          <div className="mt-4 border-t border-line pt-3">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-2">Invitations</div>
            {invites.map((inv) => {
              const st = invitationStatus(inv);
              return (
                <div key={String(inv.id)} className="grid grid-cols-[minmax(160px,1.2fr)_76px_minmax(120px,1fr)_88px_64px] items-center gap-3 border-t border-line/60 py-2 first:border-t-0">
                  <span className={`truncate text-[13px] font-medium ${st === "expired" || st === "revoked" ? "text-muted" : "text-ink"}`}>{inv.email}</span>
                  <span className={`justify-self-start rounded px-1.5 py-0.5 text-[11px] font-semibold capitalize ${INVITE_STATUS_CLS[st]}`}>{st}</span>
                  <CapChips caps={inv.capabilities ?? []} empty="No permissions" />
                  <span className="font-mono text-[11px] text-muted">exp {new Date(inv.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  <span className="text-right">
                    {st === "pending" && (
                      <button type="button" disabled={busy} onClick={() => revoke(inv.id)}
                        className="rounded border border-line px-2 py-0.5 text-[11px] font-semibold text-ink-2 hover:bg-subtle">
                        Revoke
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============ THE TEAM — who's here, then what each person can reach ============ */}
      <div className="rounded-card border border-line bg-surface p-4">
        <h2 className="font-display text-[15px] font-semibold text-ink">Team</h2>

        {!loaded ? (
          <div className="mt-3 space-y-2" aria-hidden>
            {[0, 1].map((i) => (
              <div key={i} className="animate-pulse rounded-lg bg-subtle py-6" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-2">
            No admin-permission rows yet — the founder seeds the super admin via SQL (migration template); legacy founder access works meanwhile.
          </p>
        ) : (
          <div className="mt-2">
            {users.map((u) => {
              const isSelf = u.user_id === selfId;
              const isSuper = u.role === "super_admin";
              // Tiered management: admin rows are editable by the super admin only.
              const managable = !isSuper && !isSelf && (u.role === "sub_user" || selfRole === "super_admin");
              const assigned = assignments.filter((a) => a.admin_user_id === u.user_id).map((a) => a.client_id);
              const unassigned = assignableClients.filter((c) => !assigned.includes(c.id));
              return (
                <div key={u.user_id} className="border-t border-line py-3 first:border-t-0">
                  {/* line 1 — the person. Name from Clerk (one source, resolved at request time);
                      email is the secondary line when a name exists, the identity when it doesn't. */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Clerk ID is debugging data — it lives in the tooltip, not on screen */}
                    <span className="inline-flex flex-col" title={u.user_id}>
                      <span className="text-[13.5px] font-semibold text-ink">{u.name?.trim() || u.email}</span>
                      {u.name?.trim() && <span className="text-[11.5px] text-muted">{u.email}</span>}
                    </span>
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${isSuper ? "bg-clear-bg text-clear-ink" : "bg-subtle text-ink-2"}`}>
                      {u.role === "super_admin" ? "Founder" : u.role === "admin" ? "Admin" : "Staff"}
                    </span>
                    {u.disabled && <span className="rounded bg-deny-bg px-1.5 py-0.5 text-[11px] font-semibold text-deny-ink">Disabled</span>}
                    <span className="ml-auto">
                      {isSuper ? (
                        <span className="text-[11px] text-muted">founder-managed (SQL)</span>
                      ) : isSelf ? (
                        <span className="text-[11px] text-muted">your row</span>
                      ) : !managable ? (
                        <span className="text-[11px] text-muted">managed by the super admin</span>
                      ) : (
                        <button type="button" disabled={busy} onClick={() => patch(u.user_id, { disabled: !u.disabled })}
                          className="rounded border border-line px-2 py-0.5 text-[11px] font-semibold text-ink-2 hover:bg-subtle">
                          {u.disabled ? "Enable" : "Disable"}
                        </button>
                      )}
                    </span>
                  </div>

                  {/* line 2 — what they can reach */}
                  <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-2">Permissions</div>
                      <div className="mt-1">
                        {isSuper ? (
                          <span className="text-[12px] text-ink-2">All permissions</span>
                        ) : managable ? (
                          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                            {GRANTABLE.map((cap) => (
                              <label key={cap} className="flex items-center gap-1.5 text-[12px] text-ink-2">
                                <input type="checkbox" checked={u.capabilities.includes(cap)} disabled={busy}
                                  onChange={(e) => patch(u.user_id, { capabilities: e.target.checked ? [...u.capabilities, cap] : u.capabilities.filter((c) => c !== cap) })} />
                                {label(cap)}
                              </label>
                            ))}
                          </div>
                        ) : (
                          <CapChips caps={u.capabilities} empty="No permissions" />
                        )}
                      </div>
                    </div>
                    {canAssign && !isSuper && (
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-2">Client access</div>
                        {assigned.length === 0 ? (
                          <p className="mt-1 text-[12.5px] text-ink-2">
                            {u.capabilities.includes("view_all_clients")
                              ? "Sees all clients (permission)."
                              : <><span className="font-semibold text-verify-ink">No clients assigned</span> — this person sees an empty product until one is.</>}
                          </p>
                        ) : (
                          <ul className="mt-1 space-y-1">
                            {assigned.map((cid) => (
                              <li key={cid} className="flex items-center gap-2 text-[12.5px] text-ink-2">
                                {clientLabel(cid)}
                                <button type="button" disabled={busy} onClick={() => unassign(u.user_id, cid)}
                                  className="rounded border border-line px-1.5 py-0.5 text-[11px] font-semibold text-ink-2 hover:bg-subtle">
                                  Remove
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        {unassigned.length > 0 && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <select value={assignPick[u.user_id] ?? ""} onChange={(e) => setAssignPick({ ...assignPick, [u.user_id]: e.target.value })}
                              className="rounded-lg border border-line bg-base px-2 py-1 text-[12px] text-ink">
                              <option value="">Choose a client…</option>
                              {unassigned.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                            </select>
                            <button type="button" disabled={busy || !assignPick[u.user_id]} onClick={() => assign(u.user_id)}
                              className="rounded border border-line px-2 py-0.5 text-[11px] font-semibold text-ink-2 hover:bg-subtle disabled:opacity-50">
                              Assign
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============ FALLBACK — the Clerk-ID path, deliberately behind a disclosure ============ */}
      <details className="rounded-card border border-line bg-surface">
        <summary className="cursor-pointer list-none p-4 text-[13px] font-semibold text-ink-2 hover:text-ink">
          Add by Clerk user ID <span className="font-normal text-muted">— fallback for someone who already signed up. Prefer Invite by email above.</span>
        </summary>
        <div className="border-t border-line p-4">
          <p className="mb-2 max-w-[70ch] text-[12.5px] text-ink-2">
            {selfRole === "super_admin"
              ? "You can create admins (who manage staff) and staff. A super_admin row is founder-seeded SQL only. Money and all-clients scope stay with the super admin."
              : "You can create staff and grant a subset of your own permissions. Admins are created by the super admin."}
            {" "}You cannot edit your own row. For someone who has not signed up yet, use Invite by email above.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            {selfRole === "super_admin" && (
              <label className="text-[12px] font-medium text-ink-2">Role<br />
                <select value={newRole} onChange={(e) => setNewRole(e.target.value as "admin" | "sub_user")}
                  className="mt-1 rounded-lg border border-line bg-base px-2 py-1.5 text-[13px] text-ink">
                  <option value="sub_user">Staff (works cases)</option>
                  <option value="admin">Admin (manages staff)</option>
                </select>
              </label>
            )}
            <label className="text-[12px] font-medium text-ink-2">Clerk user id<br />
              <input value={newUserId} onChange={(e) => setNewUserId(e.target.value)} className="mt-1 w-64 rounded-lg border border-line bg-base px-2.5 py-1.5 font-mono text-[12.5px] text-ink" placeholder="user_..." />
            </label>
            <label className="text-[12px] font-medium text-ink-2">Email (label)<br />
              <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="mt-1 w-64 rounded-lg border border-line bg-base px-2.5 py-1.5 text-[13px] text-ink" placeholder="name@example.com" />
            </label>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
            {GRANTABLE.map((cap) => (
              <label key={cap} className="flex items-center gap-1.5 text-[12px] text-ink-2">
                <input type="checkbox" checked={newCaps.includes(cap)}
                  onChange={(e) => setNewCaps(e.target.checked ? [...newCaps, cap] : newCaps.filter((c) => c !== cap))} />
                {label(cap)}
              </label>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={busy} onClick={() => create(false)}
              className="rounded-lg bg-brand px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
              Create with selected permissions
            </button>
            <button type="button" disabled={busy} onClick={() => create(true)}
              className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-ink hover:bg-subtle disabled:opacity-50">
              Create with full access
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}
