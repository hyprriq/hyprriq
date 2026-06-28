import Anthropic from "@anthropic-ai/sdk";
import type { RunModelInput, RunModelResult } from "@/lib/ai/runModel";

export interface AnthropicInput extends RunModelInput { model: string; enableWebSearch?: boolean }

// Rough Sonnet 4.6 pricing (USD per token) — for cost observability only, not billing.
const PRICE_IN = 3 / 1_000_000;
const PRICE_OUT = 15 / 1_000_000;

function extractText(content: { type: string; text?: string }[]): string {
  return content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
}

// Models sometimes wrap JSON in ```json fences or add prose around it. Strip fences, then fall back
// to the first balanced {…} span, before declaring a parse failure. Returns the parsed value, or
// { _raw, _parse_error } so downstream parsers can degrade gracefully.
export function parseModelJson(text: string): unknown {
  const tryParse = (s: string): unknown | undefined => { try { return JSON.parse(s); } catch { return undefined; } };
  const trimmed = text.trim();
  const direct = tryParse(trimmed);
  if (direct !== undefined) return direct;
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) { const f = tryParse(fence[1].trim()); if (f !== undefined) return f; }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last > first) { const b = tryParse(trimmed.slice(first, last + 1)); if (b !== undefined) return b; }
  return { _raw: text, _parse_error: true };
}

export async function runAnthropic(input: AnthropicInput): Promise<RunModelResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const tools = input.enableWebSearch
    ? [{ type: "web_search_20250305", name: "web_search" } as unknown as Anthropic.Tool]
    : [];
  const started = Date.now();
  const res = await client.messages.create({
    model: input.model,
    max_tokens: 8000, // rich Track-1 outputs (many sources) exceeded 4000 → truncated/unparseable JSON
    temperature: input.temperature ?? 0,
    system: input.system,
    messages: [{ role: "user", content: input.user }],
    ...(tools.length ? { tools } : {}),
  });
  const text = extractText(res.content as { type: string; text?: string }[]);
  const json = parseModelJson(text); // tolerant: handles ```json fences + prose around the object
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
