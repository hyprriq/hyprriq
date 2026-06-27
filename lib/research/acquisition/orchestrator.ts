import type { TrackKey } from "@/lib/constants/tracks";
import type {
  AcquisitionPlugin, AcquisitionMetric, EvidencePack, RawSource, ResearchQuestion,
} from "./types";

export interface GatherRequest {
  case_id: string;
  track_key: TrackKey;
  requests: { question: ResearchQuestion; input: string }[];
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
    const sources: RawSource[] = [];
    const metricsByPlugin = new Map<string, AcquisitionMetric>();

    for (const r of req.requests) {
      const plugin = this.pluginFor(r.question);
      if (!plugin) continue; // no capable plugin → skip (track records the gap as an unknown)
      const start = Date.now();
      let got: RawSource[] = [];
      try {
        got = await plugin.acquire({ question: r.question, input: r.input, case_id: req.case_id, track_key: req.track_key });
      } catch {
        got = []; // isolate the failure
      }
      sources.push(...got);
      const m = metricsByPlugin.get(plugin.id) ?? {
        plugin_id: plugin.id, latency_ms: 0, api_cost_usd: 0, evidence_items_returned: 0,
      };
      m.latency_ms += Date.now() - start;
      m.evidence_items_returned += got.length;
      metricsByPlugin.set(plugin.id, m);
    }

    return {
      pack: { case_id: req.case_id, track_key: req.track_key, sources, collected_at: new Date().toISOString() },
      metrics: [...metricsByPlugin.values()],
    };
  }
}
