import { describe, it, expect } from "vitest";
import { checkpointsDue, type OutcomeCheckpointRow } from "./outcome-checkpoints";

const row = (over: Partial<OutcomeCheckpointRow>): OutcomeCheckpointRow => ({
  case_id: "c1", case_number: "AWI-1", vendor_name: "TD Synnex",
  delivered_at: "2026-06-01T00:00:00Z", outcome_type: null,
  checkpoint_30_sent_at: null, checkpoint_90_sent_at: null, ...over,
});
const now = new Date("2026-07-06T00:00:00Z"); // delivered_at above = 35 days ago

describe("checkpointsDue (pure — the cron's selection brain)", () => {
  it("30-day: delivered ≥30d, no outcome, not yet nudged → due", () => {
    expect(checkpointsDue([row({})], now).due30.map((r) => r.case_number)).toEqual(["AWI-1"]);
  });
  it("already nudged at 30 → not due again", () => {
    expect(checkpointsDue([row({ checkpoint_30_sent_at: "2026-07-02T00:00:00Z" })], now).due30).toEqual([]);
  });
  it("outcome already recorded → never due (the question is answered)", () => {
    expect(checkpointsDue([row({ outcome_type: "no_issues" })], now).due30).toEqual([]);
  });
  it("90-day: delivered ≥90d → due90 (independent of the 30-day nudge)", () => {
    const r = row({ delivered_at: "2026-04-01T00:00:00Z", checkpoint_30_sent_at: "2026-05-01T00:00:00Z" });
    expect(checkpointsDue([r], now).due90.map((x) => x.case_number)).toEqual(["AWI-1"]);
  });
  it("delivered 10 days ago → nothing due", () => {
    const r = row({ delivered_at: "2026-06-26T00:00:00Z" });
    const d = checkpointsDue([r], now);
    expect(d.due30).toEqual([]);
    expect(d.due90).toEqual([]);
  });
});
