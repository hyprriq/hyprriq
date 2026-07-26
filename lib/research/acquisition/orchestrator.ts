import type {
  AcquisitionPlugin, AcquisitionMetric, AcquisitionResult, AcquisitionTrackKey, EvidencePack, RawSource, ResearchQuestion,
} from "./types";
import { finalizePack } from "./pack";
import { worseStatus } from "./retry";

export interface GatherRequest {
  case_id: string;
  track_key: AcquisitionTrackKey;      // DECISION B — additive widen, never a cast
  requests: { question: ResearchQuestion; input: string }[];
  classification?: import("@/lib/research/source_profile").ClassifyContext; // official-domain metadata (Track 2+)
}

// Routes ResearchQuestions to capable plugins (the capability matrix), aggregates a single
// EvidencePack, and records per-plugin acquisition metrics. A plugin failure is isolated — the
// pack is still built from everything that succeeded (graceful degradation).
export class Orchestrator {
  constructor(private readonly plugins: AcquisitionPlugin[]) {}

  private pluginFor(q: ResearchQuestion): AcquisitionPlugin | null {
    return this.plugins.find((p) => p.capabilities.includes(q)) ?? null;
  }

  async gather(req: GatherRequest): Promise<{ pack: EvidencePack; metrics: AcquisitionMetric[] }> {
    // Acquire CONCURRENTLY. Track 1 fires ~6 acquisition calls; awaiting them sequentially pushed the
    // background pipeline past Vercel's 60s function cap (killed mid-run). The pack hash is
    // order-independent (finalizePack sorts deterministically), so concurrency is contract-safe.
    const acquired = await Promise.all(
      req.requests.map(async (r) => {
        const plugin = this.pluginFor(r.question);
        if (!plugin) return null; // no capable plugin → skip (track records the gap as an unknown)
        const start = Date.now();
        let result: AcquisitionResult;
        try {
          result = await plugin.acquire({ question: r.question, input: r.input, case_id: req.case_id, track_key: req.track_key, classification: req.classification });
        } catch {
          result = { sources: [], retry_count: 0, final_status: "network_error", cost_usd: 0 }; // isolate the failure
        }
        return { plugin, result, latency_ms: Date.now() - start };
      }),
    );

    // Aggregate after settling (no shared-state race): sources + per-plugin metrics.
    const sources: RawSource[] = [];
    const metricsByPlugin = new Map<string, AcquisitionMetric>();
    for (const a of acquired) {
      if (!a) continue;
      const { plugin, result, latency_ms } = a;
      sources.push(...result.sources);
      const m = metricsByPlugin.get(plugin.id) ?? {
        plugin_id: plugin.id, latency_ms: 0, api_cost_usd: 0, evidence_items_returned: 0,
        retry_count: 0, final_status: "ok" as const,
      };
      m.latency_ms += latency_ms;
      m.evidence_items_returned += result.sources.length;
      m.api_cost_usd += result.cost_usd;
      m.retry_count += result.retry_count;
      m.final_status = worseStatus(m.final_status, result.final_status);
      metricsByPlugin.set(plugin.id, m);
    }

    return {
      pack: finalizePack(req.case_id, req.track_key, sources, new Date().toISOString()),
      metrics: [...metricsByPlugin.values()],
    };
  }
}
