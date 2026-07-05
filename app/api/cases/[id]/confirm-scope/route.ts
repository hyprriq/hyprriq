import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";

// Client confirms the brand scope on a paused (awaiting_client) case. Sets the
// confirmed brand list and re-enters the queue so research can begin. Idempotent
// guard: only acts on a case that is actually awaiting_client and owned by the
// caller — prevents a stale tab from re-confirming a case mid-research.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  let brands: string[] = [];
  try {
    const body = await req.json();
    if (Array.isArray(body?.brands)) {
      brands = body.brands.filter((b: unknown): b is string => typeof b === "string");
    }
  } catch {
    // fall through with empty -> handled below
  }

  const supa = createServerClient();
  const { data: existing } = await supa
    .from("cases")
    .select("id, status, brands_submitted, vendor_name, vendor_website, marketplace, plan_type")
    .eq("id", id)
    .eq("client_id", userId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (existing.status !== "awaiting_client") {
    return NextResponse.json(
      { error: "not_awaiting", status: existing.status },
      { status: 409 },
    );
  }

  const confirmed = brands.length > 0 ? brands : (existing.brands_submitted ?? []);

  const { error } = await supa
    .from("cases")
    .update({ brands_confirmed: confirmed, status: "queued" })
    .eq("id", id)
    .eq("client_id", userId)
    .eq("status", "awaiting_client"); // optimistic concurrency guard

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // H2 — a confirmed scope actually starts research (pre-H2, 'queued' was a dead end nothing
  // consumed). On enqueue failure: revert to awaiting_client so the client can simply retry;
  // the watchdog also sweeps any 'queued' case that somehow never starts.
  try {
    await inngest.send({
      name: "pipeline/run-case",
      data: {
        case_id: id, vendor_name: existing.vendor_name, vendor_website: existing.vendor_website,
        brands_submitted: confirmed, marketplace: existing.marketplace ?? "amazon_us", plan_type: existing.plan_type,
      },
    });
  } catch {
    await supa.from("cases").update({ status: "awaiting_client" }).eq("id", id).eq("client_id", userId);
    return NextResponse.json({ error: "enqueue_failed", message: "Could not start research — please try confirming again." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, brands_confirmed: confirmed });
}
