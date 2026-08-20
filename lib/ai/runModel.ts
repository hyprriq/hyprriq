// Provider-agnostic model adapter — the ONLY path to a model. Business logic never
// imports a vendor SDK; model choice is config, not code (enhancement #4).
export type ModelTask = "track" | "synthesis" | "repair";

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
  // H7 (OQ-C) — true when a provided schema was rejected by the model and the call fell back to
  // the schema-less request + tolerant parsing (observability; behavior is fail-open by ruling).
  schema_fallback?: boolean;
}

// Config-driven routing. DEV/TEST: Sonnet 4.6 for ALL tasks (incl. synthesis). Synthesis
// flips to claude-opus-4-8 before go-live by editing THIS map only — no code change.
const MODEL_CONFIG: Record<ModelTask, { provider: string; model: string }> = {
  track: { provider: "anthropic", model: "claude-sonnet-4-6" },
  synthesis: { provider: "anthropic", model: "claude-sonnet-4-6" }, // → "claude-opus-4-8" before go-live
  // Prose repair (lib/research/proseRepair.ts): one small rewrite call, only when the gate's
  // scanners flag generated prose. Deliberately the track model — it needs style, not reasoning.
  repair: { provider: "anthropic", model: "claude-sonnet-4-6" },
};

// S-2 (a), founder-ruled 2026-07-17 — the ONE readable source of the model routing: ios_version
// assembly (pipeline.steps) and the price table (providers/anthropic) derive from HERE, so a
// config flip can never leave a stale model string in the determinism-versioning layer or a
// misreported cost. Read-only accessor; the config stays private and editable in one place.
export function modelFor(task: ModelTask): { provider: string; model: string } {
  return MODEL_CONFIG[task];
}

export async function runModel(input: RunModelInput): Promise<RunModelResult> {
  const cfg = MODEL_CONFIG[input.task];
  if (cfg.provider === "anthropic") {
    const { runAnthropic } = await import("@/lib/ai/providers/anthropic");
    return runAnthropic({ ...input, model: cfg.model });
  }
  throw new Error(`Unknown model provider: ${cfg.provider}`);
}
