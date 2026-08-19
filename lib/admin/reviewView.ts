import type { TrackResultRow } from "@/lib/data/track-results";
import type { EvidenceItem, Unknown, SourcingLogicOutput, WeightValidation, QuestionToAsk } from "@/lib/research/contracts";
import type { Finding } from "@/lib/data/cases";
import { cleanClientProse, cleanClientProseDeep, cleanClientFindingJson, projectFindingJsonForClient, type ClientProjectionOptions } from "@/lib/portal/clientReport";
import { narrativeFrom, boundaryNotesFrom } from "@/lib/portal/finding-view";
import { deriveClientCertainty } from "@/lib/portal/certainty";

// ── ADMIN CASE REVIEW (build brief 2026-08-13) — the PURE assembly for the rebuilt operator
// screen. Reads the raw track rows the page already fetches; computes nothing the engine owns.
// The organising principle: per assessment area, the operator reads THE CLIENT'S text (projected
// through the same pure pipeline the client path uses), with the evidence beneath it and analyst
// context subordinate. Internal detail (tags, categories, gates) is the operator's leverage and
// stays raw here — the client cleaner runs ONLY on the client-text field. ──

export const AREA_NAMES: Record<string, string> = {
  supplier_identity: "Supplier Legitimacy",
  supply_chain_relationship: "Supply-Chain Relationship",
  brand_risk_assessment: "Brand Risk",
  documentation_review: "Documentation Review",
  sourcing_logic: "Sourcing Logic",
};

export type AreaCause = "assessed" | "plan_excluded" | "nothing_to_review" | "non_voting" | "acquisition_failed" | "llm_failed" | "not_implemented";

export interface EvidenceRow {
  statement: string;
  weight_key: string | null;
  points: number | null;
  certainty: string; // INTERNAL three-value vocabulary (verified/inferred/unknown)
  source_url: string | null;
}

export interface RejectedRow { proposed: string | null; gate: string | null; reason: string | null }

export interface AreaView {
  track_key: string;
  areaName: string;
  clientText: string;            // exactly what the client reads (projected + cleaned)
  clientCertainty: "verified" | "assessed"; // the client's two-value chip
  boundaryNotes: { label: string; text: string }[];
  signal: string | null;
  score: number | null;
  cause: AreaCause;
  evidence: EvidenceRow[];
  rejected: RejectedRow[];
  reasoningNotes: string | null; // analyst context — subordinate, internal
  sourcing: SourcingLogicOutput | null;
  unknowns: Unknown[];
}

const causeOf = (cf: Record<string, unknown> | null): AreaCause => {
  if (!cf) return "assessed";
  if (cf.not_implemented) return "not_implemented";
  if (cf.nothing_to_review) return "nothing_to_review";
  if (cf.non_voting) return "non_voting";
  if (cf.acquisition_failed) return "acquisition_failed";
  if (cf.llm_failed) return "llm_failed";
  return "assessed";
};

export function buildAreaViews(rows: TrackResultRow[]): AreaView[] {
  return rows
    .filter((r) => r.track_number >= 1)
    .sort((a, b) => a.track_number - b.track_number)
    .map((r) => {
      const cf = (r.compiled_findings_json ?? null) as Record<string, unknown> | null;
      // THE CLIENT'S TEXT — same pure pipeline as the portal (projection → prose cleanup).
      const projected = cf ? projectFindingJsonForClient(cf, r.track_key) : null;
      const rawNarrative = narrativeFrom(projected) || (typeof projected?.summary === "string" ? (projected.summary as string) : "");
      const points = new Map((r.evidence_weights_applied ?? []).map((w) => [w.evidence_type, w.points]));
      const wv = (r.weight_validation ?? []) as WeightValidation[];
      return {
        track_key: r.track_key,
        areaName: AREA_NAMES[r.track_key] ?? r.track_key,
        clientText: cleanClientProse(rawNarrative),
        clientCertainty: deriveClientCertainty(r.evidence_items),
        boundaryNotes: boundaryNotesFrom(projected),
        signal: r.track_verdict_signal,
        score: r.confidence_score,
        cause: causeOf(cf),
        evidence: (r.evidence_items ?? []).map((e: EvidenceItem) => ({
          statement: e.statement,
          weight_key: e.weight_key ?? null,
          points: e.weight_key != null ? points.get(e.weight_key) ?? null : null,
          certainty: e.certainty,
          source_url: e.source_url ?? null,
        })),
        rejected: wv
          .filter((v) => v.validated_weight_key === null)
          .map((v) => ({ proposed: v.proposed_weight_key ?? null, gate: v.gate ?? null, reason: v.rejection_reason ?? null })),
        reasoningNotes: r.reasoning_notes,
        sourcing: r.track_key === "sourcing_logic" ? ((cf?.sourcing_logic as SourcingLogicOutput | undefined) ?? null) : null,
        unknowns: r.unknowns ?? [],
      };
    });
}

// The client-view findings — the SAME projection chain the portal's getCaseFindings runs
// (projectFindingJsonForClient → cleanClientProseDeep → deriveClientCertainty), assembled from
// the rows the review page already fetched. CAVEAT (honest, by design): the page's rows are the
// LATEST attempt; a delivered case with a pending re-investigation shows the newest research
// here while the client still sees the delivered attempt.
//
// ⚠ THE CHECKPOINT ESCAPE DEFAULTS TO OFF, AND THAT DEFAULT IS THE SAFETY PROPERTY. This function
// has TWO callers with opposite needs: the operator's review page must render a leaky case so the
// leak can be SEEN and fixed (a gate that hides what it is complaining about is useless), while
// lib/pdf/renderReportPdf.ts produces a client DELIVERABLE and must refuse. Defaulting to refuse
// means a future third caller inherits the safe behaviour by construction and has to ask, in code,
// to opt out of it.
export function buildClientFindings(rows: TrackResultRow[], opts?: ClientProjectionOptions): Finding[] {
  return rows
    .filter((r) => r.track_number >= 1)
    .sort((a, b) => a.track_number - b.track_number)
    .map((r) => {
      const cf = (r.compiled_findings_json ?? null) as Record<string, unknown> | null;
      return {
        id: r.id,
        track: r.track,
        track_key: r.track_key,
        finding_certainty: deriveClientCertainty(r.evidence_items),
        compiled_findings_json: cf ? cleanClientFindingJson(projectFindingJsonForClient(cf, r.track_key), r.track_key, opts) : null,
        questions_to_ask: cleanClientProseDeep((r.questions_to_ask ?? null) as QuestionToAsk[] | null),
      };
    });
}

// Last decision on file — the review route writes JSON.stringify({action, reason, notes,
// reviewed_by, at}) to cases.internal_notes (OVERWRITING the prior one — flagged in the report,
// not fixable here). Parse defensively: pre-JSON legacy notes render as plain text.
export interface LastDecision { action: string | null; reason: string | null; reviewed_by: string | null; at: string | null; raw: string | null }

export function parseLastDecision(internalNotes: string | null): LastDecision | null {
  if (!internalNotes || !internalNotes.trim()) return null;
  try {
    const d = JSON.parse(internalNotes) as Record<string, unknown>;
    if (typeof d !== "object" || d === null) throw new Error("not an object");
    return {
      action: typeof d.action === "string" ? d.action : null,
      reason: typeof d.reason === "string" ? d.reason : null,
      reviewed_by: typeof d.reviewed_by === "string" ? d.reviewed_by : null,
      at: typeof d.at === "string" ? d.at : null,
      raw: null,
    };
  } catch {
    return { action: null, reason: null, reviewed_by: null, at: null, raw: internalNotes };
  }
}

export function slaHoursLeft(slaDeadline: string | null): number | null {
  if (!slaDeadline) return null;
  return Math.ceil((new Date(slaDeadline).getTime() - Date.now()) / 3_600_000);
}

// The pipeline's escalation reason (manual_override_required): failed paid areas + unconfirmed
// identity — stated specifically, never a bare banner.
export function escalationReason(
  statuses: Record<string, string | null> | null,
  identityConfidence: string | null,
): string | null {
  const failed = Object.entries(statuses ?? {})
    .filter(([k, v]) => k.startsWith("track_") && v === "manual_required")
    .map(([k]) => {
      const n = Number(k.replace(/\D/g, ""));
      const key = ["", "supplier_identity", "supply_chain_relationship", "brand_risk_assessment", "documentation_review", "sourcing_logic"][n];
      return AREA_NAMES[key] ?? k;
    });
  const parts: string[] = [];
  if (failed.length > 0) parts.push(`${failed.join(" and ")} could not be scored (a paid-for area failed)`);
  if (identityConfidence && identityConfidence !== "high") parts.push(`supplier identity resolution is ${identityConfidence}`);
  return parts.length > 0 ? parts.join("; ") : null;
}
