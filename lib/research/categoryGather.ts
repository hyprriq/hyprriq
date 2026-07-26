import type { TrackContext } from "@/lib/research/contracts";
import type { ResearchQuestion, EvidencePack, AcquisitionMetric } from "@/lib/research/acquisition/types";
import { Orchestrator } from "@/lib/research/acquisition/orchestrator";
import { serperPlugin } from "@/lib/research/acquisition/plugins/serper";
import { nativeWebSearchPlugin } from "@/lib/research/acquisition/plugins/nativeWebSearch";
import { persistEvidencePack } from "@/lib/data/acquisition";

// ── Track 6 — DECISION A (founder-ruled 2026-07-24): the LIVE category gather, REUSING the
// `marketplace_signals` question. The ruling's basis, verified from source and on the record:
// the question label is ROUTING-ONLY — plugins search `input` and the label is never persisted
// (pack/provenance/metrics all carry no question), so reuse stores nothing misleading and the
// frozen ResearchQuestion union stays untouched. The pack keys under track_key
// "category_compliance" (DECISION B's additive widen) so the replay/audit record is honest about
// whose research this is. Hop 1 only: these queries DISCOVER what a brand sells — they never ask
// gating/eligibility questions (the honesty law starts at acquisition). ──

const CATEGORY_QUESTION: ResearchQuestion = "marketplace_signals";

// ~2 queries per brand (the costed figure): the brand's own catalogue language, then marketplace
// category placement. Discovery-shaped only.
export function buildCategoryRequests(brands: string[]): { question: ResearchQuestion; input: string }[] {
  return brands.flatMap((brand) => [
    { question: CATEGORY_QUESTION, input: `${brand} products catalog what does ${brand} sell` },
    { question: CATEGORY_QUESTION, input: `${brand} amazon product categories` },
  ]);
}

// The Track6Deps.gather implementation (replaces the STOP-1 pendingGather stub).
// H2 — the pack is the frozen input-of-record: persist failure THROWS; stageCategoryCompliance
// contains it non-fatally (audited drop, the vendor case continues).
export async function liveCategoryGather(
  ctx: TrackContext,
): Promise<{ pack: EvidencePack; metrics: AcquisitionMetric[] }> {
  const orchestrator = new Orchestrator([serperPlugin, nativeWebSearchPlugin]);
  const { pack, metrics } = await orchestrator.gather({
    case_id: ctx.case_id,
    track_key: "category_compliance",
    requests: buildCategoryRequests(ctx.brands_submitted ?? []),
  });
  const res = await persistEvidencePack(pack, ctx.attempt_number ?? 1);
  if (res.error) throw new Error(`category evidence pack persist failed: ${res.error}`);
  return { pack, metrics };
}
