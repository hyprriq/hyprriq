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
