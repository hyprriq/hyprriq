import type { AcquisitionResult, AcquisitionStatus, RawSource } from "./types";

// Deterministic retry policy (CTO pre-freeze): max 2 retries, exponential backoff 250ms → 500ms.
// Retry ONLY on retryable failures (network/timeout, HTTP 429, transient 5xx). Permanent failures
// (4xx other than 429) and successes never retry. retry_count + final_status feed acquisition metrics.
const BACKOFFS_MS = [250, 500];

const STATUS_SEVERITY: Record<AcquisitionStatus, number> = {
  ok: 0, empty: 1, skipped: 1, rate_limited: 2, server_error: 3, network_error: 4, permanent_error: 5,
};
export function worseStatus(a: AcquisitionStatus, b: AcquisitionStatus): AcquisitionStatus {
  return STATUS_SEVERITY[b] > STATUS_SEVERITY[a] ? b : a;
}

export interface AttemptOutcome {
  sources: RawSource[];
  status: AcquisitionStatus;
  retryable: boolean;
  cost_usd: number;
}
export type Attempt = () => Promise<AttemptOutcome>;

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function withRetry(
  attempt: Attempt,
  opts: { sleep?: (ms: number) => Promise<void> } = {},
): Promise<AcquisitionResult> {
  const sleep = opts.sleep ?? realSleep;
  let retry_count = 0;
  let last: AttemptOutcome = { sources: [], status: "network_error", retryable: true, cost_usd: 0 };
  for (let i = 0; i <= BACKOFFS_MS.length; i++) {
    try {
      last = await attempt();
    } catch {
      last = { sources: [], status: "network_error", retryable: true, cost_usd: 0 };
    }
    if (!last.retryable) break;                 // success or permanent failure → stop
    if (i < BACKOFFS_MS.length) { retry_count++; await sleep(BACKOFFS_MS[i]); }
    // else: retries exhausted, loop ends
  }
  return { sources: last.sources, retry_count, final_status: last.status, cost_usd: last.cost_usd };
}
