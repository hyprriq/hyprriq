"use client";

import { useState } from "react";
import { buildPublishConfirm, buildDeliveredToast } from "@/lib/admin/publish-confirm";
import { useRouter } from "next/navigation";
import type { VerdictViewModel } from "@/lib/research/verdictViewModel";
import type { TrackSignal, Verdict, AdditionalQuestion, SupplierIdentity } from "@/lib/research/contracts";
import { mergeCaseQuestions } from "@/lib/portal/questions-view";
import type { AreaView, LastDecision } from "@/lib/admin/reviewView";
import type { BannedHit } from "@/lib/utils/bannedLanguageReport";
import type { CaseDetail, Finding, ClientReport } from "@/lib/data/cases";
import { ReportView, FindingBody } from "@/components/portal/report-view";

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


// (§1.2: the confidence-explanation paragraph retired with the rebuild — the header's
// direction line carries decision provenance; the full derivation stays in Engine Trace.)

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
  canPublish = false,
  areas = [],
  lastDecision = null,
  slaHours = null,
  escalation = null,
  clientView = null,
}: {
  caseId: string;
  caseNumber: string;
  vendorName?: string | null;
  vm: VerdictViewModel;
  caseStatus: string;
  additionalQuestions?: AdditionalQuestion[];
  supplierIdentity?: SupplierIdentity | null;
  canRerun?: boolean;
  canPublish?: boolean;
  areas?: AreaView[];
  lastDecision?: LastDecision | null;
  slaHours?: number | null;
  escalation?: string | null;
  clientView?: { c: CaseDetail; findings: Finding[]; report: ClientReport | null } | null;
}) {
  const router = useRouter();
  // §2 — the client view is a first-class working tool: a persistent top-level toggle, not a
  // forgettable tab. Client mode renders the REAL portal report component over the SAME pure
  // projection the client path uses — what you see is what they see.
  const [view, setView] = useState<"operator" | "client">("operator");
  const [mode, setMode] = useState<"idle" | "override" | "investigate" | "dispute">("idle");
  const [overrideVerdict, setOverrideVerdict] = useState<Verdict | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // "SHOW + FIX" piece 1 — a banned-language block is not a one-line error, it is a worklist: the
  // operator needs the sentence, the field it lives in, and what to write instead.
  const [blocked, setBlocked] = useState<{ violations: string[]; findings: BannedHit[] } | null>(null);
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
    setBlocked(null);
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
          // Structured, not a string: the panel below names every sentence and where it lives.
          setBlocked({ violations: data.violations ?? [], findings: data.findings ?? [] });
          return;
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
  // §4 — the one number that earns prominence: direction, not arithmetic. Where did this
  // verdict come from, and how close was it?
  const d = v.derivation;
  const direction = v.veto_fired
    ? `This verdict came from: ${v.veto_reasons.join("; ")} — not the score (score alone said ${VERDICT_META[d.score_verdict].name}).`
    : `Score-decided — ${d.raw_score.toFixed(2)}/4, ${d.margin.distance.toFixed(2)} from the ${d.margin.nearest_boundary} boundary${v.decision_confidence === "low" ? ". Flippable: spend your scrutiny on the evidence below" : ""}.`;
  const escalated = caseStatus === "manual_override_required";

  return (
    <div className="space-y-5">
      {/* ── Header: verdict + direction + the view toggle. Always visible in both views. ── */}
      <div className="rounded-card border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-lg border px-3 py-1.5 text-[15px] font-bold ${vmeta.cls}`}>{vmeta.name}</span>
          <span className="text-[12px] text-muted">recomputed now from stored signals — not an archived record</span>
          <div className="ml-auto flex rounded-lg border border-line bg-base p-0.5" role="tablist" aria-label="Review view">
            {(["operator", "client"] as const).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => setView(k)}
                className={`rounded-md px-3 py-1 text-[12.5px] font-semibold ${view === k ? "bg-brand text-white" : "text-ink-2 hover:bg-subtle"}`}>
                {k === "operator" ? "Operator view" : "What the client sees"}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-[13.5px] font-medium text-ink-2">{direction}</p>
      </div>

      {/* §6 — escalation state: name the pipeline's specific reason, never a bare banner. */}
      {escalated && (
        <div className="rounded-card border border-deny-ink/30 bg-deny-bg p-4">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-deny-ink">Escalated by the pipeline — human decision required</div>
          <p className="mt-1 text-[13px] text-deny-ink">{escalation ?? "The pipeline flagged this case for manual review."}</p>
        </div>
      )}

      {/* §6 — last decision on file (cases.internal_notes; the column OVERWRITES — latest only). */}
      {lastDecision && (
        <div className="rounded-card border border-line bg-subtle px-4 py-2.5 text-[13px] text-ink-2">
          <span className="font-semibold text-ink">Last decision on file:</span>{" "}
          {lastDecision.raw ?? (
            <>
              {lastDecision.action ?? "—"}
              {lastDecision.reason ? ` — “${lastDecision.reason}”` : ""}
              {lastDecision.reviewed_by ? ` · by ${lastDecision.reviewed_by}` : ""}
              {lastDecision.at ? ` · ${new Date(lastDecision.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : ""}
            </>
          )}
        </div>
      )}

      {view === "client" && clientView ? (
        /* ── THE CLIENT'S SCREEN — the real portal report component over the same pure
              projection the client path uses. A working support tool, not a preview. ── */
        <div className="rounded-card border-2 border-brand/40 bg-surface p-5">
          <div className="mb-4 text-[11px] font-bold uppercase tracking-wider text-brand">
            Client view — rendered exactly as the client&rsquo;s report page renders it
          </div>
          <ReportView c={clientView.c} findings={clientView.findings} report={clientView.report} preview />
        </div>
      ) : (
      <>
      {/* Spec-B — Identity discrepancy (name/website mismatch): informational only, NEVER a verdict/fraud penalty. */}
      {/* §3/§4 — identity resolution ALWAYS shows, clean or not: wrong entity poisons everything
          downstream, so "was the right company researched" must be confirmable either way. */}
      <div className={`rounded-card border p-4 ${supplierIdentity?.identity_discrepancy ? "border-conditional-ink/30 bg-conditional-bg" : "border-line bg-surface"}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">Who was researched</span>
          {supplierIdentity ? (
            <>
              <span className="text-[14px] font-semibold text-ink">{supplierIdentity.resolved_name ?? vendorName ?? "—"}</span>
              {supplierIdentity.resolved_domain && <span className="font-mono text-[12px] text-muted">{supplierIdentity.resolved_domain}</span>}
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${(supplierIdentity.resolution_confidence ?? supplierIdentity.identity_confidence) === "high" ? "bg-clear-bg text-clear-ink" : "bg-conditional-bg text-conditional-ink"}`}>
                resolution {supplierIdentity.resolution_confidence ?? supplierIdentity.identity_confidence ?? "—"}
              </span>
              {!supplierIdentity.identity_discrepancy && <span className="text-[12px] text-muted">no discrepancy recorded</span>}
            </>
          ) : (
            <span className="text-[13px] text-muted">No identity record for this attempt.</span>
          )}
        </div>
        {supplierIdentity?.identity_discrepancy && (
          <>
            <div className="mt-1.5 text-[13px] text-ink-2">
              Entered <span className="font-semibold text-ink">“{supplierIdentity.identity_discrepancy.entered_name}”</span> →
              resolved <span className="font-semibold text-ink">“{supplierIdentity.identity_discrepancy.resolved_name}”</span>
              {supplierIdentity.identity_discrepancy.resolved_domain ? <span className="text-muted"> ({supplierIdentity.identity_discrepancy.resolved_domain})</span> : null}
            </div>
            <div className="mt-1 text-[12px] text-muted">Client copy: {supplierIdentity.identity_discrepancy.client_note}</div>
          </>
        )}
      </div>
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

        {/* §1.2 CUT: the "why this confidence" paragraph and the four "why not" rejection
            sentences — arithmetic narration nobody reads; the header's direction line carries
            the decision provenance, and the full derivation stays in Engine Trace. */}
      </Section>

      {/* §3/§4 — CONTRADICTIONS, full anatomy: they decide verdicts and their substance is
          certified for SHAPE only — the substance is the operator's call. (§1.2 CUT: the
          hypotheses and doubt-calibration panels — M7 doubt is structurally locked out of the
          verdict and its focus already rides the M9 headline; the refuter/leader machinery is
          advisory internals nobody acts on at review time.) */}
      <Section eyebrow="Certified for shape — the substance is your call" title={`Contradictions${ct.contradictions.length ? ` (${ct.contradictions.length})` : ""}`}>
        {ct.contradictions.length === 0 ? (
          <p className="text-[13px] text-muted">None detected.</p>
        ) : (
          <div className="space-y-3">
            {ct.contradictions.map((c, i) => (
              <div key={i} className="rounded-lg border border-line bg-base">
                <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
                  <span className="font-mono text-[12px] font-semibold text-ink">#{i + 1}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.risk_level === "critical" ? "bg-deny-bg text-deny-ink" : c.risk_level === "high" ? "bg-verify-bg text-verify-ink" : "bg-conditional-bg text-conditional-ink"}`}>{c.risk_level}</span>
                  {c.is_load_bearing && <span className="rounded-full bg-deny-bg px-2 py-0.5 text-[11px] font-semibold text-deny-ink">load-bearing</span>}
                  {"contradiction_type" in c && c.contradiction_type ? <span className="text-[12px] text-muted">{String(c.contradiction_type).replace(/_/g, " ")}</span> : null}
                </div>
                <div className="grid gap-2 px-3 py-2.5 sm:grid-cols-[1fr_auto_1fr]">
                  <div className="text-[13px] leading-relaxed text-ink-2">
                    {c.assertion_a?.statement ?? "—"}
                    <div className="mt-0.5 font-mono text-[11px] text-muted">{c.assertion_a?.track_key} · {(c.assertion_a?.evidence_ids ?? []).join(", ")}</div>
                  </div>
                  <div className="self-center text-center font-mono text-[10px] font-semibold text-muted">VS</div>
                  <div className="text-[13px] leading-relaxed text-ink-2">
                    {c.assertion_b?.statement ?? "—"}
                    <div className="mt-0.5 font-mono text-[11px] text-muted">{c.assertion_b?.track_key} · {(c.assertion_b?.evidence_ids ?? []).join(", ")}</div>
                  </div>
                </div>
                {"interpretation" in c && c.interpretation ? (
                  <div className="border-t border-dashed border-line px-3 py-2 text-[12.5px] text-muted">{String(c.interpretation)}</div>
                ) : null}
              </div>
            ))}
            <p className="text-[12px] text-muted">Do the two sides genuinely conflict, and does the case turn on it? Open each side&rsquo;s evidence in the areas below before agreeing.</p>
          </div>
        )}
      </Section>

      {/* ── THE FIVE ASSESSMENT AREAS — the unit of content (§4). Per area, one question: does
          the evidence support the narrative the client will read? The area's primary text is
          THE CLIENT'S TEXT (same pure projection + cleanup the portal uses); evidence sits
          directly beneath (the checking tool); analyst context is clearly subordinate. */}
      <Section eyebrow="Per area: the client's text, the evidence beneath it" title="The Five Assessment Areas">
        <div className="space-y-3">
          {areas.map((a) => {
            const sm = a.signal ? SIGNAL_META[a.signal as TrackSignal] : SIGNAL_META.n_a;
            return (
              <div key={a.track_key} className="rounded-lg border border-line bg-base p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[14px] font-semibold text-ink">{a.areaName}</span>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${a.clientCertainty === "verified" ? "bg-clear-bg text-clear-ink" : "bg-conditional-bg text-conditional-ink"}`} title="The client's two-value chip">
                      client: {a.clientCertainty === "verified" ? "Verified" : "Assessed"}
                    </span>
                    {a.score != null && <span className="font-mono text-[11px] text-muted">{a.score}/15</span>}
                    <span className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold ${sm.cls}`}>{sm.label}</span>
                  </div>
                </div>

                {/* §6 — "not assessed" is first-class, and a plan-excluded area is a LIMITATION,
                    never a risk. These states must not look like findings or like each other. */}
                {a.cause !== "assessed" && a.cause !== "non_voting" && (
                  <p className="mt-2 rounded-md bg-subtle px-3 py-2 text-[13px] text-ink-2">
                    {a.cause === "plan_excluded" && "Not part of this plan — a limitation of scope, not a risk."}
                    {a.cause === "nothing_to_review" && "Nothing to review — no documents were provided. An absence, not a finding."}
                    {a.cause === "not_implemented" && "This dimension is not built yet — deliberate absence, excluded from the verdict."}
                    {(a.cause === "acquisition_failed" || a.cause === "llm_failed") && (
                      <span className="font-semibold text-deny-ink">This paid-for area failed to score — it is why the case escalated.</span>
                    )}
                  </p>
                )}

                {a.clientText && (
                  <div className="mt-2 rounded-md border border-brand/25 bg-surface p-3">
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-brand">Client text — what they read</div>
                    {/* §2 parity: the SAME presenter the client page uses (headings + lists). */}
                    <FindingBody text={a.clientText} />
                    {a.boundaryNotes.map((n) => (
                      <div key={n.label} className="mt-2">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{n.label}</div>
                        <div className="text-[12px] text-muted">{n.text}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* INTERNAL — the evidence beneath the narrative: statement · category · internal
                    certainty (three-value) · source. The source link is the real leverage: no
                    stored rationale exists for source→category — the link is how you check it. */}
                {a.evidence.length > 0 && (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-[12.5px]">
                      <thead>
                        <tr className="text-left text-[10.5px] uppercase tracking-wide text-muted">
                          <th className="py-1 pr-3 font-semibold">Evidence</th>
                          <th className="py-1 pr-3 font-semibold">Category (code-scored)</th>
                          <th className="py-1 pr-3 font-semibold">Certainty</th>
                          <th className="py-1 font-semibold">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {a.evidence.map((e, i) => (
                          <tr key={i} className="border-t border-line align-top">
                            <td className="max-w-[340px] py-1.5 pr-3 text-ink-2">{e.statement}</td>
                            <td className="py-1.5 pr-3 font-mono text-[11px] text-ink-2">
                              {e.weight_key ?? "—"}
                              {e.points != null && <span className={e.points < 0 ? "text-deny-ink" : "text-clear-ink"}> {e.points > 0 ? `+${e.points}` : e.points}</span>}
                            </td>
                            <td className="py-1.5 pr-3 font-mono text-[11px] text-muted">{e.certainty}</td>
                            <td className="py-1.5 font-mono text-[11px]">
                              {e.source_url ? <a href={e.source_url} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">open ↗</a> : <span className="text-muted">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {a.rejected.length > 0 && (
                  <div className="mt-2 rounded-md bg-subtle px-3 py-2 text-[12px] text-muted">
                    <span className="font-semibold text-ink-2">Refused by the firewall ({a.rejected.length}):</span>{" "}
                    {a.rejected.map((rj, i) => (
                      <span key={i} className="font-mono text-[11px]">
                        {i > 0 && " · "}
                        {rj.proposed ?? "?"} <span className="font-sans">— gate {rj.gate ?? "?"}{rj.reason ? ` (${rj.reason})` : ""}</span>
                      </span>
                    ))}
                  </div>
                )}

                {a.reasoningNotes && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[12px] font-semibold text-muted hover:text-ink-2">Analyst context (internal memo — never client-facing)</summary>
                    <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-muted">{a.reasoningNotes}</p>
                  </details>
                )}
                {/* Track 5 (sub-gate B, OQ-B1a) — the non-voting arbitration block: ADMIN-ONLY
                    (stripped from the delivered client payload per the OQ-D rule). */}
                {a.sourcing && (
                  <div className="mt-2 rounded-md border border-line bg-raised p-2.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Sourcing Logic — arbitration (non-voting)
                    </div>
                    {a.sourcing.flags.length > 0 ? (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {a.sourcing.flags.map((f) => (
                          <span key={f} className="rounded-full border border-line bg-base px-2 py-0.5 text-[11px] font-medium text-ink-2">
                            {f.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-[12px] text-muted">No scenario flags.</p>
                    )}
                    <p className="mt-1.5 text-[12px] text-ink-2">
                      <span className="font-semibold capitalize">{a.sourcing.scenario_coherence.assessment.replace(/_/g, " ")}</span>
                      <span className="text-muted"> — {a.sourcing.scenario_coherence.basis}</span>
                    </p>
                    {a.sourcing.contradictions.length > 0 && (
                      <ul className="mt-1.5 space-y-1.5">
                        {a.sourcing.contradictions.map((c, i) => (
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
                {/* §6 — "could not confirm" is a destination, never an absence. */}
                {a.unknowns.length > 0 && (
                  <div className="mt-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-verify-ink">Could not confirm</div>
                    <ul className="mt-1 space-y-1">
                      {a.unknowns.map((u, i) => (
                        <li key={i} className="text-[13px] text-ink-2">• {u.unknown}{u.resolvable_by_client ? <span className="text-muted"> — client-resolvable</span> : null}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* §1.2 CUT — the Coverage & Gaps section (stat tiles, missing-evidence lists): counts
          nobody acts on at review time. The per-area view IS the coverage; unknowns render
          inside each area as "Could not confirm". */}

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
        {/* §6 — the SLA clock keeps running through a hold: show it where the decision is made. */}
        {slaHours != null && (
          <p className={`mb-3 font-mono text-[12.5px] font-semibold ${slaHours <= 0 ? "text-deny-ink" : slaHours <= 6 ? "text-verify-ink" : "text-ink-2"}`}>
            SLA: {slaHours <= 0 ? "overdue" : `${slaHours}h left`} — the clock keeps running through a hold.
          </p>
        )}
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
            {/* CLOSE-OUT item 7 (2026-08-11): never render an action the API will 403 —
                publish/override need review_publish; investigation needs rerun (the same split
                the review route enforces). Visible-but-refusing is the forbidden pattern. */}
            {mode === "idle" && (
              <div className="flex flex-wrap gap-2">
                {canPublish && (
                  <>
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
                  </>
                )}
                {canRerun && (
                  <button
                    type="button"
                    onClick={() => { setMode("investigate"); setError(null); }}
                    className="rounded-lg border border-line bg-base px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-subtle"
                  >
                    Request further investigation
                  </button>
                )}
                {!canPublish && !canRerun && (
                  <p className="text-[13px] text-muted">Your role can review this case but not act on it — publishing needs the publish-reports permission; investigation needs the re-run permission.</p>
                )}
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
        {/* ── "SHOW + FIX" piece 1: the blocked-publish worklist. Before this, a block showed the
            gate's label and nothing else — no sentence, no field — so the only ways forward were a
            deploy or a full case re-run. Every hit below names where it lives and what to write. ── */}
        {blocked && (
          <div className="mt-3 rounded-card border border-deny-ink bg-deny-bg p-4">
            <p className="text-[13px] font-semibold text-deny-ink">
              Delivery blocked — {blocked.findings.length || blocked.violations.length}{" "}
              {(blocked.findings.length || blocked.violations.length) === 1 ? "phrase" : "phrases"} cannot ship to a client.
            </p>
            <p className="mt-1 text-[12px] text-muted">
              Nothing has been delivered and nothing was changed. Fix the wording at the source, then publish again.
            </p>
            <ul className="mt-3 space-y-3">
              {blocked.findings.map((f, i) => (
                <li key={`${f.where}-${i}`} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{f.where}</p>
                  <p className="mt-1 text-[13px] text-ink">“{f.sentence}”</p>
                  <p className="mt-1 text-[12px] text-muted">
                    <span className="font-semibold text-deny-ink">{f.label}</span> — {f.fix}
                  </p>
                </li>
              ))}
            </ul>
            {/* A label with no located sentence comes from the derivation-rule scanner, which reads
                fields this walk does not — surfaced rather than silently dropped. */}
            {blocked.violations.filter((v) => !blocked.findings.some((f) => f.label === v)).length > 0 && (
              <p className="mt-3 border-t border-line pt-3 text-[12px] text-muted">
                Also flagged, without a located sentence:{" "}
                {blocked.violations.filter((v) => !blocked.findings.some((f) => f.label === v)).join(", ")}
              </p>
            )}
          </div>
        )}
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
      </>
      )}
    </div>
  );
}
