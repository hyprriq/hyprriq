import { describe, it, expect, vi, beforeEach } from "vitest";

const create = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class { messages = { create }; constructor() {} },
}));

import { runAnthropic, parseModelJson } from "./anthropic";

beforeEach(() => create.mockReset());

describe("parseModelJson", () => {
  it("parses plain JSON", () => {
    expect(parseModelJson('{"ok":true}')).toEqual({ ok: true });
  });
  it("strips ```json markdown fences (the real Track 1 failure)", () => {
    expect(parseModelJson('```json\n{"evidence_items":[]}\n```')).toEqual({ evidence_items: [] });
  });
  it("strips a bare ``` fence", () => {
    expect(parseModelJson('```\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it("extracts the first balanced {…} span when prose surrounds it", () => {
    expect(parseModelJson('Here is the result:\n{"a":1}\nLet me know.')).toEqual({ a: 1 });
  });
  it("flags a parse error on non-JSON without throwing", () => {
    const r = parseModelJson("not json at all") as { _parse_error?: boolean };
    expect(r._parse_error).toBe(true);
  });
});

describe("runAnthropic", () => {
  it("calls the Messages API at temperature 0 and returns parsed JSON + usage", async () => {
    create.mockResolvedValue({
      content: [{ type: "text", text: '{"ok":true}' }],
      usage: { input_tokens: 100, output_tokens: 50 },
    });
    const r = await runAnthropic({ task: "track", system: "sys", user: "usr", model: "claude-sonnet-4-6", temperature: 0 });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ model: "claude-sonnet-4-6", temperature: 0, max_tokens: 8000 }));
    expect(r.json).toEqual({ ok: true });
    expect(r.model_version).toBe("claude-sonnet-4-6");
    expect(r.tokens).toBe(150);
    expect(r.cost_usd).toBeGreaterThan(0);
  });
  it("recovers JSON wrapped in markdown fences from the model", async () => {
    create.mockResolvedValue({ content: [{ type: "text", text: '```json\n{"evidence_items":[{"evidence_id":"e1"}]}\n```' }], usage: { input_tokens: 10, output_tokens: 10 } });
    const r = await runAnthropic({ task: "track", system: "s", user: "u", model: "claude-sonnet-4-6" });
    expect(r.json).toEqual({ evidence_items: [{ evidence_id: "e1" }] });
  });
  it("does NOT attach the web_search tool by default", async () => {
    create.mockResolvedValue({ content: [{ type: "text", text: "{}" }], usage: { input_tokens: 1, output_tokens: 1 } });
    await runAnthropic({ task: "track", system: "s", user: "u", model: "claude-sonnet-4-6" });
    const arg = create.mock.calls[0][0];
    expect(arg.tools ?? []).toHaveLength(0);
  });
});

// ── H7 (OQ-C, founder-ruled) — structured outputs, capability-guarded and fail-open: if the model
// rejects output_config, retry ONCE without the schema and fall back to tolerant parsing. The
// parser is NEVER removed (the H5 scanner-stays-forever pattern).
//
// KNOWN HARNESS LIMITATION (vitest 4.1.9, isolated via a clean two-file repro during H7): any
// mock-originated rejection that escapes an imported module fails the test even when the test
// handles it — so the fourth contract ("a NON-schema error rethrows unchanged, no blind retry")
// cannot be unit-tested here. It was traced live during the build (catch reached, rethrow taken,
// exactly ONE create call) and the guard is the single `if (...) throw e` line in runAnthropic's
// catch. Logged in the tracker as a tooling limitation. ──
describe("runAnthropic structured outputs (H7 OQ-C)", () => {
  const OK = { content: [{ type: "text", text: '{"ok":true}' }], usage: { input_tokens: 10, output_tokens: 5 } };
  const SCHEMA = { type: "object", additionalProperties: false, required: ["ok"], properties: { ok: { type: "boolean" } } };

  it("sends output_config.format when a schema is provided", async () => {
    create.mockResolvedValue(OK);
    const r = await runAnthropic({ task: "track", system: "s", user: "u", model: "claude-sonnet-4-6", schema: SCHEMA });
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0][0].output_config).toEqual({ format: { type: "json_schema", schema: SCHEMA } });
    expect(r.json).toEqual({ ok: true });
    expect(r.schema_fallback).toBeUndefined();
  });
  it("no schema → no output_config (byte-identical to today's request)", async () => {
    create.mockResolvedValue(OK);
    await runAnthropic({ task: "track", system: "s", user: "u", model: "claude-sonnet-4-6" });
    expect(create.mock.calls[0][0]).not.toHaveProperty("output_config");
  });
  it("fail-open: a rejection naming output_config retries ONCE without the schema and flags the fallback", async () => {
    create
      .mockRejectedValueOnce(new Error("400 invalid_request_error: output_config: Extra inputs are not permitted"))
      .mockResolvedValueOnce(OK);
    const r = await runAnthropic({ task: "track", system: "s", user: "u", model: "claude-sonnet-4-6", schema: SCHEMA });
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[1][0]).not.toHaveProperty("output_config");
    expect(r.json).toEqual({ ok: true });
    expect(r.schema_fallback).toBe(true);
  });
});
