import type { TrackContext } from "@/lib/research/contracts";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { upsertTrackResult } from "@/lib/data/track-results";
import { runTrack6, type Track6Deps, type CategoryTrackOutput } from "@/lib/research/track6";
import { runModel } from "@/lib/ai/runModel";

// ── Track 6 WIRING (2026-07-23, post-core-freeze) — THE OWN-STEP DISPATCH, per the orchestration-
// fork ruling: the registry is itself a synthesis input (deriveDimensionRunRecord maps it;
// DIMENSION_TOKENS consumes the TrackKey union), so category compliance lives OUTSIDE it — this
// step is plan-gated HERE (the Track-0.5 precedent) and the frozen core never learns it exists.
//
// FAIL-LOUD-NON-FATAL END TO END (H2 OQ-2 pattern): an advisory assessment must never kill or
// delay the vendor case. Every failure — model, gather, the un-run migration's CHECK rejecting
// the persist — is audit-logged and contained; the pipeline continues.
//
// DEGRADED-HONEST LAUNCH MODE: the live gather adapter awaits the STOP-1 ruling (the
// ResearchQuestion union / acquisition track_key typing fork). Until it lands, the default
// gather returns ZERO sources with the pending state audited on the record — the brand-keyed
// electronics row still fires (it needs no research), and everything else is could_not_determine,
// stated as absence of research, never clearance. ──

// PROPOSED admin-side literal (client-copy bar: exact client strings are ruled at the
// client-surface gate). Condition 3: never the word "verdict" on a client surface.
export const CATEGORY_CLIENT_SUMMARY =
  "Category compliance assessment recorded. Details are reviewed with your report.";

// The plans that run category compliance. single_149 joins WHEN THE TIER EXISTS (no PlanType is
// created before then — founder-ruled); the gate widens here, in the step, never in the registry.
const CATEGORY_PLANS = new Set<string>(["scale_499"]);

// The STOP-1 pending gather — replaced by the live acquisition adapter once the founder rules the
// ResearchQuestion reuse-vs-widen fork. Zero sources, honestly labeled.
const pendingGather: Track6Deps["gather"] = async () => ({ pack: { sources: [] }, metrics: [] });

// Live Hop-1 model adapter (mechanical — no frozen touches): proposes categories per brand from
// the gathered sources, with the table's non-brand-keyed rows as the CATEGORY-DEFINITION AID.
const liveModel: Track6Deps["model"] = async ({ brands, sources, tableAid }) => {
  const system = [
    "You are a product-category research analyst. From the provided web sources, identify which",
    "Amazon product categories each brand OBSERVABLY sells in. Propose categories ONLY where a",
    "source supports them (cite source ids). For each category, if it clearly belongs to one of",
    "the provided subcategory definitions, name that subcategory EXACTLY as given; otherwise null.",
    "Never state gating, restriction, eligibility, or approval status — findings are category",
    "names and evidence only. Output JSON only.",
  ].join(" ");
  const user = JSON.stringify({
    brands,
    subcategory_definitions: tableAid,
    sources,
    output_shape: {
      per_brand: [{
        brand: "string (one of brands, verbatim)",
        categories_found: [{ category: "string", evidence_ids: ["src_N"], confidence: "high|medium|low", subcategory: "exact subcategory name or null" }],
        brand_category_note: "string or null",
      }],
    },
  });
  const r = await runModel({ task: "track", system, user });
  return { json: r.json, cost_usd: r.cost_usd };
};

async function auditDrop(caseId: string, attempt: number, reason: string): Promise<void> {
  await supabaseAdmin.from("audit_log").insert({
    table_name: "case_track_results", record_id: caseId, action: "UPDATE",
    actor_id: "system", actor_type: "system",
    new_value: { category_compliance_dropped: true, attempt, reason },
  });
}

export interface CategoryStepResult { ran: boolean; persisted: boolean; reason?: string; cost_usd: number }

export async function stageCategoryCompliance(
  ctx: TrackContext,
  deps?: Partial<Track6Deps>,
): Promise<CategoryStepResult> {
  // The plan gate lives IN THE STEP (the fork ruling) — lower plans never research, never persist.
  if (!CATEGORY_PLANS.has(ctx.plan_type ?? "")) {
    return { ran: false, persisted: false, reason: "plan_excluded", cost_usd: 0 };
  }

  const attempt = ctx.attempt_number ?? 1;
  const gatherPending = !deps?.gather;
  let out: CategoryTrackOutput;
  try {
    out = await runTrack6(ctx, { gather: deps?.gather ?? pendingGather, model: deps?.model ?? liveModel });
    if (gatherPending) {
      out.category_compliance.audits.push({
        field: "gather",
        reason: "live gather adapter pending the STOP-1 founder ruling (ResearchQuestion union) — research not attempted this run; brand-keyed flags unaffected",
      });
    }
  } catch (e) {
    // Contained: the advisory track can never kill the vendor case.
    const reason = `track_6 run failed (non-fatal, advisory): ${e instanceof Error ? e.message : String(e)}`;
    console.error(`[category] ${reason}`);
    await auditDrop(ctx.case_id, attempt, reason);
    return { ran: true, persisted: false, reason, cost_usd: 0 };
  }

  const res = await upsertTrackResult({
    case_id: ctx.case_id, track: "track_6", track_key: "category_compliance", track_number: 6,
    attempt_number: attempt, source_mode: "ai_generated",
    evidence_items: [], reasoning_notes: out.reasoning_notes, unknowns: [],
    track_verdict_signal: "n_a", finding_certainty: "unknown",
    manual_review_required: false, founder_review_status: "approved",
    compiled_findings_json: {
      // The summary survives the client allowlist strip — neutral constant, write-side (the
      // Track 5 OQ-D lesson applied at write time; Condition 3: never the word "verdict").
      signal: "n_a", non_voting: true, summary: CATEGORY_CLIENT_SUMMARY,
      // The assessment rides ADMIN-ONLY until the client-surface gate allowlists a projection.
      category_compliance: out.category_compliance,
    },
  });
  if (res.error) {
    // The un-run migration's CHECK rejects the new track values — loud, audited, never fatal.
    const reason = `track_6 row persist failed (non-fatal until the founder-run migration lands): ${res.error}`;
    console.error(`[category] ${reason}`);
    await auditDrop(ctx.case_id, attempt, reason);
    return { ran: true, persisted: false, reason, cost_usd: out.cost_usd };
  }
  return { ran: true, persisted: true, cost_usd: out.cost_usd };
}
