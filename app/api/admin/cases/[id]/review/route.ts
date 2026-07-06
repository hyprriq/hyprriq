import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { inngest } from "@/lib/inngest/client";
import { getCaseTrackResults } from "@/lib/data/track-results";
import { scanFindingsForBannedLanguage } from "@/lib/utils/banned-language";

// Phase 4 — Founder Decision. The Intelligence Engine reaches report-ready autonomously; review is
// OPTIONAL, never required. This route records the founder's decision on the engine's output:
//   publish               — deliver the engine's report + verdict as-is
//   override              — supersede the verdict (requires override_verdict + reason), then deliver
//   request_investigation — send the case back for more evidence (no delivery)
// The banned-language gate stays on every delivery path.

const VALID_VERDICTS = ["source_clear", "usable_with_conditions", "verify_before_purchase", "do_not_rely"];
type Action = "publish" | "override" | "request_investigation";

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from("clients").select("role").eq("id", userId).maybeSingle();
  return !!data && data.role !== "client";
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await isAdmin(userId))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  let body: { action?: Action; override_verdict?: string; reason?: string; notes?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const action = body.action;
  if (action !== "publish" && action !== "override" && action !== "request_investigation") {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }
  if (action === "override" && (!body.override_verdict || !VALID_VERDICTS.includes(body.override_verdict))) {
    return NextResponse.json({ error: "Select a valid verdict to override.", message: "Select a valid verdict to override." }, { status: 400 });
  }
  if ((action === "override" || action === "request_investigation") && !body.reason?.trim()) {
    return NextResponse.json({ error: "reason_required", message: "A reason is required." }, { status: 400 });
  }

  const { data: c } = await supabaseAdmin
    .from("cases")
    .select("id, case_number, status, verdict, vendor_name, vendor_website, brands_submitted, brands_confirmed, marketplace, plan_type, supplier_identity")
    .eq("id", id)
    .maybeSingle();
  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const now = new Date().toISOString();
  const decision = { action, reason: body.reason ?? null, notes: body.notes ?? null, reviewed_by: userId, at: now };

  // Request Further Investigation — actually re-drives the pipeline (H2; pre-H2 this set a status
  // nothing consumed). H1 makes the re-run safe: it writes a NEW attempt, never overwriting the
  // prior one. Enqueue FIRST — if the send fails, the status is untouched and the admin is told.
  if (action === "request_investigation") {
    try {
      await inngest.send({
        name: "pipeline/run-case",
        data: {
          case_id: id, vendor_name: c.vendor_name, vendor_website: c.vendor_website,
          brands_submitted: (c.brands_confirmed as string[] | null) ?? (c.brands_submitted as string[] | null) ?? [],
          marketplace: c.marketplace ?? "amazon_us", plan_type: c.plan_type,
        },
      });
    } catch (e) {
      return NextResponse.json({ error: "enqueue_failed", message: `Could not start the re-investigation: ${e instanceof Error ? e.message : "enqueue failed"}` }, { status: 502 });
    }
    await supabaseAdmin.from("audit_log").insert({
      table_name: "cases", record_id: id, action: "UPDATE",
      actor_id: userId, actor_type: "admin", new_value: { decision },
    });
    const { error } = await supabaseAdmin
      .from("cases")
      .update({ status: "research_running", internal_notes: JSON.stringify(decision) })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, delivered: false, status: "research_running" });
  }

  // Delivery path (publish | override) — HARD-tier banned-language gate over EVERY client-visible
  // string (H5): compiled findings + client-facing questions + the Spec-B identity client_note.
  // (Assertion-tier advisories are review material on the admin panel, not gated here.)
  const rows = await getCaseTrackResults(id);
  const identityNote =
    ((c as { supplier_identity?: { identity_discrepancy?: { client_note?: string } | null } | null })
      .supplier_identity?.identity_discrepancy?.client_note) ?? null;
  const violations = [...new Set([
    ...rows.flatMap((r) => scanFindingsForBannedLanguage(r.compiled_findings_json)),
    ...rows.flatMap((r) => scanFindingsForBannedLanguage(r.questions_to_ask)),
    ...scanFindingsForBannedLanguage(identityNote ? { client_note: identityNote } : null),
  ])];
  if (violations.length > 0) {
    await supabaseAdmin.from("audit_log").insert({
      table_name: "case_track_results", record_id: id, action: "UPDATE",
      actor_id: userId, actor_type: "admin", new_value: { blocked: "banned_language", violations },
    });
    return NextResponse.json({ error: "banned_language", violations }, { status: 422 });
  }

  // H1 — pin the attempt that passed the banned-language gate; publishing resolves any pending
  // re-investigation flag (the founder has now explicitly adopted the latest investigation).
  const attempt = rows.length ? Math.max(...rows.map((r) => r.attempt_number ?? 1)) : 1;
  const update: Record<string, unknown> = {
    status: "delivered", delivered_at: now, delivered_attempt: attempt,
    reinvestigation_pending: false, internal_notes: JSON.stringify(decision),
  };
  if (action === "override") {
    update.verdict = body.override_verdict;
    await supabaseAdmin.from("audit_log").insert({
      table_name: "cases", record_id: id, action: "UPDATE",
      actor_id: userId, actor_type: "admin",
      old_value: { verdict: c.verdict }, new_value: { verdict: body.override_verdict, decision },
    });
  }

  const { error } = await supabaseAdmin.from("cases").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // H5 addendum — echo the case identity so the UI success toast can name WHICH report delivered.
  return NextResponse.json({ ok: true, delivered: true, case_number: c.case_number, delivered_attempt: attempt });
}
