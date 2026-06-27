import { describe, it, expect, vi, beforeEach } from "vitest";

const create = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class { messages = { create }; constructor() {} },
}));

import { runAnthropic } from "./anthropic";

beforeEach(() => create.mockReset());

describe("runAnthropic", () => {
  it("calls the Messages API at temperature 0 and returns parsed JSON + usage", async () => {
    create.mockResolvedValue({
      content: [{ type: "text", text: '{"ok":true}' }],
      usage: { input_tokens: 100, output_tokens: 50 },
    });
    const r = await runAnthropic({ task: "track", system: "sys", user: "usr", model: "claude-sonnet-4-6", temperature: 0 });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ model: "claude-sonnet-4-6", temperature: 0, max_tokens: 4000 }));
    expect(r.json).toEqual({ ok: true });
    expect(r.model_version).toBe("claude-sonnet-4-6");
    expect(r.tokens).toBe(150);
    expect(r.cost_usd).toBeGreaterThan(0);
  });
  it("does NOT attach the web_search tool by default", async () => {
    create.mockResolvedValue({ content: [{ type: "text", text: "{}" }], usage: { input_tokens: 1, output_tokens: 1 } });
    await runAnthropic({ task: "track", system: "s", user: "u", model: "claude-sonnet-4-6" });
    const arg = create.mock.calls[0][0];
    expect(arg.tools ?? []).toHaveLength(0);
  });
});
