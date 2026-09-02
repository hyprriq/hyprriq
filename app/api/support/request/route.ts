import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";
import { sendDualNotification } from "@/lib/email/notify";
import type { SupportRequestType } from "@/lib/data/support";
import { SITE_URL } from "@/lib/constants/site";

const VALID_TYPES: SupportRequestType[] = ["change_request", "billing", "technical", "general", "other"];

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { type?: string; subject?: string; body?: string; case_id?: string | null } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const type = (VALID_TYPES.includes(body.type as SupportRequestType) ? body.type : "general") as SupportRequestType;
  const subject = (body.subject ?? "").trim();
  const message = (body.body ?? "").trim();
  const caseId = body.case_id || null;

  if (!subject || !message) {
    return NextResponse.json({ error: "Subject and message are required." }, { status: 400 });
  }

  const supa = createServerClient();

  // If a case is linked, verify ownership before attaching it.
  let safeCaseId: string | null = null;
  if (caseId) {
    const { data: owned } = await supa
      .from("cases")
      .select("id")
      .eq("id", caseId)
      .eq("client_id", userId)
      .maybeSingle();
    safeCaseId = owned ? caseId : null;
  }

  const { data: created, error } = await supa
    .from("support_requests")
    .insert({ client_id: userId, type, subject, body: message, case_id: safeCaseId })
    .select("id, sr_number")
    .single();

  if (error || !created) {
    return NextResponse.json({ error: error?.message ?? "Could not submit request." }, { status: 500 });
  }

  // ── TWO MESSAGES FOR TWO READERS (founder-ruled 2026-09-01) ────────────────────────────────
  //
  // These were near-identical by construction and the founder read them as one email sent twice.
  // They were not — email_log shows two sends 33ms apart — but they were the SAME MESSAGE with a
  // different opening line: the same BasicNotice heading (opts.subject for both), the same
  // "Subject: … <message>" echo, and NO LINK TO THE TICKET in either.
  //
  // ⚠ THE CLIENT ONE NO LONGER INVITES A REPLY. It used to promise "we typically respond within
  // 1 business day" and arrive From support@hyprriq.com, an address with no inbound path — so the
  // obvious action it invited was the one that silently failed. It now points at the portal,
  // which is where the answer will actually appear.
  //
  // ⚠ AND THE ADMIN ONE IS AN OPS ALERT NOW, with the direct link that was its own small defect
  // to be missing: the founder's sequence is "email notification to me WITH A DIRECT LINK to that
  // ticket". An alert you have to go and find the subject of is a worse alert.
  const { data: client } = await supa.from("clients").select("email").eq("id", userId).maybeSingle();
  const ticketUrl = `${SITE_URL}/admin/support/${created.id}`;
  await sendDualNotification({
    clientEmail: client?.email ?? null,
    subject: `Support request ${created.sr_number}: ${subject}`,
    clientHtml:
      `<p>Thanks — we've received your request <strong>${created.sr_number}</strong> and typically respond within 1 business day.</p>` +
      `<p><strong>Subject:</strong> ${subject}</p><p>${message}</p>` +
      `<p>We'll answer in your portal, and email you when the reply is there. ` +
      `<a href="${SITE_URL}/portal/support">Your requests</a> shows every request and its status.</p>`,
    adminHtml:
      `<p><strong>${created.sr_number}</strong> — ${type} — from ${client?.email ?? userId}</p>` +
      `<p><a href="${ticketUrl}">Open the ticket to reply</a></p>` +
      `<p><strong>${subject}</strong></p><p>${message}</p>` +
      (safeCaseId ? `<p>Linked case: <a href="${SITE_URL}/admin/cases/${safeCaseId}">${safeCaseId}</a></p>` : ""),
  });

  return NextResponse.json({ ok: true, sr_number: created.sr_number, id: created.id });
}
