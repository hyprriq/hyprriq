"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AcquisitionGrant, GrantRedemption } from "@/lib/data/grants";

// ── GRANTS MANAGER (founder-ruled 2026-08-21) — create a grant as a link or a code, see who
// redeemed it and when. The VALUE is ruled and fixed (one free full assessment — 1 credit on
// the full-report tier), so the form only asks mode, note, cap, and expiry (≤30 days, the
// ruled ceiling). Super-admin only (the page + API both gate).

function fmt(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";
}

function grantState(g: AcquisitionGrant): { label: string; tone: string } {
  if (g.revoked_at) return { label: "revoked", tone: "text-deny-ink" };
  if (new Date(g.expires_at).getTime() <= Date.now()) return { label: "expired", tone: "text-muted" };
  if (g.redemption_count >= g.max_redemptions) return { label: "fully redeemed", tone: "text-muted" };
  return { label: "active", tone: "text-verify-ink" };
}

export function GrantsManager({ grants, redemptions, siteUrl }: {
  grants: AcquisitionGrant[];
  redemptions: GrantRedemption[];
  siteUrl: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"link" | "coupon">("link");
  const [note, setNote] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState(1);
  const [expiresDays, setExpiresDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const redemptionsByGrant = new Map<string, GrantRedemption[]>();
  for (const r of redemptions) {
    redemptionsByGrant.set(r.grant_id, [...(redemptionsByGrant.get(r.grant_id) ?? []), r]);
  }

  async function create() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, note, maxRedemptions, expiresDays }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Could not create the grant.");
      setNote("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the grant.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    await fetch(`/api/admin/grants/${id}`, { method: "PATCH" });
    router.refresh();
  }

  function copyShareable(g: AcquisitionGrant) {
    const text = g.mode === "link" ? `${siteUrl}/grant/${g.code}` : g.code;
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(g.id);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-card border border-line bg-surface p-5">
        <div className="font-display text-sm font-bold text-ink">Create a grant</div>
        <p className="mt-1 text-[13px] text-muted">
          Value is fixed by ruling: one free full assessment (1 credit, every assessment area). Expiry caps at 30 days.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-[12px] text-muted">
            Mode
            <select value={mode} onChange={(e) => setMode(e.target.value as "link" | "coupon")}
              className="mt-1 block rounded-lg border border-line bg-base px-2.5 py-2 text-[13px] text-ink">
              <option value="link">Invite link (auto-applies)</option>
              <option value="coupon">Coupon code (typed)</option>
            </select>
          </label>
          <label className="text-[12px] text-muted">
            Redemption cap
            <input type="number" min={1} max={1000} value={maxRedemptions}
              onChange={(e) => setMaxRedemptions(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
              className="mt-1 block w-24 rounded-lg border border-line bg-base px-2.5 py-2 text-[13px] text-ink" />
          </label>
          <label className="text-[12px] text-muted">
            Expires (days)
            <input type="number" min={1} max={30} value={expiresDays}
              onChange={(e) => setExpiresDays(Math.max(1, Math.min(30, Number(e.target.value) || 30)))}
              className="mt-1 block w-24 rounded-lg border border-line bg-base px-2.5 py-2 text-[13px] text-ink" />
          </label>
          <label className="min-w-[220px] flex-1 text-[12px] text-muted">
            Note (who this is for)
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Jan — BBQ community"
              className="mt-1 block w-full rounded-lg border border-line bg-base px-2.5 py-2 text-[13px] text-ink placeholder:text-muted" />
          </label>
          <button type="button" onClick={create} disabled={busy}
            className="rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-hover disabled:opacity-60">
            {busy ? "Creating…" : "Create"}
          </button>
        </div>
        {error && <p className="mt-2 text-[13px] text-deny-ink">{error}</p>}
      </div>

      <div className="rounded-card border border-line bg-surface p-5">
        <div className="font-display text-sm font-bold text-ink">Grants</div>
        {grants.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted">None yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3">Grant</th>
                  <th className="py-2 pr-3">Mode</th>
                  <th className="py-2 pr-3">Redeemed</th>
                  <th className="py-2 pr-3">Expires</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {grants.map((g) => {
                  const st = grantState(g);
                  const rs = redemptionsByGrant.get(g.id) ?? [];
                  return (
                    <tr key={g.id} className="border-b border-line/60 align-top">
                      <td className="py-2.5 pr-3">
                        <div className="font-semibold text-ink">{g.note || "(no note)"}</div>
                        <div className="mt-0.5 font-mono text-[12px] text-muted">
                          {g.mode === "link" ? `/grant/${g.code.slice(0, 8)}…` : g.code}
                        </div>
                        {rs.length > 0 && (
                          <div className="mt-1 text-[12px] text-ink-2">
                            {rs.map((r) => (
                              <div key={r.id}>{r.email || r.client_id} · {fmt(r.redeemed_at)}</div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-ink-2">{g.mode === "link" ? "invite link" : "coupon"}</td>
                      <td className="py-2.5 pr-3 tabular-nums text-ink-2">{g.redemption_count}/{g.max_redemptions}</td>
                      <td className="py-2.5 pr-3 text-ink-2">{fmt(g.expires_at)}</td>
                      <td className={`py-2.5 pr-3 font-semibold ${st.tone}`}>{st.label}</td>
                      <td className="py-2.5 text-right">
                        <button type="button" onClick={() => copyShareable(g)}
                          className="rounded-lg border border-line bg-base px-2.5 py-1.5 text-[12px] font-semibold text-ink-2 hover:bg-subtle">
                          {copied === g.id ? "Copied ✓" : g.mode === "link" ? "Copy link" : "Copy code"}
                        </button>
                        {!g.revoked_at && (
                          <button type="button" onClick={() => revoke(g.id)}
                            className="ml-2 rounded-lg border border-line bg-base px-2.5 py-1.5 text-[12px] font-semibold text-deny-ink hover:bg-subtle">
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
