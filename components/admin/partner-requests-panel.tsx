"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PartnerRequest } from "@/lib/data/partnerRequests";
import { roleLabel, clientsBandLabel } from "@/lib/content/partnerRequest";

// ── PARTNER REQUESTS PANEL (founder-ruled 2026-08-22, item 1d) — sits beside the grants panel
// on /admin/acquisition. Everything needed for a yes/no lives in the row: who, what they do,
// rough volume, their note, when. The DECISION stays entirely manual: "yes" = the founder
// creates a grant in the panel below and sends the link himself, then marks the request
// contacted; "no" = declined. Nothing here touches grants — a request never becomes one by code.

function fmt(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";
}

const STATUS_TONE: Record<PartnerRequest["status"], string> = {
  new: "text-conditional-ink",
  contacted: "text-verify-ink",
  declined: "text-muted",
};

export function PartnerRequestsPanel({ requests, available }: {
  requests: PartnerRequest[];
  available: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function decide(id: string, status: "contacted" | "declined") {
    if (busyId) return;
    setBusyId(id);
    try {
      await fetch(`/api/admin/partner-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  const open = requests.filter((r) => r.status === "new");
  const decided = requests.filter((r) => r.status !== "new");

  return (
    <div className="rounded-card border border-line bg-surface p-5">
      <div className="font-display text-sm font-bold text-ink">Partner requests</div>
      <p className="mt-1 text-[13px] text-muted">
        Filed from the /partners form. A request is only a request — saying yes means creating a grant below
        and sending the link yourself, then marking it contacted.
      </p>
      {!available ? (
        <p className="mt-3 text-[13px] text-muted">
          The partner_requests table hasn&rsquo;t been migrated yet (founder-run, 20260822100000) — the form
          answers &ldquo;not open yet&rdquo; until it exists.
        </p>
      ) : requests.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted">None yet.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {[...open, ...decided].map((r) => (
            <div key={r.id} className="rounded-lg border border-line/60 bg-canvas p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-[14px] font-semibold text-ink">
                    {r.name} <span className="font-normal text-muted">·</span>{" "}
                    <span className="font-mono text-[12px] font-normal text-ink-2">{r.email}</span>
                  </div>
                  <div className="mt-0.5 text-[13px] text-ink-2">
                    {roleLabel(r.role)} · sources for {clientsBandLabel(r.clients_band)} · asked {fmt(r.created_at)}
                  </div>
                  {r.note && <div className="mt-1 text-[13px] italic text-ink-2">&ldquo;{r.note}&rdquo;</div>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {r.status === "new" ? (
                    <>
                      <button type="button" disabled={busyId === r.id} onClick={() => decide(r.id, "contacted")}
                        className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px] font-semibold text-verify-ink hover:bg-subtle disabled:opacity-60">
                        Mark contacted
                      </button>
                      <button type="button" disabled={busyId === r.id} onClick={() => decide(r.id, "declined")}
                        className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px] font-semibold text-muted hover:bg-subtle disabled:opacity-60">
                        Decline
                      </button>
                    </>
                  ) : (
                    <span className={`text-[12px] font-semibold ${STATUS_TONE[r.status]}`}>
                      {r.status} {r.decided_at ? `· ${fmt(r.decided_at)}` : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
