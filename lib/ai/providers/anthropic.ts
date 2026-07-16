import Anthropic from "@anthropic-ai/sdk";
import type { RunModelInput, RunModelResult } from "@/lib/ai/runModel";

export interface AnthropicInput extends RunModelInput { model: string; enableWebSearch?: boolean }

// S-2 (d), founder-ruled 2026-07-17 (R3) — cost derives from the model ACTUALLY CALLED, per-model,
// for cost observability only (not billing). A model with no entry prices LOUD-ZERO (console.error
// + cost 0): attributable, never silently wrong — AT-SYN-COST feeds OQ-S3 and a wrong figure would
// rule it on bad data. Adding a model to MODEL_CONFIG means adding its price row here (the S-2
// lock test fails otherwise).
const PRICES: Record<string, { inPerToken: number; outPerToken: number }> = {
  "claude-sonnet-4-6": { inPerToken: 3 / 1_000_000, outPerToken: 15 / 1_000_000 },
};

export function priceFor(model: string): { known: boolean; inPerToken: number; outPerToken: number } {
  const p = PRICES[model];
  if (!p) return { known: false, inPerToken: 0, outPerToken: 0 };
  return { known: true, ...p };
}

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
  const baseParams = {
    model: input.model,
    max_tokens: 8000, // rich Track-1 outputs (many sources) exceeded 4000 → truncated/unparseable JSON
    temperature: input.temperature ?? 0,
    system: input.system,
    messages: [{ role: "user" as const, content: input.user }],
    ...(tools.length ? { tools } : {}),
  };
  let res: Anthropic.Message;
  let schemaFallback = false;
  try {
    res = await client.messages.create({
      ...baseParams,
      // H7 (OQ-C) — structured outputs: the model is CONSTRAINED to the parse target's schema, so
      // truncation/prose/fence parse failures stop happening at the source. output_config is cast
      // because the installed SDK's param types may predate the parameter — the wire accepts it.
      ...(input.schema ? { output_config: { format: { type: "json_schema" as const, schema: input.schema } } } : {}),
    } as Anthropic.MessageCreateParamsNonStreaming);
  } catch (e) {
    // OQ-C (founder-ruled) fail-open: if the model rejects output_config (capability), retry ONCE
    // without the schema and fall back to the tolerant-parse path — parseModelJson stays forever
    // (the H5 scanner-stays-forever pattern); the H2 llm_failed guard remains the backstop.
    // Any OTHER error rethrows unchanged (H2 handles it upstream) — never a blind retry.
    const msg = e instanceof Error ? e.message : "";
    if (!input.schema || !/output_config|output_format|json_schema/i.test(msg)) throw e;
    schemaFallback = true;
    res = await client.messages.create(baseParams as Anthropic.MessageCreateParamsNonStreaming);
  }
  const text = extractText(res.content as { type: string; text?: string }[]);
  const json = parseModelJson(text); // tolerant: handles ```json fences + prose around the object
  const tokensIn = res.usage?.input_tokens ?? 0;
  const tokensOut = res.usage?.output_tokens ?? 0;
  const price = priceFor(input.model);
  if (!price.known) console.error(`[runAnthropic] no price entry for model "${input.model}" — cost_usd reported as 0 (add its row to PRICES)`);
  return {
    json,
    model_provider: "anthropic",
    model_version: input.model,
    tokens: tokensIn + tokensOut,
    cost_usd: tokensIn * price.inPerToken + tokensOut * price.outPerToken,
    latency_ms: Date.now() - started,
    ...(schemaFallback ? { schema_fallback: true } : {}),
  };
}
