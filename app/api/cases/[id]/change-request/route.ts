import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";
import { sendDualNotification } from "@/lib/email/notify";

// Submit the single included change request for a delivered case. Server-side
// guard mirrors the page guard (defense in depth): case must be delivered, the
// 7-day window open, and the change request not already used.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  let body: { category?: string; details?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const category = (body.category ?? "").trim();
  const details = (body.details ?? "").trim();
  if (!category || !details) {
    return NextResponse.json({ error: "Category and description are required." }, { status: 400 });
  }

  const supa = createServerClient();
  const { data: c } = await supa
    .from("cases")
    .select("id, case_number, status, delivered_at, change_request_deadline, change_request_used")
    .eq("id", id)
    .eq("client_id", userId)
    .maybeSingle();

  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (c.status !== "delivered" && c.status !== "complete") {
    return NextResponse.json({ error: "not_delivered" }, { status: 409 });
  }
  if (c.change_request_used) {
    return NextResponse.json({ error: "already_used", message: "A change request has already been submitted for this report." }, { status: 409 });
  }
  const open = c.change_request_deadline && new Date(c.change_request_deadline).getTime() > Date.now();
  if (!open) {
    return NextResponse.json({ error: "window_closed", message: "The 7-day change request window has closed." }, { status: 409 });
  }

  const subject = `Change request — ${c.case_number} (${category})`;
  const { data: created, error } = await supa
    .from("support_requests")
    .insert({ client_id: userId, case_id: id, type: "change_request", subject, body: details })
    .select("id, sr_number")
    .single();

  if (error || !created) {
    return NextResponse.json({ error: error?.message ?? "Could not submit change request." }, { status: 500 });
  }

  // Mark the included change request as used (guarded so a stale tab can't double-spend).
  await supa
    .from("cases")
    .update({ change_request_used: true })
    .eq("id", id)
    .eq("client_id", userId)
    .eq("change_request_used", false);

  const { data: client } = await supa.from("clients").select("email").eq("id", userId).maybeSingle();
  await sendDualNotification({
    clientEmail: client?.email ?? null,
    subject: `${created.sr_number}: ${subject}`,
    clientHtml: `<p>We've received your change request <strong>${created.sr_number}</strong> for report ${c.case_number}. We review within 1 business day.</p><p><strong>Area:</strong> ${category}</p><p>${details}</p>`,
    adminHtml: `<p>Change request <strong>${created.sr_number}</strong> on ${c.case_number} from ${client?.email ?? userId}.</p><p><strong>Area:</strong> ${category}</p><p>${details}</p>`,
  });

  return NextResponse.json({ ok: true, sr_number: created.sr_number });
}
