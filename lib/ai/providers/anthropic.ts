import Anthropic from "@anthropic-ai/sdk";
import type { RunModelInput, RunModelResult } from "@/lib/ai/runModel";

export interface AnthropicInput extends RunModelInput { model: string; enableWebSearch?: boolean }

// Rough Sonnet 4.6 pricing (USD per token) — for cost observability only, not billing.
const PRICE_IN = 3 / 1_000_000;
const PRICE_OUT = 15 / 1_000_000;

function extractText(content: { type: string; text?: string }[]): string {
  return content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
}

export async function runAnthropic(input: AnthropicInput): Promise<RunModelResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const tools = input.enableWebSearch
    ? [{ type: "web_search_20250305", name: "web_search" } as unknown as Anthropic.Tool]
    : [];
  const started = Date.now();
  const res = await client.messages.create({
    model: input.model,
    max_tokens: 4000,
    temperature: input.temperature ?? 0,
    system: input.system,
    messages: [{ role: "user", content: input.user }],
    ...(tools.length ? { tools } : {}),
  });
  const text = extractText(res.content as { type: string; text?: string }[]);
  let json: unknown;
  try { json = JSON.parse(text); } catch { json = { _raw: text, _parse_error: true }; }
  const tokensIn = res.usage?.input_tokens ?? 0;
  const tokensOut = res.usage?.output_tokens ?? 0;
  return {
    json,
    model_provider: "anthropic",
    model_version: input.model,
    tokens: tokensIn + tokensOut,
    cost_usd: tokensIn * PRICE_IN + tokensOut * PRICE_OUT,
    latency_ms: Date.now() - started,
  };
}
