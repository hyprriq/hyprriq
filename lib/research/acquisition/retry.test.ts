import { describe, it, expect, vi } from "vitest";
import { withRetry, worseStatus } from "./retry";
import type { AttemptOutcome } from "./retry";

const noSleep = async () => {};
const ok = (n = 1): AttemptOutcome => ({ sources: Array(n).fill({ url: "u", title: "t", snippet: "s", raw: {}, provenance: {} }), status: "ok", retryable: false, cost_usd: 0.001 });
const retryable = (status: AttemptOutcome["status"]): AttemptOutcome => ({ sources: [], status, retryable: true, cost_usd: 0 });
const permanent = (): AttemptOutcome => ({ sources: [], status: "permanent_error", retryable: false, cost_usd: 0 });

describe("withRetry", () => {
  it("succeeds on first attempt with no retries", async () => {
    const attempt = vi.fn().mockResolvedValue(ok(2));
    const r = await withRetry(attempt, { sleep: noSleep });
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(r.retry_count).toBe(0);
    expect(r.final_status).toBe("ok");
    expect(r.cost_usd).toBe(0.001);
    expect(r.sources).toHaveLength(2);
  });

  it("retries on 429 then succeeds (retry_count counts only the retries)", async () => {
    const attempt = vi.fn()
      .mockResolvedValueOnce(retryable("rate_limited"))
      .mockResolvedValueOnce(ok(1));
    const r = await withRetry(attempt, { sleep: noSleep });
    expect(attempt).toHaveBeenCalledTimes(2);
    expect(r.retry_count).toBe(1);
    expect(r.final_status).toBe("ok");
  });

  it("caps at 2 retries (3 attempts) on persistent 5xx", async () => {
    const attempt = vi.fn().mockResolvedValue(retryable("server_error"));
    const r = await withRetry(attempt, { sleep: noSleep });
    expect(attempt).toHaveBeenCalledTimes(3);
    expect(r.retry_count).toBe(2);
    expect(r.final_status).toBe("server_error");
  });

  it("does NOT retry a permanent failure", async () => {
    const attempt = vi.fn().mockResolvedValue(permanent());
    const r = await withRetry(attempt, { sleep: noSleep });
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(r.retry_count).toBe(0);
    expect(r.final_status).toBe("permanent_error");
  });

  it("treats a thrown error (network) as retryable", async () => {
    const attempt = vi.fn().mockRejectedValue(new Error("timeout"));
    const r = await withRetry(attempt, { sleep: noSleep });
    expect(attempt).toHaveBeenCalledTimes(3);
    expect(r.final_status).toBe("network_error");
  });
});

describe("worseStatus", () => {
  it("keeps the more severe status", () => {
    expect(worseStatus("ok", "rate_limited")).toBe("rate_limited");
    expect(worseStatus("network_error", "empty")).toBe("network_error");
    expect(worseStatus("ok", "empty")).toBe("empty");
  });
});
