import { it, expect, vi, beforeEach } from "vitest";
const { upsert, update, updateEq, maybeSingle } = vi.hoisted(() => {
  const updateSelect = vi.fn().mockResolvedValue({ data: [{ id: "o1" }], error: null });
  const updateEq = vi.fn(() => ({ select: updateSelect }));
  return {
    upsert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn(() => ({ eq: updateEq })),
    updateEq,
    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
  };
});
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from: vi.fn(() => ({ upsert, update, select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })) })) },
}));
import { seedCaseOutcome, recordCaseOutcome, getCaseOutcome, OUTCOME_TYPES } from "./outcomes";

beforeEach(() => { upsert.mockClear(); update.mockClear(); updateEq.mockClear(); });

it("seedCaseOutcome upserts verdict_at_delivery keyed by case (re-publish refreshes the delivered verdict)", async () => {
  await seedCaseOutcome("case-1", "usable_with_conditions");
  expect(upsert).toHaveBeenCalledWith(
    { case_id: "case-1", verdict_at_delivery: "usable_with_conditions" },
    { onConflict: "case_id" },
  );
});
it("recordCaseOutcome rejects an unknown outcome_type", async () => {
  const r = await recordCaseOutcome("case-1", { outcome_type: "aliens", reported_by: "founder" } as never);
  expect(r.error).toMatch(/invalid outcome_type/);
  expect(update).not.toHaveBeenCalled();
});
it("recordCaseOutcome writes type/notes/correctness + reported_at/by, keyed by case", async () => {
  const r = await recordCaseOutcome("case-1", { outcome_type: "no_issues", outcome_notes: "clean", prediction_correct: true, reported_by: "founder" });
  expect(r.error).toBeNull();
  const row = (update.mock.calls as unknown as Record<string, unknown>[][])[0][0];
  expect(row).toMatchObject({ outcome_type: "no_issues", outcome_notes: "clean", prediction_correct: true, reported_by: "founder" });
  expect(row.outcome_reported_at).toBeTruthy();
  expect(updateEq).toHaveBeenCalledWith("case_id", "case-1");
});
it("recordCaseOutcome on a never-delivered case (no row) → loud error", async () => {
  updateEq.mockReturnValueOnce({ select: vi.fn().mockResolvedValue({ data: [], error: null }) } as never);
  const r = await recordCaseOutcome("ghost", { outcome_type: "no_issues", reported_by: "founder" });
  expect(r.error).toMatch(/no outcome row/);
});
it("getCaseOutcome returns null when no row", async () => {
  expect(await getCaseOutcome("case-x")).toBeNull();
});
it("OUTCOME_TYPES mirrors the DB CHECK exactly", () => {
  expect(OUTCOME_TYPES).toEqual(["no_issues", "ip_complaint", "invoice_rejected", "account_action", "brand_enforcement", "client_stopped_using_vendor", "other"]);
});
