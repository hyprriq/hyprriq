// Provider-agnostic model adapter — the ONLY path to a model. Business logic never
// imports a vendor SDK; model choice is config, not code (enhancement #4).
export type ModelTask = "track" | "synthesis";

export interface RunModelInput {
  task: ModelTask;
  system: string;
  user: string;
  schema?: object;       // structured-output JSON schema
  temperature?: number;  // default 0 (determinism)
}
export interface RunModelResult {
  json: unknown;
  model_provider: string;
  model_version: string;
  tokens: number;
  cost_usd: number;
  latency_ms: number;
}

// Config-driven routing. DEV/TEST: Sonnet 4.6 for ALL tasks (incl. synthesis). Synthesis
// flips to claude-opus-4-8 before go-live by editing THIS map only — no code change.
const MODEL_CONFIG: Record<ModelTask, { provider: string; model: string }> = {
  track: { provider: "anthropic", model: "claude-sonnet-4-6" },
  synthesis: { provider: "anthropic", model: "claude-sonnet-4-6" }, // → "claude-opus-4-8" before go-live
};

export async function runModel(input: RunModelInput): Promise<RunModelResult> {
  const cfg = MODEL_CONFIG[input.task];
  if (cfg.provider === "anthropic") {
    const { runAnthropic } = await import("@/lib/ai/providers/anthropic");
    return runAnthropic({ ...input, model: cfg.model });
  }
  throw new Error(`Unknown model provider: ${cfg.provider}`);
}
