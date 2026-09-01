import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { inngest } from "@/lib/inngest/client";
import { getCaseTrackResults } from "@/lib/data/track-results";
import { summariseHits } from "@/lib/utils/bannedLanguageReport";
import { checkDeliverable } from "@/lib/research/deliverability";
import type { PlanType } from "@/lib/constants/plans";
import { getOperator, can } from "@/lib/auth/permissions";
import { caseInScope } from "@/lib/auth/clientScope";
import { getCaseIntelligence } from "@/lib/data/synthesis";
import { getProseOverrides } from "@/lib/data/proseOverrides";
import { composePublishGate } from "@/lib/portal/publishGate";
import { seedCaseOutcome } from "@/lib/data/outcomes";
import { REPORT_PDF_EVENT, type ReportPdfEvent } from "@/lib/inngest/events";

// Phase 4 — Founder Decision. The Intelligence Engine reaches report-ready autonomously; review is
// OPTIONAL, never required. This route records the founder's decision on the engine's output:
//   publish               — deliver the engine's report + verdict as-is
//   override              — supersede the verdict (requires override_verdict + reason), then deliver
//   request_investigation — send the case back for more evidence (no delivery)
// The banned-language gate stays on every delivery path.

const VALID_VERDICTS = ["source_clear", "usable_with_conditions", "verify_before_purchase", "do_not_rely"];
type Action = "publish" | "override" | "request_investigation";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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
  // ── AUTHORISATION — getOperator IS THE ONE NOTION (defect fixed 2026-09-01) ───────────────
  //
  // ⛔ THIS ROUTE USED TO OPEN WITH A SECOND, LEGACY GATE that read `clients.role` directly and
  // refused anything whose clients row said "client". IT 403'd THE SUPER ADMIN, and publish is the
  // only step between a finished case and a client receiving it, so it blocked the product.
  //
  // WHY IT REFUSED, and it was never about capabilities: the founder's own identity ruling says
  // "roles live on their OWN identities — never on client rows". admin_permissions therefore
  // carries role=super_admin, and the clients row correctly says role=client. The legacy gate read
  // the wrong table, so the MORE correct the data was, the harder it refused.
  //
  // ⚠ AND IT PASSED FOR YEARS ON AN ACCIDENT. The identity that published every case through this
  // route (9 of them, 2026-06-20 to 2026-08-20) is an OLDER Clerk user whose clients row still
  // holds the pre-ruling role='founder'. A second identity for the SAME PERSON, created under the
  // ruling, could never publish. The route did not break on 24 August; it only ever worked for a
  // row shape the ruling forbids creating again.
  //
  // getOperator() reads admin_permissions AND already carries the legacy clients.role fallback
  // inside it, so nothing is lost by deleting the duplicate — the notions go from two to one, the
  // fix the dev tools took on 2026-07-30 and this route missed.
  //
  // What still refuses, and is strictly stronger than what was removed: publish/override need the
  // review_publish capability, re-run needs rerun, and a scoped operator only reaches assigned
  // clients' cases. A non-operator gets op=null, and can(null, …) is false.
  {
    const op = await getOperator(userId);
    const needed = action === "request_investigation" ? "rerun" : "review_publish";
    if (!can(op, needed)) return NextResponse.json({ error: `forbidden: requires ${needed}` }, { status: 403 });
    if (!(await caseInScope(op, id))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (action === "override" && (!body.override_verdict || !VALID_VERDICTS.includes(body.override_verdict))) {
    return NextResponse.json({ error: "Select a valid verdict to override.", message: "Select a valid verdict to override." }, { status: 400 });
  }
  if ((action === "override" || action === "request_investigation") && !body.reason?.trim()) {
    return NextResponse.json({ error: "reason_required", message: "A reason is required." }, { status: 400 });
  }

  const { data: c } = await supabaseAdmin
    .from("cases")
    .select("id, case_number, status, verdict, vendor_name, vendor_website, brands_submitted, brands_confirmed, marketplace, plan_type, supplier_identity, client_id, delivered_attempt")
    .eq("id", id)
    .maybeSingle();
  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const now = new Date().toISOString();
  const decision = { action, reason: body.reason ?? null, notes: body.notes ?? null, reviewed_by: userId, at: now };

  // Request Further Investigation — actually re-drives the pipeline (H2; pre-H2 this set a status
  // nothing consumed). H1 makes the re-run safe: it writes a NEW attempt, never overwriting the
  // prior one. Enqueue FIRST — if the send fails, the status is untouched and the admin is told.
  if (action === "request_investigation") {
    // ASIN threading (tracker §1.3) — best-effort SEPARATE select: the brand_asins column is
    // founder-run-migration-gated; a combined select would 500 every rerun pre-migration.
    let brandAsins: Record<string, string> | null = null;
    {
      const { data: bx, error: bxErr } = await supabaseAdmin
        .from("cases").select("brand_asins").eq("id", id).maybeSingle();
      if (!bxErr) brandAsins = (bx?.brand_asins as Record<string, string> | null) ?? null;
    }
    try {
      await inngest.send({
        name: "pipeline/run-case",
        data: {
          case_id: id, vendor_name: c.vendor_name, vendor_website: c.vendor_website,
          brands_submitted: (c.brands_confirmed as string[] | null) ?? (c.brands_submitted as string[] | null) ?? [],
          marketplace: c.marketplace ?? "amazon_us", plan_type: c.plan_type,
          ...(brandAsins ? { brand_asins: brandAsins } : {}),
        },
      });
    } catch (e) {
      return NextResponse.json({ error: "enqueue_failed", message: `Could not start the re-investigation: ${e instanceof Error ? e.message : "enqueue failed"}` }, { status: 502 });
    }
    await supabaseAdmin.from("audit_log").insert({
      table_name: "cases", record_id: id, action: "UPDATE",
      actor_id: userId, actor_type: "admin", new_value: { decision },
    });
    // F3 (founder-approved 2026-07-14; H1 integrity) — the status pre-flip carries the SAME
    // delivered-guard every other write site has. Without it, the re-run's finalize saw a
    // non-delivered status and overwrote a DELIVERED case's live verdict/status through the
    // normal flow. The enqueue above stays either way: a delivered case gets its genuine new
    // attempt, keeps its frozen record, and finalize raises reinvestigation_pending (H1).
    const { error } = await supabaseAdmin
      .from("cases")
      .update({ status: "research_running", internal_notes: JSON.stringify(decision) })
      .not("status", "in", "(delivered,complete)")
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const frozen = c.status === "delivered" || c.status === "complete";
    return NextResponse.json({
      ok: true, delivered: false, status: frozen ? c.status : "research_running",
      ...(frozen ? { note: "Re-investigation enqueued as a new attempt; the delivered record stays frozen (H1) — reinvestigation_pending will flag when it completes." } : {}),
    });
  }

  // Delivery path (publish | override) — HARD-tier banned-language gate over EVERY client-visible
  // string (H5): compiled findings + client-facing questions + the Spec-B identity client_note.
  // (Assertion-tier advisories are review material on the admin panel, not gated here.)
  const rows = await getCaseTrackResults(id);
  const identityNote =
    ((c as { supplier_identity?: { identity_discrepancy?: { client_note?: string } | null } | null })
      .supplier_identity?.identity_discrepancy?.client_note) ?? null;
  // S-1e (G2, founder-ruled) — the scan now ALSO covers case_synthesis (the B4-EXT named gap,
  // closed): the client columns (M9 snapshot + M8 questions) get the banned-language gate, and
  // the DERIVATION-RULE method scanner runs over them plus M7's rationale/focus — gate names,
  // thresholds, corroboration counts, firewall vocabulary never ship (the Rider-2 leak class).
  // ── ATTEMPT SKEW FIX + DELIVERABILITY PRECONDITION (founder-ruled 2026-08-17, from the incident
  // where a case delivered on a stub attempt: one track row, no synthesis, and it passed the
  // language gate precisely BECAUSE it was empty). The attempt being delivered is resolved FIRST,
  // and everything below is read for THAT attempt — synthesis included. ──
  const deliverAttempt = rows.length ? Math.max(...rows.map((r) => r.attempt_number ?? 1)) : 1;
  const intel = await getCaseIntelligence(id, deliverAttempt);

  // ── THE PUBLISH GATE — ONE COMPOSITION (lib/portal/publishGate.ts), shared byte-identically
  // with scripts/publish-preflight.ts and any operator harness, so "what blocks a publish" has
  // exactly one definition (two hand-kept copies is the scanner/locator drift class). Prose
  // overrides are applied inside it, before every scanner — an override can close a block, and a
  // stored override that does NOT land (stale text, vanished path) refuses the publish here:
  // the one place that must never fail silently (lib/portal/proseOverlay.ts).
  const overrides = await getProseOverrides(id, deliverAttempt);
  const gate = composePublishGate({
    rows,
    synthesis: intel?.synthesis ?? null,
    identityNote,
    overrides,
    additionalQuestions: ((c as { additional_questions?: { question?: unknown; source?: string }[] | null }).additional_questions) ?? [],
  });
  if (gate.overlayFailures.length > 0) {
    await supabaseAdmin.from("audit_log").insert({
      table_name: "case_prose_overrides", record_id: id, action: "UPDATE",
      actor_id: userId, actor_type: "admin",
      new_value: { blocked: "override_not_applied", attempt: deliverAttempt, failures: gate.overlayFailures },
    });
    return NextResponse.json({
      error: "override_not_applied",
      failures: gate.overlayFailures,
      message:
        `Publish refused: ${gate.overlayFailures.length} prose override(s) no longer match the stored text ` +
        `(a re-run or edit moved on). Re-check each and re-save or clear it — an override must never silently not apply.`,
    }, { status: 422 });
  }
  const notDeliverable = checkDeliverable({
    attempt: deliverAttempt,
    rows,
    synthesis: intel?.synthesis ?? null,
    synthesisAttempt: intel?.attempt ?? null,
    planType: c.plan_type as PlanType,
    verdict: (action === "override" ? body.override_verdict : c.verdict) ?? null,
    // VERDICT PROVENANCE (audit 2026-08-18) — a re-investigated delivered case holds attempt-N
    // findings under attempt-M's verdict, because stageFinalize refuses to move the case-level
    // pointer once delivered. An explicit override IS the adoption decision, so it clears the guard.
    deliveredAttempt: (c.delivered_attempt as number | null) ?? null,
    verdictIsExplicit: action === "override",
  });
  if (notDeliverable.length > 0) {
    // Fail LOUD and name what is missing — the same discipline as the language gate.
    await supabaseAdmin.from("audit_log").insert({
      table_name: "cases", record_id: id, action: "UPDATE",
      actor_id: userId, actor_type: "admin",
      new_value: { blocked: "not_deliverable", attempt: deliverAttempt, missing: notDeliverable },
    });
    return NextResponse.json({
      error: "not_deliverable",
      attempt: deliverAttempt,
      missing: notDeliverable,
      message: `This attempt has nothing deliverable: ${notDeliverable.join("; ")}.`,
    }, { status: 422 });
  }
  // "SHOW + FIX" piece 1 (founder-ruled 2026-08-17): the blocked response carries the LOCATED
  // sentences, not bare labels. Scanner + locator + checkpoint all live in composePublishGate —
  // their lockstep history (the 16-vs-3 over-report, the two-surfaces-two-gates law) is recorded
  // there, once.
  if (gate.violations.length > 0) {
    await supabaseAdmin.from("audit_log").insert({
      table_name: "case_track_results", record_id: id, action: "UPDATE",
      actor_id: userId, actor_type: "admin",
      new_value: { blocked: "banned_language", violations: gate.violations, located: summariseHits(gate.findings) },
    });
    // `attempt` rides along so the blocked panel's reword affordance can save an override against
    // the exact attempt the gate evaluated — overrides are per-attempt by design.
    return NextResponse.json({ error: "banned_language", violations: gate.violations, findings: gate.findings, attempt: deliverAttempt }, { status: 422 });
  }

  // THE PRESENCE CHECKPOINT (founder-ruled 2026-08-18) — over the PROJECTED payload, deliberately
  // the opposite surface from the raw-reading scanners (see publishGate.ts; do not merge them).
  if (gate.tokenLeaks.length > 0) {
    await supabaseAdmin.from("audit_log").insert({
      table_name: "case_track_results", record_id: id, action: "UPDATE",
      actor_id: userId, actor_type: "admin",
      new_value: { blocked: "internal_tokens", count: gate.tokenLeaks.length, found: gate.tokenLeaks.slice(0, 20) },
    });
    return NextResponse.json({
      error: "internal_tokens",
      count: gate.tokenLeaks.length,
      findings: gate.tokenLeaks,
      message:
        `Publish refused: ${gate.tokenLeaks.length} internal reference(s) are present in the payload this client would receive. ` +
        `This is a BACKSTOP, not a style check — a token here means a cleaner missed a shape nobody had seen. ` +
        `Fix it in the projection (lib/portal/clientReport.ts) and re-run; do not strip it at the render site.`,
    }, { status: 422 });
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

  // H6 — outcomes ground truth: every delivery seeds/refreshes its case_outcomes row with the
  // verdict the client received (post-override). Loud-but-non-fatal: delivery already happened.
  const finalVerdict = action === "override" ? (body.override_verdict as string) : ((c.verdict as string) ?? "pending");
  const seeded = await seedCaseOutcome(id, finalVerdict);
  if (seeded.error) {
    await supabaseAdmin.from("audit_log").insert({
      table_name: "case_outcomes", record_id: id, action: "UPDATE",
      actor_id: userId, actor_type: "admin", new_value: { outcome_seed_failed: seeded.error },
    });
  }

  // ── §4 — THE DELIVERY EMAIL MOVED OUT OF THIS ROUTE (founder-ruled sequencing (a), 2026-08-19).
  //
  // It used to send here, synchronously. Under the ruled sequencing the email must carry the PDF,
  // and the PDF is rendered by an Inngest job — so sending here would either BLOCK PUBLISH on a
  // Chromium render (forbidden: publish is never delayed) or send "your report is ready" with no
  // attachment while the attachment was still being made. The job now owns BOTH: it renders,
  // stores, and then sends the email — with the PDF when the render succeeded, without it when it
  // permanently failed. The operator-house skip and the audit record moved with it.
  //
  // ⛔ LOUD-BUT-NON-FATAL, exactly like seedCaseOutcome above: the case is ALREADY delivered. A
  // failed enqueue is audited and the response still reports success, because the delivery is real
  // whether or not the artifact job started. Never roll back, never fail the publish.
  {
    try {
      await inngest.send({ name: REPORT_PDF_EVENT, data: { case_id: id, attempt, origin: new URL(req.url).origin } satisfies ReportPdfEvent });
    } catch (e) {
      await supabaseAdmin.from("audit_log").insert({
        table_name: "cases", record_id: id, action: "UPDATE",
        actor_id: userId, actor_type: "admin",
        new_value: { report_pdf_enqueue_failed: e instanceof Error ? e.message : "enqueue failed" },
      });
    }
  }

  // H5 addendum — echo the case identity so the UI success toast can name WHICH report delivered.
  return NextResponse.json({ ok: true, delivered: true, case_number: c.case_number, delivered_attempt: attempt });
}
