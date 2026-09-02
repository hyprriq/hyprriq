import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOperator, can } from "@/lib/auth/permissions";
import { clientInScope } from "@/lib/auth/clientScope";
import { getAdminSupportRequest, saveSupportResponse, SUPPORT_STATUSES, type SupportStatus } from "@/lib/data/adminSupport";
import { scanHard } from "@/lib/utils/banned-language";
import { sendSupportReplyNotice } from "@/lib/email/notify";

// ── ANSWER A SUPPORT TICKET (founder-ruled 2026-09-01) ───────────────────────────────────────
//
// The ruling that created this route: "EMAIL IS THE ALERT, NEVER THE CHANNEL. It tells me
// something needs answering; the answer happens in the product." Before it, `support_requests`
// carried admin_response, status and resolved_at and NOTHING IN THE CODEBASE WROTE ANY OF THEM —
// verified by sweep and by the database: two tickets, both open, both responses null.
//
// ⛔ THE CAPABILITY IS review_publish, NOT view_cases, AND THAT IS A DECISION.
// The queue itself is gated on `view_cases` — reading a ticket is reading client case material.
// But a REPLY is prose that goes in front of a paying client, and `review_publish` is already the
// capability that governs exactly that: it gates publishing a report and saving a prose override.
// Reusing it keeps one meaning for "may put words in front of a client" instead of inventing a
// second. Adding a `respond_support` capability was the alternative and was rejected: CAPABILITIES
// is a stored contract on every admin_permissions row, and widening it to express a permission an
// existing one already expresses would be a migration for a synonym.
//
// ⚠ THE GATE DECIDES, NOT THE OPERATOR. scanHard runs on the reply BEFORE it is stored — the same
// law as the prose-override route. An operator cannot answer a client with language the publish
// gate would refuse in a report; there is one standard for client-bound prose, not one per surface.
//
// CLIENT PARTITIONING applies to the write exactly as it does to the list: a scoped operator
// cannot answer a ticket belonging to a client outside their scope, and cannot tell an
// out-of-scope ticket from a missing one.

const MAX = 8000;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const op = await getOperator(userId);
  if (!can(op, "review_publish")) {
    return NextResponse.json({ error: "forbidden: requires review_publish" }, { status: 403 });
  }

  const { id } = await params;
  let body: { response?: string; status?: string; notify?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const status = body.status as SupportStatus | undefined;
  if (!status || !(SUPPORT_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({
      error: "invalid_status",
      message: `Status must be one of: ${SUPPORT_STATUSES.join(", ")}.`,
    }, { status: 400 });
  }

  // An empty reply is legal — moving a ticket to in_progress without answering yet is a real
  // operator action. A reply that is only whitespace is not: it would render as an empty
  // "we replied" block in the client's portal.
  const raw = typeof body.response === "string" ? body.response.trim() : "";
  const response = raw.length > 0 ? raw : null;
  if (response && response.length > MAX) {
    return NextResponse.json({
      error: "too_long",
      message: `Keep the reply under ${MAX} characters.`,
    }, { status: 400 });
  }

  // THE GATE, before anything is stored.
  if (response) {
    const violations = scanHard(response);
    if (violations.length > 0) {
      return NextResponse.json({
        error: "banned_language",
        violations,
        message: `Your reply trips the language gate: ${violations.join(", ")}. Reword and try again.`,
      }, { status: 422 });
    }
  }

  const ticket = await getAdminSupportRequest(id, op ? await scopeOf(op) : []);
  if (!ticket) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (ticket.client_id && !(await clientInScope(op, ticket.client_id))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const saved = await saveSupportResponse({ id, response, status, actorId: userId });
  if (saved.error) return NextResponse.json({ error: "save_failed", message: saved.error }, { status: 500 });

  // ⛔ LOUD-BUT-NON-FATAL, like every sibling: the reply is ALREADY stored and visible in the
  // client's portal. A failed email must never roll back an answer or report one as unsaved.
  let notified: { sent: boolean; reason?: string } = { sent: false, reason: "not_requested" };
  if (response && body.notify !== false) {
    notified = await sendSupportReplyNotice({
      to: ticket.clients?.email ?? null,
      srNumber: ticket.sr_number,
      subject: ticket.subject,
    });
  }

  return NextResponse.json({ ok: true, status, notified });
}

// getClientScope lives behind the operator; this keeps the call in one place and out of the
// happy path above.
async function scopeOf(op: NonNullable<Awaited<ReturnType<typeof getOperator>>>) {
  const { getClientScope } = await import("@/lib/auth/clientScope");
  return getClientScope(op);
}
