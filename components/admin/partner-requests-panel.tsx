"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PartnerRequest } from "@/lib/data/partnerRequests";
import { roleLabel, clientsBandLabel } from "@/lib/content/partnerRequest";

// ── PARTNER REQUESTS PANEL (ruling amended 2026-09-06) — sits beside the grants panel on
// /admin/acquisition. Everything needed for a yes/no lives in the row: who, what they do,
// rough volume, their note, when.
//
// APPROVE does the whole yes: creates the ruled grant, emails the requester the link, marks the
// request approved and shows which grant it produced. One click, no copying, no separate form.
// ⛔ Still no auto-issue — the founder decides who gets one; the click is the decision.
//
// ⚠ "MARK CONTACTED" IS GONE, and the reason is recorded because it is a lesson, not a
// preference: it read like it sent something, it never had, and the founder approved a request
// believing the requester had heard. An action's name must not describe a side effect the
// system does not perform — that is the /admin/support "Replies happen over email" defect in
// one button.
//
// The manual "Create a grant" form below stays: it is how someone who never used the form gets
// invited.

function fmt(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";
}

const STATUS_TONE: Record<PartnerRequest["status"], string> = {
  new: "text-conditional-ink",
  approved: "text-clear-ink",
  declined: "text-muted",
  contacted: "text-muted", // legacy-read-only; nothing issues it since 2026-09-06
};

type ApproveOutcome = { line: string; ok: boolean };

export function PartnerRequestsPanel({ requests, available }: {
  requests: PartnerRequest[];
  available: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<Record<string, ApproveOutcome>>({});

  async function decide(id: string, action: "approve" | "decline") {
    if (busyId) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/partner-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOutcomes((o) => ({ ...o, [id]: { ok: false, line: data?.message || data?.error || "The decision could not be recorded." } }));
        return;
      }
      if (action === "approve") {
        // ⚠ THE EMAIL OUTCOME IS REPORTED, NEVER ASSUMED — the exact confusion this feature
        // replaces was an operator believing a requester had heard something they had not.
        setOutcomes((o) => ({
          ...o,
          [id]: data.emailed?.sent
            ? { ok: true, line: `Grant ${data.grant?.code_prefix ?? ""}… created and the invite emailed.` }
            : { ok: false, line: `Grant ${data.grant?.code_prefix ?? ""}… created — but the email did NOT send${data.emailed?.reason ? ` (${data.emailed.reason})` : ""}. Copy its link from the grants panel below and send it yourself.` },
        }));
      }
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
        Filed from the /partners form. Approve creates the ruled grant and emails the requester its
        link in one click; Decline records the no and sends nothing.
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
                      <button type="button" disabled={busyId === r.id} onClick={() => decide(r.id, "approve")}
                        className="rounded-lg bg-brand px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-hover disabled:opacity-60">
                        {busyId === r.id ? "Approving…" : "Approve & send invite"}
                      </button>
                      <button type="button" disabled={busyId === r.id} onClick={() => decide(r.id, "decline")}
                        className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px] font-semibold text-muted hover:bg-subtle disabled:opacity-60">
                        Decline
                      </button>
                    </>
                  ) : (
                    <span className={`text-[12px] font-semibold ${STATUS_TONE[r.status] ?? "text-muted"}`}>
                      {r.status} {r.decided_at ? `· ${fmt(r.decided_at)}` : ""}
                    </span>
                  )}
                </div>
              </div>
              {/* An approved row with NO grant is the remnant of a failed creation whose revert
                  also failed — a problem to show, never a state to smooth over. */}
              {r.status === "approved" && !r.grant_id && !outcomes[r.id] && (
                <p className="mt-2 text-[12px] font-semibold text-deny-ink">
                  Approved but no grant is attached — the creation failed mid-flight. Create one in
                  the grants panel below and send its link by hand.
                </p>
              )}
              {outcomes[r.id] && (
                <p className={`mt-2 text-[12px] font-semibold ${outcomes[r.id].ok ? "text-clear-ink" : "text-deny-ink"}`}>
                  {outcomes[r.id].line}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
