import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOperator, canManageUsers } from "@/lib/auth/permissions";
import {
  claimPartnerRequestForApproval,
  revertPartnerRequestClaim,
  attachGrantToRequest,
  setPartnerRequestStatus,
} from "@/lib/data/partnerRequests";
import { createGrant } from "@/lib/data/grants";
import { sendGrantInviteEmail } from "@/lib/email/notify";
import { SITE_URL } from "@/lib/constants/site";
import { supabaseAdmin } from "@/lib/supabase/admin";

// ── PARTNER REQUEST DECISION (ruling amended 2026-09-06) — SUPER-ADMIN ONLY, the same gate as
// the grants API it sits beside.
//
// THE AMENDMENT, in the founder's words: "The ruling was NO AUTO-GRANT. It was never that
// approval should send nothing. What is broken is that approving does nothing at all… the form
// collects a request and then depends on me to remember to email a stranger by hand."
//
// So APPROVE is one click that does the whole yes:
//   claim the row → create the RULED grant (value fixed in lib/data/grants.ts — 1 credit,
//   growth-tier report, link mode, single redemption, 30-day expiry; nothing here chooses it)
//   → email the requester the link → record which grant the approval produced → audit.
//
// ⛔ STILL NO AUTO-ISSUE. This route is unreachable without an authenticated super-admin click;
// the /partners form path writes a request row and nothing else, exactly as ruled 2026-08-22.
// "Mark contacted" is GONE from the API — it was the action that made approval look like it had
// sent something, and it never had.
//
// DECLINE marks the row and sends nothing. Silence is the ruled answer to a no.
//
// ⚠ ORDER AND FAILURE SHAPE (see claimPartnerRequestForApproval for why claim comes first):
//   · grant creation fails → the claim is reverted, the founder retries. 500, named.
//   · email fails → NOT a failure of the approval. The grant exists; the response carries
//     {sent:false, reason} and the panel shows the link for manual sending. Loud, non-fatal,
//     the same shape as the support reply and the delivery email.

const GRANT_EXPIRES_DAYS = 30; // the ruled ceiling — matches the grants route's clamp

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const op = await getOperator(userId);
  if (!op || !canManageUsers(op)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  let body: { action?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const action = body.action === "approve" || body.action === "decline" ? body.action : null;
  if (!action) return NextResponse.json({ error: "invalid_action", message: "action must be 'approve' or 'decline'" }, { status: 400 });

  // ── DECLINE — a status word and an audit row, nothing else ─────────────────────────────────
  if (action === "decline") {
    const { error } = await setPartnerRequestStatus(id, "declined");
    if (error) return NextResponse.json({ error }, { status: 500 });
    await audit(userId, id, { partner_request_decided: true, status: "declined" });
    return NextResponse.json({ ok: true, status: "declined" });
  }

  // ── APPROVE ────────────────────────────────────────────────────────────────────────────────
  const claim = await claimPartnerRequestForApproval(id);
  if (!claim.claimed) {
    const map = {
      already_decided: { status: 409, message: "This request was already decided." },
      not_found: { status: 404, message: "Request not found." },
      migration_missing: {
        status: 503,
        message:
          "The approval migration hasn't been run yet (founder-run, 20260906000000) — " +
          "the status CHECK still refuses 'approved'. Nothing was changed.",
      },
      unavailable: { status: 500, message: "Could not claim the request." },
    } as const;
    const m = map[claim.reason];
    return NextResponse.json({ error: claim.reason, message: m.message }, { status: m.status });
  }
  const r = claim.request;

  const { grant, error: grantErr } = await createGrant({
    mode: "link",
    note: `Partner request — ${r.name} <${r.email}>`,
    createdBy: userId,
    // THE BINDING (founder-ruled 2026-09-07): the grant carries the decision Approve already
    // made. Before this, the recipient lived only in `note` free text and the issuer's own
    // click redeemed the first partner grant ever sent.
    recipientEmail: r.email,
    expiresDays: GRANT_EXPIRES_DAYS,
    maxRedemptions: 1,
  });
  if (grantErr || !grant) {
    await revertPartnerRequestClaim(id);
    return NextResponse.json(
      { error: "grant_create_failed", message: `The grant could not be created (${grantErr ?? "unknown"}). The request is back in the queue — try again.` },
      { status: 500 },
    );
  }

  await attachGrantToRequest(id, grant.id);

  const grantUrl = `${SITE_URL}/grant/${grant.code}`;
  const emailed = await sendGrantInviteEmail({
    to: r.email,
    name: r.name || null,
    grantUrl,
    expiresDays: GRANT_EXPIRES_DAYS,
  });

  await audit(userId, id, {
    partner_request_decided: true,
    status: "approved",
    grant_id: grant.id,
    code_prefix: grant.code.slice(0, 6),
    invite_emailed: emailed.sent,
    ...(emailed.sent ? {} : { invite_email_reason: emailed.reason ?? "unknown" }),
  });

  // The code prefix (not the full code) rides back for display; the full link lives in the
  // grants panel where every other grant link is copied from.
  return NextResponse.json({
    ok: true,
    status: "approved",
    grant: { id: grant.id, code_prefix: grant.code.slice(0, 8) },
    emailed,
  });
}

async function audit(userId: string, id: string, new_value: Record<string, unknown>): Promise<void> {
  try {
    await supabaseAdmin.from("audit_log").insert({
      table_name: "partner_requests", record_id: id, action: "UPDATE",
      actor_id: userId, actor_type: "admin", new_value,
    });
  } catch { /* reporter never blocks */ }
}
