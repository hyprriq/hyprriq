"use client";

import { useState } from "react";
import { buildPublishConfirm, buildDeliveredToast } from "@/lib/admin/publish-confirm";
import { useRouter } from "next/navigation";
import type { VerdictViewModel } from "@/lib/research/verdictViewModel";
import type { TrackSignal, Verdict, VerdictResult, AdditionalQuestion, SupplierIdentity } from "@/lib/research/contracts";
import { mergeCaseQuestions } from "@/lib/portal/questions-view";

// Phase 4 — the admin review surface. Renders the deterministic reasoning flow assembled by
// buildVerdictViewModel(): Executive Intelligence Summary → Verdict Panel → Cross-Track
// Intelligence → Track Intelligence → Research Coverage & Gaps → Analyst Decision, plus a
// collapsed Engine Trace. The UI
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

const BOUNDARY_NAME: Record<number, string> = { 3.2: "Source Clear", 2.2: "Usable With Conditions", 1.2: "Verify Before Purchase" };

// Item 1 — plain-language confidence explanation, built from the engine's derivation trace.
function confidenceExplanation(v: VerdictResult): string {
  const d = v.derivation;
  const score = d.raw_score.toFixed(2);
  if (v.derivation.final_differs_from_score && v.veto_fired) {
    const lock = d.vetoes.find((x) => x.kind === "lock");
    if (lock) return `Decision confidence is High — the verdict is locked at ${VERDICT_META[lock.verdict].name} by veto (${lock.reason}); the score (${score}) cannot override it.`;
    return `Decision confidence is ${cap(v.decision_confidence)} — the score (${score}) mapped to ${VERDICT_META[d.score_verdict].name}, but the verdict was floored to ${VERDICT_META[v.verdict].name} by veto.`;
  }
  const near = BOUNDARY_NAME[d.margin.nearest_boundary] ?? `${d.margin.nearest_boundary}`;
  const tail = v.decision_confidence === "low"
    ? "a small shift in evidence could flip the verdict"
    : v.decision_confidence === "moderate"
      ? "a moderate margin — fairly stable"
      : "well clear of the boundary — stable";
  return `Decision confidence is ${cap(v.decision_confidence)} — the weighted score ${score} sits ${d.margin.distance.toFixed(2)} from the ${near} threshold (${d.margin.nearest_boundary}); ${tail}.`;
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

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

const SOURCE_LABEL: Record<"system" | "additional", string> = {
  system: "System-generated",
  additional: "Analyst-added",
};

export function CaseReview({
  caseId,
  caseNumber,
  vendorName = null,
  vm,
  caseStatus,
  additionalQuestions = [],
  supplierIdentity = null,
  canRerun = false,
}: {
  caseId: string;
  caseNumber: string;
  vendorName?: string | null;
  vm: VerdictViewModel;
  caseStatus: string;
  additionalQuestions?: AdditionalQuestion[];
  supplierIdentity?: SupplierIdentity | null;
  canRerun?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "override" | "investigate" | "dispute">("idle");
  const [overrideVerdict, setOverrideVerdict] = useState<Verdict | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  // Gap B — analyst/review-team questions (create/edit/delete against cases.additional_questions).
  const [qBusy, setQBusy] = useState(false);
  const [qError, setQError] = useState<string | null>(null);
  const [nq, setNq] = useState<{ question: string; reason: string; brand: string; priority: "high" | "medium" | "low"; required: boolean }>({ question: "", reason: "", brand: "", priority: "medium", required: false });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ef, setEf] = useState<{ question: string; reason: string; brand: string; priority: "high" | "medium" | "low"; required: boolean }>({ question: "", reason: "", brand: "", priority: "medium", required: false });

  const delivered = caseStatus === "delivered" || caseStatus === "complete";
  // H3 — display names for unassessed scoring dimensions (ceiling panel).
  const DIM_NAME: Record<string, string> = {
    supplier_identity: "Supplier Identity", supply_chain_relationship: "Supply Chain Relationship",
    brand_risk_assessment: "Brand Risk Assessment", documentation_review: "Documentation Review",
  };
  const questions = mergeCaseQuestions(vm.tracks, additionalQuestions);

  async function questionAction(method: "POST" | "PATCH" | "DELETE", body: object): Promise<boolean> {
    if (qBusy) return false;
    setQBusy(true);
    setQError(null);
    try {
      const res = await fetch(`/api/admin/cases/${caseId}/questions`, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || "Could not save the question.");
      router.refresh();
      return true;
    } catch (e) {
      setQError(e instanceof Error ? e.message : "Could not save the question.");
      return false;
    } finally {
      setQBusy(false);
    }
  }

  async function send(action: "publish" | "override" | "request_investigation") {
    if (busy) return;
    // H5 addendum — irreversible-delivery guard: confirm the CASE IDENTITY before committing a
    // publish/override (a wrong-case click delivers the wrong client's report permanently, H1).
    const confirmMsg = buildPublishConfirm(action, caseNumber, vendorName);
    if (confirmMsg && !window.confirm(confirmMsg)) return;
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
      // Name the delivered case in the success toast (server echoes case_number; fall back to the
      // prop). A dispute re-run on a delivered case returns an explicit note (frozen record, H1) —
      // surface the server's own wording when it sends one.
      setDone(typeof data?.note === "string" ? data.note : buildDeliveredToast(action, typeof data?.case_number === "string" ? data.case_number : caseNumber));
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
      {/* Spec-B — Identity discrepancy (name/website mismatch): informational only, NEVER a verdict/fraud penalty. */}
      {supplierIdentity?.identity_discrepancy && (
        <div className="rounded-card border border-conditional-ink/30 bg-conditional-bg p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-semibold text-conditional-ink">Identity discrepancy</span>
            <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted">{supplierIdentity.identity_discrepancy.kind}</span>
            <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted">resolution {supplierIdentity.resolution_confidence ?? supplierIdentity.identity_confidence} · input {supplierIdentity.input_consistency ?? "—"}</span>
          </div>
          <div className="mt-1.5 text-[13px] text-ink-2">
            Entered <span className="font-semibold text-ink">“{supplierIdentity.identity_discrepancy.entered_name}”</span> →
            resolved <span className="font-semibold text-ink">“{supplierIdentity.identity_discrepancy.resolved_name}”</span>
            {supplierIdentity.identity_discrepancy.resolved_domain ? <span className="text-muted"> ({supplierIdentity.identity_discrepancy.resolved_domain})</span> : null}
          </div>
          <div className="mt-1 text-[12px] text-muted">Client copy: {supplierIdentity.identity_discrepancy.client_note}</div>
        </div>
      )}
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
        {/* H3 — verdict ceiling: explains why a score-clear case shows Usable With Conditions
            while Brand Risk is unbuilt. Same shared applyVerdictCeiling as the pipeline/rejudge. */}
        {vm.ceiling?.ceiling_applied && (
          <div className="mt-3 rounded-lg border border-conditional-ink/30 bg-conditional-bg p-3">
            <div className="text-[12px] font-semibold uppercase tracking-wide text-conditional-ink">Verdict ceiling applied</div>
            <p className="mt-1 text-[13px] text-conditional-ink">{vm.ceiling.ceiling_reason}</p>
          </div>
        )}
        {vm.ceiling && vm.ceiling.unassessed.length > 0 && (
          <p className="mt-2 text-[12px] text-muted">
            Not assessed in this investigation: {vm.ceiling.unassessed.map((k) => DIM_NAME[k] ?? k).join(", ")}.
          </p>
        )}
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

        {/* Item 1 — confidence explanation */}
        <div className="mt-3 rounded-lg border border-line bg-base p-3">
          <div className="text-[12px] font-semibold text-muted">Why this confidence</div>
          <p className="mt-1 text-[13px] text-ink-2">{confidenceExplanation(v)}</p>
        </div>

        {/* Item 2 — Why Not? rejected verdicts */}
        <div className="mt-3 rounded-lg border border-line bg-base p-3">
          <div className="text-[12px] font-semibold text-muted">Why not the other verdicts?</div>
          <ul className="mt-1.5 space-y-1.5">
            {v.derivation.rejected.map((r) => (
              <li key={r.verdict} className="text-[13px] text-ink-2">
                <span className="font-semibold text-ink">{VERDICT_META[r.verdict].name}:</span> {r.reason}
              </li>
            ))}
          </ul>
        </div>
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
                {/* ADR-T2-002 — scoped Track 2 finding + boundary notes; reasoning_notes kept as analyst context. */}
                {t.brand_relationship_finding && (
                  <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-ink-2">{t.brand_relationship_finding}</p>
                )}
                {t.boundary_notes.map((n) => (
                  <div key={n.label} className="mt-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{n.label}</div>
                    <div className="text-[12px] text-muted">{n.text}</div>
                  </div>
                ))}
                {t.reasoning_notes && (
                  <p className={`mt-2 text-[13px] leading-relaxed ${t.brand_relationship_finding ? "text-muted" : "text-ink-2"}`}>
                    {t.brand_relationship_finding && <span className="text-[11px] font-semibold uppercase tracking-wide">Analyst context: </span>}
                    {t.reasoning_notes}
                  </p>
                )}
                {/* Track 5 (sub-gate B, OQ-B1a) — the non-voting arbitration block: ADMIN-ONLY
                    (stripped from the delivered client payload per the OQ-D rule). */}
                {t.sourcing_logic && (
                  <div className="mt-2 rounded-md border border-line bg-raised p-2.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Sourcing Logic — arbitration (non-voting)
                    </div>
                    {t.sourcing_logic.flags.length > 0 ? (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {t.sourcing_logic.flags.map((f) => (
                          <span key={f} className="rounded-full border border-line bg-base px-2 py-0.5 text-[11px] font-medium text-ink-2">
                            {f.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-[12px] text-muted">No scenario flags.</p>
                    )}
                    <p className="mt-1.5 text-[12px] text-ink-2">
                      <span className="font-semibold capitalize">{t.sourcing_logic.scenario_coherence.assessment.replace(/_/g, " ")}</span>
                      <span className="text-muted"> — {t.sourcing_logic.scenario_coherence.basis}</span>
                    </p>
                    {t.sourcing_logic.contradictions.length > 0 && (
                      <ul className="mt-1.5 space-y-1.5">
                        {t.sourcing_logic.contradictions.map((c, i) => (
                          <li key={i} className="text-[12px] text-ink-2">
                            <span className="font-semibold">{c.contradiction_type.replace(/_/g, " ")}</span>
                            <span className="text-muted"> · {c.risk_level}</span>
                            <div className="text-muted">{c.assertion_a.track_key} vs {c.assertion_b.track_key} — {c.interpretation}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
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

      {/* 4.5 — Research Coverage & Gaps (items 3 + 4) */}
      {vm.coverage && vm.gaps && (
        <Section eyebrow="Research completeness" title="Research Coverage & Gaps">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-line bg-base p-3">
              <div className="text-[22px] font-bold text-ink">{vm.coverage.tracks_run}<span className="text-[13px] font-normal text-muted"> run · {vm.coverage.tracks_skipped} skipped</span></div>
              <div className="text-[12px] text-muted">Tracks</div>
            </div>
            <div className="rounded-lg border border-line bg-base p-3">
              <div className="text-[22px] font-bold text-ink">{vm.coverage.total_evidence_items}</div>
              <div className="text-[12px] text-muted">Evidence items</div>
            </div>
            <div className="rounded-lg border border-line bg-base p-3">
              <div className="text-[13px] font-semibold text-ink">
                <span className="text-clear-ink">{vm.coverage.certainty.verified} verified</span> ·{" "}
                <span className="text-conditional-ink">{vm.coverage.certainty.inferred} inferred</span> ·{" "}
                <span className="text-muted">{vm.coverage.certainty.unknown} unknown</span>
              </div>
              <div className="mt-0.5 text-[12px] text-muted">Certainty mix</div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-[12px] font-semibold text-muted">Missing evidence <span className="font-normal">(material, not found — informational)</span></div>
              {vm.gaps.per_track.every((g) => g.missing.length === 0) ? (
                <p className="mt-1 text-[13px] text-muted">Nothing material missing.</p>
              ) : (
                <div className="mt-1.5 space-y-2">
                  {vm.gaps.per_track.filter((g) => g.missing.length > 0).map((g) => (
                    <div key={g.track_key}>
                      <div className="text-[12px] font-semibold text-ink">{g.dimension}</div>
                      <div className="text-[13px] text-ink-2">{g.missing.map((m) => m.label).join(" · ")}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="text-[12px] font-semibold text-muted">Unknowns <span className="font-normal">(looked, unresolvable)</span></div>
              {vm.gaps.per_track.every((g) => g.unknowns.length === 0) ? (
                <p className="mt-1 text-[13px] text-muted">No open unknowns.</p>
              ) : (
                <div className="mt-1.5 space-y-2">
                  {vm.gaps.per_track.filter((g) => g.unknowns.length > 0).map((g) => (
                    <div key={g.track_key}>
                      <div className="text-[12px] font-semibold text-ink">{g.dimension}</div>
                      <ul className="space-y-0.5">
                        {g.unknowns.map((u, i) => (
                          <li key={i} className="text-[13px] text-ink-2">• {u.unknown}{u.resolvable_by_client ? <span className="text-muted"> — client-resolvable</span> : null}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* 4.6 — Questions to Ask (Gap A: system questions; Gap B: analyst add/edit/delete). Merge is
          view-model-only (source-tagged); the AI questions_to_ask are never mutated. */}
      <Section eyebrow="Layer 5 · What to ask the supplier" title="Questions to Ask">
        {questions.length === 0 ? (
          <p className="text-[13px] text-muted">No system questions for this case. Add your own below.</p>
        ) : (
          <ul className="space-y-2">
            {questions.map((q, i) => (
              <li key={q.id ?? `sys-${i}`} className="rounded-lg border border-line bg-base p-3">
                {editingId && q.id === editingId ? (
                  <div className="space-y-2">
                    <textarea value={ef.question} onChange={(e) => setEf({ ...ef, question: e.target.value })} rows={2}
                      className="w-full rounded-lg border border-line bg-surface p-2 text-[13px]" />
                    <input value={ef.reason} onChange={(e) => setEf({ ...ef, reason: e.target.value })} placeholder="reason / why it matters (optional)"
                      className="w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-[13px]" />
                    <div className="flex flex-wrap items-center gap-2">
                      <input value={ef.brand} onChange={(e) => setEf({ ...ef, brand: e.target.value })} placeholder="brand (optional)"
                        className="rounded-lg border border-line bg-surface px-2 py-1 text-[12px]" />
                      <select value={ef.priority} onChange={(e) => setEf({ ...ef, priority: e.target.value as typeof ef.priority })}
                        className="rounded-lg border border-line bg-surface px-2 py-1 text-[12px]">
                        <option value="high">high</option><option value="medium">medium</option><option value="low">low</option>
                      </select>
                      <label className="flex items-center gap-1 text-[12px] text-ink-2"><input type="checkbox" checked={ef.required} onChange={(e) => setEf({ ...ef, required: e.target.checked })} /> required</label>
                      <button type="button" disabled={qBusy || !ef.question.trim()} onClick={async () => { if (await questionAction("PATCH", { id: q.id, ...ef })) setEditingId(null); }}
                        className="rounded-lg bg-brand px-3 py-1 text-[12px] font-semibold text-white disabled:opacity-50">Save</button>
                      <button type="button" onClick={() => setEditingId(null)} className="rounded-lg border border-line bg-base px-3 py-1 text-[12px] font-semibold text-ink-2">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-medium text-ink">{q.question}</span>
                      <span className="rounded-full bg-subtle px-2 py-0.5 text-[11px] font-semibold text-muted">{SOURCE_LABEL[q.source]}</span>
                      {q.brand && <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-semibold text-brand-ink">{q.brand}</span>}
                      <span className="rounded-full bg-subtle px-2 py-0.5 text-[11px] font-semibold text-muted">{q.priority}</span>
                      {q.required && <span className="rounded-full bg-deny-bg px-2 py-0.5 text-[11px] font-semibold text-deny-ink">required</span>}
                      {q.source === "additional" && q.id && (
                        <span className="ml-auto flex gap-2">
                          <button type="button" disabled={qBusy} onClick={() => { setEditingId(q.id!); setEf({ question: q.question, reason: q.reason ?? "", brand: q.brand, priority: q.priority, required: !!q.required }); }}
                            className="text-[12px] font-semibold text-brand hover:text-brand-hover disabled:opacity-50">Edit</button>
                          <button type="button" disabled={qBusy} onClick={() => questionAction("DELETE", { id: q.id })}
                            className="text-[12px] font-semibold text-deny-ink hover:opacity-80 disabled:opacity-50">Delete</button>
                        </span>
                      )}
                    </div>
                    {q.reason && <div className="mt-0.5 text-[13px] text-muted">{q.reason}</div>}
                    {q.blocking_weight_key && <div className="mt-0.5 text-[11px] text-muted">unlocks: {q.blocking_weight_key}</div>}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Analyst add form — always available, even with zero system questions. */}
        <div className="mt-4 rounded-lg border border-dashed border-line bg-base p-3">
          <div className="mb-2 text-[12px] font-semibold text-muted">Add a question (analyst)</div>
          <textarea value={nq.question} onChange={(e) => setNq({ ...nq, question: e.target.value })} rows={2} placeholder="What should the client ask their supplier?"
            className="w-full rounded-lg border border-line bg-surface p-2 text-[13px]" />
          <input value={nq.reason} onChange={(e) => setNq({ ...nq, reason: e.target.value })} placeholder="reason / why it matters (optional)"
            className="mt-2 w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-[13px]" />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input value={nq.brand} onChange={(e) => setNq({ ...nq, brand: e.target.value })} placeholder="brand (optional)"
              className="rounded-lg border border-line bg-surface px-2 py-1 text-[12px]" />
            <select value={nq.priority} onChange={(e) => setNq({ ...nq, priority: e.target.value as typeof nq.priority })}
              className="rounded-lg border border-line bg-surface px-2 py-1 text-[12px]">
              <option value="high">high</option><option value="medium">medium</option><option value="low">low</option>
            </select>
            <label className="flex items-center gap-1 text-[12px] text-ink-2"><input type="checkbox" checked={nq.required} onChange={(e) => setNq({ ...nq, required: e.target.checked })} /> required</label>
            <button type="button" disabled={qBusy || !nq.question.trim()}
              onClick={async () => { if (await questionAction("POST", nq)) setNq({ question: "", reason: "", brand: "", priority: "medium", required: false }); }}
              className="rounded-lg bg-brand px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50">Add question</button>
          </div>
          {qError && <p className="mt-2 text-[12px] text-deny-ink">{qError}</p>}
        </div>
      </Section>

      {/* 5 — Analyst Decision */}
      <Section eyebrow="Optional · the engine already reached report-ready" title="Analyst Decision">
        {/* H5 — assertion-tier advisories: status vocabulary present in narrative/question fields.
            Non-blocking; the publish click is the attribution judgment. Hard tier gates separately. */}
        {vm.assertion_advisories.length > 0 && !delivered && (
          <div className="mb-3 rounded-lg border border-conditional-ink/30 bg-conditional-bg p-3">
            <div className="text-[12px] font-semibold uppercase tracking-wide text-conditional-ink">Review wording before publish</div>
            <p className="mt-1 text-[13px] text-conditional-ink">
              Status-assertion phrases found (verify each is attributed to its source, never stated as our conclusion): {vm.assertion_advisories.join(" · ")}
            </p>
          </div>
        )}
        {delivered ? (
          <div className="space-y-3">
            <p className="text-[14px] font-semibold text-clear-ink">✓ This case has been delivered.</p>
            {/* DISPUTE RE-RUN (founder-ordered 2026-07-30) — the API already supported rerunning a
                delivered case (enqueue a new attempt; the delivered record stays frozen, H1); this
                button surfaces that EXISTING path. Deliberately distinct from the pre-delivery
                "Request further investigation": different act, different consequence, own confirm. */}
            {canRerun && mode !== "dispute" && (
              <button
                type="button"
                onClick={() => { setMode("dispute"); setError(null); setDone(null); }}
                className="rounded-lg border border-deny-ink/40 bg-deny-bg px-4 py-2.5 text-sm font-semibold text-deny-ink hover:opacity-90"
              >
                Re-investigate (dispute)
              </button>
            )}
            {mode === "dispute" && (
              <div className="space-y-3 rounded-lg border border-deny-ink/30 bg-deny-bg/40 p-3">
                <div className="text-[13px] font-semibold text-ink">Dispute re-run — costs a real engine run</div>
                <p className="text-[13px] leading-relaxed text-ink-2">
                  Creates a new attempt through the full pipeline. The delivered report the client
                  received stays frozen and unchanged (H1); the case is flagged
                  reinvestigation_pending when the new attempt completes.
                </p>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="Why is this delivered case being re-investigated? (required, audited)…"
                  className="w-full rounded-lg border border-line bg-base px-3 py-2 text-[14px] text-ink outline-none placeholder:text-muted focus:border-brand"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => send("request_investigation")}
                    disabled={busy !== null || !reason.trim()}
                    className="rounded-lg bg-deny-ink px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {busy === "request_investigation" ? "Enqueuing…" : "Confirm dispute re-run"}
                  </button>
                  <button type="button" onClick={() => setMode("idle")} className="rounded-lg border border-line bg-base px-4 py-2 text-sm font-semibold text-ink-2 hover:bg-subtle">Cancel</button>
                </div>
              </div>
            )}
          </div>
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
          {v.derivation && (
            <div>
              <div className="font-semibold text-muted">Score math (ADR-G004) — raw {v.derivation.raw_score.toFixed(2)} → {VERDICT_META[v.derivation.score_verdict].name}{v.derivation.final_differs_from_score ? ` → veto → ${VERDICT_META[v.verdict].name}` : ""}</div>
              <table className="mt-1 w-full text-left">
                <tbody>
                  {v.derivation.contributions.map((c) => (
                    <tr key={c.track_key} className="border-t border-line">
                      <td className="py-1 pr-3 text-ink-2">{c.track_key}</td>
                      <td className="py-1 pr-3 text-ink-2">{c.signal}</td>
                      <td className="py-1 pr-3 text-muted">{c.signal_score.toFixed(1)} × {c.weight.toFixed(2)}</td>
                      <td className="py-1 text-muted">{c.included ? c.contribution.toFixed(3) : "excluded"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
