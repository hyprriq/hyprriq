import { describe, it, expect, vi, beforeEach } from "vitest";
const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: { rpc } }));
import { addClientCredits, rolloverClientCredits } from "./credits";

beforeEach(() => { rpc.mockReset().mockResolvedValue({ data: 7, error: null }); });

describe("addClientCredits (N6 — atomic top-up)", () => {
  it("calls the add_client_credits RPC with the exact args", async () => {
    const r = await addClientCredits("client_1", 3);
    expect(rpc).toHaveBeenCalledWith("add_client_credits", { p_client_id: "client_1", p_amount: 3 });
    expect(r).toEqual({ balance: 7, error: null });
  });
  it("B2 — surfaces the DB error instead of swallowing it", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect((await addClientCredits("client_1", 3)).error).toBe("boom");
  });
  it("no matching client → balance null + loud error (payment must never vanish silently)", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    const r = await addClientCredits("ghost", 3);
    expect(r.balance).toBeNull();
    expect(r.error).toMatch(/no client row/);
  });
});

describe("rolloverClientCredits (capped rollover, plan math stays in TS)", () => {
  it("passes the plan's cap + cycle credits from lib/constants/plans", async () => {
    await rolloverClientCredits("cus_123", "growth_279");
    expect(rpc).toHaveBeenCalledWith("rollover_client_credits",
      { p_stripe_customer_id: "cus_123", p_rollover_cap: 2, p_cycle_credits: 5 });
  });
  it("scale_499 → cap 4, cycle 12", async () => {
    await rolloverClientCredits("cus_9", "scale_499");
    expect(rpc).toHaveBeenCalledWith("rollover_client_credits",
      { p_stripe_customer_id: "cus_9", p_rollover_cap: 4, p_cycle_credits: 12 });
  });
  it("B2 — surfaces the DB error; unknown customer is loud", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    const r = await rolloverClientCredits("cus_ghost", "growth_279");
    expect(r.balance).toBeNull();
    expect(r.error).toMatch(/no client row/);
  });
});
