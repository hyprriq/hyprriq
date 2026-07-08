/**
 * H7 (OQ-C) — structured-outputs capability check (FOUNDER-RUN, ~$0.001, one tiny model call).
 *
 *   npx tsx --env-file=.env.local scripts/check-structured-outputs.ts
 *
 * Reports whether the pinned track model accepts output_config.format (structured outputs) or
 * whether the pipeline is running on the fail-open tolerant-parse path (both are PASS states by
 * founder ruling — the result is LOGGED in the tracker either way).
 */
import { runModel } from "@/lib/ai/runModel";

const PROBE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["answer"],
  properties: { answer: { type: "string" } },
} as const;

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("STOP: ANTHROPIC_API_KEY missing — run with --env-file=.env.local");
    process.exit(1);
  }
  const res = await runModel({
    task: "track",
    system: "Reply with strict JSON only.",
    user: 'Return exactly: {"answer":"ok"}',
    temperature: 0,
    schema: PROBE_SCHEMA,
  });
  const parsedOk = typeof res.json === "object" && res.json !== null && (res.json as { answer?: string }).answer === "ok";
  if (res.schema_fallback) {
    console.log("structured outputs: FALLBACK (schema rejected by the model — tolerant parsing in effect; fail-open per OQ-C)");
  } else {
    console.log("structured outputs: SUPPORTED (output_config.format accepted by the pinned model)");
  }
  console.log(`probe parse ${parsedOk ? "OK" : "UNEXPECTED"} · model ${res.model_version} · cost $${res.cost_usd.toFixed(5)}`);
  process.exit(parsedOk ? 0 : 1);
}
main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
