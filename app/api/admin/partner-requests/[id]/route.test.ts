import { describe, it, expect, vi, beforeEach } from "vitest";

// ── THE APPROVE ACTION (founder-ruled 2026-09-06) — the tests state the ruling ───────────────
//
// "The ruling was NO AUTO-GRANT. It was never that approval should send nothing." Approve does
// the whole yes — claim → ruled grant → invite email → audit — and Decline sends nothing.
//
// ⚠ FIXTURES ARE PRODUCTION-SHAPED (standing rule 16): the operator is the real row —
// super_admin with capabilities: [] — because that empty array IS what production holds, and a
// fixture that fabricates a fuller row would test a world that does not exist.

const { auth, claim, revert, attach, setStatus, create, sendInvite, auditInsert } = vi.hoisted(() => ({
  auth: vi.fn().mockResolvedValue({ userId: "user_super_1" }),
  claim: vi.fn(),
  revert: vi.fn().mockResolvedValue(undefined),
  attach: vi.fn().mockResolvedValue({ error: null }),
  setStatus: vi.fn().mockResolvedValue({ error: null }),
  create: vi.fn(),
  sendInvite: vi.fn().mockResolvedValue({ sent: true }),
  auditInsert: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth }));
vi.mock("@/lib/auth/permissions", () => ({
  getOperator: vi.fn().mockResolvedValue({ user_id: "user_super_1", role: "super_admin", capabilities: [] }),
  canManageUsers: (op: { role: string } | null) => op?.role === "super_admin",
}));
vi.mock("@/lib/data/partnerRequests", () => ({
  claimPartnerRequestForApproval: claim,
  revertPartnerRequestClaim: revert,
  attachGrantToRequest: attach,
  setPartnerRequestStatus: setStatus,
}));
vi.mock("@/lib/data/grants", () => ({ createGrant: create }));
vi.mock("@/lib/email/notify", () => ({ sendGrantInviteEmail: sendInvite }));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from: () => ({ insert: auditInsert }) },
}));

import { PATCH } from "./route";

const REQUEST = {
  id: "pr-1", name: "Priya", email: "priya@example.com", role: "agency",
  clients_band: "3-10", note: null, status: "approved", decided_at: "2026-09-06T00:00:00Z",
  grant_id: null, created_at: "2026-09-05T00:00:00Z",
};
const GRANT = { id: "grant-1", code: "abcdefgh1234567890abcdefgh12", mode: "link" };

function call(action: unknown) {
  return PATCH(
    new Request("http://x/api/admin/partner-requests/pr-1", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
    }),
    { params: Promise.resolve({ id: "pr-1" }) },
  );
}

beforeEach(() => {
  claim.mockReset(); create.mockReset();
  sendInvite.mockClear(); revert.mockClear(); attach.mockClear(); setStatus.mockClear(); auditInsert.mockClear();
  sendInvite.mockResolvedValue({ sent: true });
});

describe("approve — the whole yes in one click", () => {
  it("claims, creates the ruled grant, emails the link, records the pairing", async () => {
    claim.mockResolvedValue({ claimed: true, request: REQUEST });
    create.mockResolvedValue({ grant: GRANT, error: null });
    const res = await call("approve");
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.grant.code_prefix).toBe(GRANT.code.slice(0, 8));
    expect(data.emailed.sent).toBe(true);
    // The RULED value: link mode, single redemption, the 30-day ceiling — never chosen here.
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ mode: "link", maxRedemptions: 1, expiresDays: 30 }));
    // The email carries the /grant/<code> link to the REQUESTER's address.
    expect(sendInvite).toHaveBeenCalledWith(expect.objectContaining({
      to: "priya@example.com",
      grantUrl: expect.stringContaining(`/grant/${GRANT.code}`),
    }));
    expect(attach).toHaveBeenCalledWith("pr-1", "grant-1");
  });

  it("a lost claim race is a 409, and NO grant is created — credit value fails toward nothing issued", async () => {
    claim.mockResolvedValue({ claimed: false, reason: "already_decided" });
    const res = await call("approve");
    expect(res.status).toBe(409);
    expect(create).not.toHaveBeenCalled();
    expect(sendInvite).not.toHaveBeenCalled();
  });

  it("the missing migration is NAMED, never silent — the defect class this feature ends", async () => {
    claim.mockResolvedValue({ claimed: false, reason: "migration_missing" });
    const res = await call("approve");
    expect(res.status).toBe(503);
    expect((await res.json()).message).toContain("20260906000000");
  });

  it("grant creation failing reverts the claim so the yes can be retried", async () => {
    claim.mockResolvedValue({ claimed: true, request: REQUEST });
    create.mockResolvedValue({ grant: null, error: "insert failed" });
    const res = await call("approve");
    expect(res.status).toBe(500);
    expect(revert).toHaveBeenCalledWith("pr-1");
    expect(sendInvite).not.toHaveBeenCalled();
  });

  it("a failed EMAIL is not a failed APPROVAL — the grant exists and the response says the send did not", async () => {
    claim.mockResolvedValue({ claimed: true, request: REQUEST });
    create.mockResolvedValue({ grant: GRANT, error: null });
    sendInvite.mockResolvedValue({ sent: false, reason: "no_api_key" });
    const res = await call("approve");
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.emailed).toEqual({ sent: false, reason: "no_api_key" });
    expect(revert).not.toHaveBeenCalled(); // the approval stands; the courier failed, not the decision
  });
});

describe("decline — a word and an audit row, nothing else", () => {
  it("marks declined and sends NOTHING — silence is the ruled answer to a no", async () => {
    const res = await call("decline");
    expect(res.status).toBe(200);
    expect(setStatus).toHaveBeenCalledWith("pr-1", "declined");
    expect(create).not.toHaveBeenCalled();
    expect(sendInvite).not.toHaveBeenCalled();
  });
});

describe("the surface area", () => {
  it("'contacted' is no longer an action — the word that made approval look like a send", async () => {
    const res = await call("contacted");
    expect(res.status).toBe(400);
  });
});
