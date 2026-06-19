import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";
import { sendDualNotification } from "@/lib/email/notify";
import type { SupportRequestType } from "@/lib/data/support";

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

  // Dual email (client confirmation + admin notification). Non-fatal.
  const { data: client } = await supa.from("clients").select("email").eq("id", userId).maybeSingle();
  await sendDualNotification({
    clientEmail: client?.email ?? null,
    subject: `Support request ${created.sr_number}: ${subject}`,
    clientHtml: `<p>Thanks — we've received your request <strong>${created.sr_number}</strong> and typically respond within 1 business day.</p><p><strong>Subject:</strong> ${subject}</p><p>${message}</p>`,
    adminHtml: `<p>New support request <strong>${created.sr_number}</strong> (${type}) from ${client?.email ?? userId}.</p><p><strong>Subject:</strong> ${subject}</p><p>${message}</p>${safeCaseId ? `<p>Linked case: ${safeCaseId}</p>` : ""}`,
  });

  return NextResponse.json({ ok: true, sr_number: created.sr_number, id: created.id });
}
