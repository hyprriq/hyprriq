import type { RunModelInput, RunModelResult } from "@/lib/ai/runModel";

export interface AnthropicInput extends RunModelInput { model: string }

// Anthropic provider behind runModel(). Phase 5: real Messages API call
// (web_search_20250305 tool, structured JSON output, temperature 0).
// Stage-1 scaffold: not implemented — ANTHROPIC_API_KEY is not wired until Phase 5.
export function runAnthropic(input: AnthropicInput): Promise<RunModelResult> {
  return Promise.reject(
    new Error(`runAnthropic not implemented until Phase 5 (task=${input.task}, model=${input.model})`),
  );
}
