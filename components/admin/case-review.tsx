"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { VerdictViewModel } from "@/lib/research/verdictViewModel";
import type { TrackSignal, Verdict } from "@/lib/research/contracts";

// Phase 4 — the admin review surface. Renders the deterministic reasoning flow assembled by
// buildVerdictViewModel(): Executive Intelligence Summary → Verdict Panel → Cross-Track
// Intelligence → Track Intelligence → Founder Decision, plus a collapsed Engine Trace. The UI
// only READS the view model — it never reconstructs verdict/synthesis state.

const VERDICT_META: Record<Verdict, { name: string; cls: string }> = {
  source_clear: { name: "Source Clear", cls: "bg-clear-bg text-clear-ink border-clear-ink/30" },
  usable_with_conditions: { name: "Usable With Conditions", cls: "bg-conditional-bg text-conditional-ink border-conditional-ink/30" },
  verify_before_purchase: { name: "Verify Before Purchase", cls: "bg-verify-bg text-verify-ink border-verify-ink/30" },
  do_not_rely: { name: "Do Not Rely", cls: "bg-deny-bg text-deny-ink border-deny-ink/30" },
};

const SIGNAL_META: Record<TrackSignal, { label: string; cls: string }> = {
  pass: { label: "Pass", cls: "bg-clear-bg text-clear-ink" },
  infer: { label: "Infer", cls: "bg-conditional-bg text-conditional-ink" },
  flag: { label: "Flag", cls: "bg-verify-bg text-verify-ink" },
  soft_fail: { label: "Soft Fail", cls: "bg-deny-bg text-deny-ink" },
  hard_fail: { label: "Hard Fail", cls: "bg-deny-bg text-deny-ink" },
  n_a: { label: "N/A", cls: "bg-subtle text-muted" },
};

function Section({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-surface p-5">
      {eyebrow && <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{eyebrow}</div>}
      <h3 className="font-display text-[15px] font-bold text-ink">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function List({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <p className="text-[13px] text-muted">{empty}</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((s, i) => (
        <li key={i} className="flex gap-2 text-[14px] text-ink-2"><span className="text-muted">•</span>{s}</li>
      ))}
    </ul>
  );
}

export function CaseReview({
  caseId,
  vm,
  caseStatus,
}: {
  caseId: string;
  vm: VerdictViewModel;
  caseStatus: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "override" | "investigate">("idle");
  const [overrideVerdict, setOverrideVerdict] = useState<Verdict | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const delivered = caseStatus === "delivered" || caseStatus === "complete";

  async function send(action: "publish" | "override" | "request_investigation") {
    if (busy) return;
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/cases/${caseId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          override_verdict: action === "override" ? overrideVerdict : undefined,
          reason: action === "publish" ? undefined : reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.error === "banned_language") {
          throw new Error(`Delivery blocked — prohibited language: ${(data.violations ?? []).join(", ")}`);
        }
        throw new Error(data?.message || data?.error || "Could not save.");
      }
      setDone(
        action === "request_investigation"
          ? "Sent back for further investigation."
          : action === "override"
            ? "Verdict overridden & report delivered."
            : "Report delivered.",
      );
      setMode("idle");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  if (!vm.engineComplete) {
    return (
      <div className="rounded-card border border-line bg-surface p-6 text-center">
        <p className="text-[14px] font-semibold text-ink">Intelligence Engine has not completed.</p>
        <p className="mt-1 text-[13px] text-muted">
          No synthesis exists for this case yet. The review surface appears once the engine reaches report-ready.
        </p>
      </div>
    );
  }

  const v = vm.verdict!;
  const es = vm.executiveSummary!;
  const ct = vm.crossTrack!;
  const vmeta = VERDICT_META[v.verdict];

  return (
    <div className="space-y-5">
      {/* 1 — Executive Intelligence Summary (Module 9) */}
      <Section eyebrow="Module 9 · Decision Snapshot" title="Executive Intelligence Summary">
        <p className="text-[16px] font-semibold leading-snug text-ink">{es.headline || "—"}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-[12px] font-semibold text-muted">Leading Interpretation</div>
            <p className="mt-0.5 text-[14px] text-ink-2">{es.leading_interpretation || "—"}</p>
          </div>
          <div>
            <div className="text-[12px] font-semibold text-muted">The Real Risk</div>
            <p className="mt-0.5 text-[14px] text-ink-2">{es.the_real_risk || "—"}</p>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-line bg-base p-3">
            <div className="text-[12px] font-semibold text-muted">What to Verify <span className="font-normal">(vendor questions)</span></div>
            <div className="mt-1.5"><List items={es.what_to_verify} empty="No vendor questions." /></div>
          </div>
          <div className="rounded-lg border border-line bg-base p-3">
            <div className="text-[12px] font-semibold text-muted">What to Monitor <span className="font-normal">(watch points)</span></div>
            <div className="mt-1.5"><List items={es.what_to_monitor} empty="No watch points." /></div>
          </div>
        </div>
      </Section>

      {/* 2 — Verdict Panel */}
      <Section eyebrow="Layer 4 · Deterministic Judgment (ADR-G004)" title="Verdict">
        <div className={`rounded-lg border px-4 py-3 ${vmeta.cls}`}>
          <div className="text-[18px] font-bold">{vmeta.name}</div>
          <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
            <span>Weighted score <b>{v.weighted_score.toFixed(2)}</b> / 4</span>
            <span>Confidence <b>{v.confidence_0_15}</b> / 15</span>
            <span>Decision confidence <b className="capitalize">{v.decision_confidence}</b></span>
          </div>
        </div>
        {v.veto_fired && (
          <div className="mt-3 rounded-lg border border-deny-ink/30 bg-deny-bg p-3">
            <div className="text-[12px] font-semibold uppercase tracking-wide text-deny-ink">Verdict constrained by</div>
            <ul className="mt-1 space-y-1">
              {v.veto_reasons.map((r, i) => (
                <li key={i} className="text-[13px] text-deny-ink">• {r}</li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {/* 3 — Cross-Track Intelligence */}
      <Section eyebrow="Layer 3 · Synthesis (Modules 4/5/7)" title="Cross-Track Intelligence">
        <div className="space-y-4">
          <div>
            <div className="text-[12px] font-semibold text-muted">Contradictions</div>
            {ct.contradictions.length === 0 ? (
              <p className="mt-1 text-[13px] text-muted">None detected.</p>
            ) : (
              <ul className="mt-1.5 space-y-1.5">
                {ct.contradictions.map((c, i) => (
                  <li key={i} className="flex items-center gap-2 text-[14px] text-ink-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.risk_level === "critical" ? "bg-deny-bg text-deny-ink" : "bg-verify-bg text-verify-ink"}`}>
                      {c.risk_level}{c.is_load_bearing ? " · load-bearing" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <div className="text-[12px] font-semibold text-muted">Hypotheses</div>
            {ct.hypotheses.what_would_change_the_leader ? (
              <p className="mt-1 text-[14px] text-ink-2">
                What would change the leader: {ct.hypotheses.what_would_change_the_leader}
              </p>
            ) : (
              <p className="mt-1 text-[13px] text-muted">No competing hypotheses recorded.</p>
            )}
          </div>
          <div>
            <div className="text-[12px] font-semibold text-muted">Doubt Calibration</div>
            <p className="mt-1 text-[14px] text-ink-2">
              <span className="capitalize">{ct.doubt_calibration.doubt_level || "—"}</span>
              {ct.doubt_calibration.doubt_focus ? ` — ${ct.doubt_calibration.doubt_focus}` : ""}
            </p>
            {ct.doubt_calibration.rationale && (
              <p className="mt-0.5 text-[13px] text-muted">{ct.doubt_calibration.rationale}</p>
            )}
          </div>
        </div>
      </Section>

      {/* 4 — Track Intelligence */}
      <Section eyebrow="Layer 1 · Evidence + Layer 4a · Code-derived signals" title="Track Intelligence">
        <div className="space-y-3">
          {vm.tracks.map((t) => {
            const sm = t.signal ? SIGNAL_META[t.signal] : SIGNAL_META.n_a;
            return (
              <div key={t.track_number} className="rounded-lg border border-line bg-base p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[14px] font-semibold text-ink">{t.dimension}</span>
                  <div className="flex items-center gap-2">
                    {t.score_0_15 != null && <span className="text-[12px] text-muted">{t.score_0_15}/15{t.band ? ` · ${t.band}` : ""}</span>}
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${sm.cls}`}>{sm.label}</span>
                  </div>
                </div>
                {t.reasoning_notes && <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{t.reasoning_notes}</p>}
                {t.evidence_items.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {t.evidence_items.map((e) => (
                      <li key={e.evidence_id} className="text-[13px] text-ink-2">
                        <span className="text-muted">[{e.certainty}]</span> {e.statement}
                      </li>
                    ))}
                  </ul>
                )}
                {t.unknowns.length > 0 && (
                  <div className="mt-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Unknowns</div>
                    <ul className="mt-1 space-y-1">
                      {t.unknowns.map((u, i) => (
                        <li key={i} className="text-[13px] text-ink-2">• {u.unknown}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* 5 — Founder Decision */}
      <Section eyebrow="Optional · the engine already reached report-ready" title="Founder Decision">
        {delivered ? (
          <p className="text-[14px] font-semibold text-clear-ink">✓ This case has been delivered.</p>
        ) : (
          <>
            {mode === "idle" && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => send("publish")}
                  disabled={busy !== null}
                  className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
                >
                  {busy === "publish" ? "Delivering…" : "Publish report"}
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("override"); setError(null); }}
                  className="rounded-lg border border-line bg-base px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-subtle"
                >
                  Override verdict
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("investigate"); setError(null); }}
                  className="rounded-lg border border-line bg-base px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-subtle"
                >
                  Request further investigation
                </button>
              </div>
            )}

            {mode === "override" && (
              <div className="space-y-3">
                <div className="text-[13px] font-semibold text-ink">Override the engine verdict</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(Object.keys(VERDICT_META) as Verdict[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setOverrideVerdict(k)}
                      aria-pressed={overrideVerdict === k}
                      className={`rounded-lg border px-3 py-2 text-left text-[13px] font-semibold transition-colors ${overrideVerdict === k ? "border-brand bg-brand-tint text-brand-ink" : "border-line bg-base text-ink-2 hover:bg-subtle"}`}
                    >
                      {VERDICT_META[k].name}
                    </button>
                  ))}
                </div>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="Reason for overriding (required, audited)…"
                  className="w-full rounded-lg border border-line bg-base px-3 py-2 text-[14px] text-ink outline-none placeholder:text-muted focus:border-brand"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => send("override")}
                    disabled={busy !== null || !overrideVerdict || !reason.trim()}
                    className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
                  >
                    {busy === "override" ? "Saving…" : "Override & deliver"}
                  </button>
                  <button type="button" onClick={() => setMode("idle")} className="rounded-lg border border-line bg-base px-4 py-2 text-sm font-semibold text-ink-2 hover:bg-subtle">Cancel</button>
                </div>
              </div>
            )}

            {mode === "investigate" && (
              <div className="space-y-3">
                <div className="text-[13px] font-semibold text-ink">Send back for further investigation</div>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="What needs more evidence? (required, audited)…"
                  className="w-full rounded-lg border border-line bg-base px-3 py-2 text-[14px] text-ink outline-none placeholder:text-muted focus:border-brand"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => send("request_investigation")}
                    disabled={busy !== null || !reason.trim()}
                    className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
                  >
                    {busy === "request_investigation" ? "Sending…" : "Request investigation"}
                  </button>
                  <button type="button" onClick={() => setMode("idle")} className="rounded-lg border border-line bg-base px-4 py-2 text-sm font-semibold text-ink-2 hover:bg-subtle">Cancel</button>
                </div>
              </div>
            )}
          </>
        )}
        {error && <p className="mt-3 text-[13px] text-deny-ink">{error}</p>}
        {done && <p className="mt-3 text-[13px] font-semibold text-clear-ink">✓ {done}</p>}
      </Section>

      {/* Engine Trace — collapsed by default */}
      <details className="rounded-card border border-line bg-surface p-4">
        <summary className="cursor-pointer text-[13px] font-semibold text-ink-2">Engine Trace</summary>
        <div className="mt-3 space-y-3 text-[12px]">
          <div>
            <div className="font-semibold text-muted">Signals</div>
            <table className="mt-1 w-full text-left">
              <tbody>
                {vm.trace.signals.map((s) => (
                  <tr key={s.track_key} className="border-t border-line">
                    <td className="py-1 pr-3 text-ink-2">{s.dimension}</td>
                    <td className="py-1 pr-3 text-ink-2">{s.signal ?? "—"}</td>
                    <td className="py-1 text-muted">{s.score_0_15 != null ? `${s.score_0_15}/15` : "—"}{s.band ? ` · ${s.band}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {vm.trace.ios && (
            <div>
              <div className="font-semibold text-muted">IOS version vector</div>
              <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono text-[11px] text-ink-2">
                <span>ios: {vm.trace.ios.ios_version}</span>
                <span>evidence_hash: {vm.trace.ios.evidence_hash.slice(0, 12)}…</span>
                <span>rubric: {vm.trace.ios.rubric_version}</span>
                <span>synthesis: {vm.trace.ios.synthesis_version}</span>
                <span>prompt: {vm.trace.ios.prompt_version}</span>
                <span>model: {vm.trace.ios.model_provider}/{vm.trace.ios.model_version}</span>
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
