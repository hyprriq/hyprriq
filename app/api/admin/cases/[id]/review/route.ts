import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { inngest } from "@/lib/inngest/client";
import { getCaseTrackResults } from "@/lib/data/track-results";
import { scanFindingsForBannedLanguage } from "@/lib/utils/banned-language";
import { locateBannedLanguage, summariseHits } from "@/lib/utils/bannedLanguageReport";
import { checkDeliverable } from "@/lib/research/deliverability";
import type { PlanType } from "@/lib/constants/plans";
import { getOperator, can } from "@/lib/auth/permissions";
import { caseInScope } from "@/lib/auth/clientScope";
import { scanSynthesisAtDelivery, scanTrackProseAtDelivery } from "@/lib/research/synthesisMethodScan";
import { scanCategoryAtDelivery } from "@/lib/research/categoryLanguage";
import {
  cleanClientFindingJson, cleanClientProse, cleanClientProseDeep,
  projectClientReport, projectFindingJsonForClient,
} from "@/lib/portal/clientReport";
import { findInternalTokens } from "@/lib/portal/clientTokenCheckpoint";
import { locateSynthesisMethodLeakage, locateMethodLeakage } from "@/lib/research/methodScanReport";
import { getCaseIntelligence } from "@/lib/data/synthesis";
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
  // ADMIN BATCH — capability layer over the legacy isAdmin gate: publish/override need
  // review_publish; the re-run action needs rerun. (Transitional founder role passes both.)
  // CLIENT PARTITIONING (2026-08-02): scoped operators only review assigned clients' cases.
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
  const violations = [...new Set([
    ...rows.flatMap((r) => scanFindingsForBannedLanguage(r.compiled_findings_json)),
    ...rows.flatMap((r) => scanFindingsForBannedLanguage(r.questions_to_ask)),
    ...scanFindingsForBannedLanguage(identityNote ? { client_note: identityNote } : null),
    ...(intel ? scanFindingsForBannedLanguage({ decision_snapshot: intel.synthesis.module_9_decision_snapshot, vendor_questions: intel.synthesis.module_8_vendor_questions }) : []),
    ...(intel ? scanSynthesisAtDelivery(intel.synthesis) : []),
    // CLASS 4 (founder-ruled 2026-08-18) — the derivation scanner now covers TRACK prose too. It
    // has always covered synthesis while the language scanner covered both; a scanner covering one
    // of two client-facing surfaces is the defect, not the coverage. Cases that block on this today
    // were passing the gate before because nothing looked, not because they were clean.
    ...scanTrackProseAtDelivery(rows),
    // §2 (founder-ruled 2026-08-18) — the category scanner JOINS the delivery composition.
    // It ran at GENERATION ONLY while `category` and `brand_category_note` are LLM-written and
    // reach a client. It lands inside this merged set, never as a fourth scanner beside it.
    ...scanCategoryAtDelivery(rows),
  ])];
  if (violations.length > 0) {
    // ── "SHOW + FIX" piece 1 (founder-ruled 2026-08-17). The gate's DECISION is untouched — the
    // block above is computed exactly as before and still blocks. What changes is what the operator
    // is handed: until now this returned a bare label ("prohibited language: confirms/certifies
    // authorization") with no sentence, no field and no track, so the only ways past a blocked
    // publish were a code deploy or a full case re-run — with a paying client waiting. The locator
    // re-walks the SAME structures, keeps the path, and localises each label to its sentence.
    // (A label with no finding — e.g. from the derivation-rule method scanner, which reads
    // different fields — still ships in `violations`, so nothing is ever silently dropped.)
    const findings = [
      ...rows.flatMap((r) => locateBannedLanguage(r.compiled_findings_json, r.track_key)),
      ...rows.flatMap((r) => locateBannedLanguage(r.questions_to_ask, `${r.track_key} (questions)`)),
      ...locateBannedLanguage(identityNote ? { client_note: identityNote } : null, "supplier identity"),
      ...(intel ? locateBannedLanguage({
        decision_snapshot: intel.synthesis.module_9_decision_snapshot,
        vendor_questions: intel.synthesis.module_8_vendor_questions,
      }, "synthesis") : []),
      // TWO SCANNERS, ONE WORKLIST (founder-ruled 2026-08-17). The derivation-rule scanner is the
      // OTHER half of this gate and until now returned a label with no sentence — which is why
      // AWI-2608-034 sat held with no actionable diagnosis. Same BannedHit shape, so it lands in
      // the same array and the blocked-publish panel renders it with no change.
      ...(intel ? locateSynthesisMethodLeakage(intel.synthesis) : []),
      // Class 4 gets a sentence too — a label with no sentence is what held AWI-2608-034 with no
      // actionable diagnosis, and shipping the coverage without the locator would repeat it.
      ...rows.flatMap((r) =>
        locateMethodLeakage(
          {
            [r.track_key]: r.compiled_findings_json
              ? projectFindingJsonForClient(r.compiled_findings_json as Record<string, unknown>, r.track_key)
              : null,
            [`${r.track_key} (questions)`]: r.questions_to_ask ?? null,
          },
          r.track_key,
        ),
      ),
    ];
    await supabaseAdmin.from("audit_log").insert({
      table_name: "case_track_results", record_id: id, action: "UPDATE",
      actor_id: userId, actor_type: "admin",
      new_value: { blocked: "banned_language", violations, located: summariseHits(findings) },
    });
    return NextResponse.json({ error: "banned_language", violations, findings }, { status: 422 });
  }

  // ── THE PRESENCE CHECKPOINT (founder-ruled 2026-08-18) — THE REFUSING ENFORCEMENT POINT.
  //
  // ⚠ IT SCANS THE PROJECTED PAYLOAD, NOT `rows`. THIS IS THE OPPOSITE SIDE FROM EVERY GATE ABOVE
  // AND IT IS DELIBERATE. The banned-language and derivation scanners read RAW findings, which is
  // correct for them: cleaning only removes, so raw is a superset of projected. For internal
  // tokens it INVERTS — raw ALWAYS legitimately carries `src_N` (the operator's ruled
  // source-checking leverage), so this same assertion built on `rows` would refuse every case on
  // day one. Two gates, two surfaces, pinned on purpose. Do not "tidy" them onto one walk: that is
  // the same defect class as the census/attempt skew, two instruments not pinned to the same thing.
  //
  // The payload below is composed the way the CLIENT surfaces compose it (lib/data/cases.ts
  // getCaseFindings and lib/pdf/renderReportPdf.ts), so what is asserted here is what ships.
  const projectedForClient = {
    findings: rows.map((r) => ({
      compiled_findings_json: r.compiled_findings_json
        ? cleanClientFindingJson(
            projectFindingJsonForClient(r.compiled_findings_json as Record<string, unknown>, r.track_key),
            r.track_key,
          )
        : null,
      questions_to_ask: cleanClientProseDeep(r.questions_to_ask),
    })),
    // `client_notes` are IN SCOPE by ruling.
    client_note: identityNote ? cleanClientProse(identityNote) : null,
    report: intel
      ? projectClientReport(
          (intel.synthesis.module_9_decision_snapshot ?? null) as unknown as Record<string, unknown> | null,
          intel.synthesis.module_8_vendor_questions,
          ((c as { additional_questions?: { question?: unknown; source?: string }[] | null }).additional_questions) ?? [],
        )
      : null,
  };
  const tokenLeaks = findInternalTokens(projectedForClient);
  if (tokenLeaks.length > 0) {
    await supabaseAdmin.from("audit_log").insert({
      table_name: "case_track_results", record_id: id, action: "UPDATE",
      actor_id: userId, actor_type: "admin",
      new_value: { blocked: "internal_tokens", count: tokenLeaks.length, found: tokenLeaks.slice(0, 20) },
    });
    return NextResponse.json({
      error: "internal_tokens",
      count: tokenLeaks.length,
      findings: tokenLeaks,
      message:
        `Publish refused: ${tokenLeaks.length} internal reference(s) are present in the payload this client would receive. ` +
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
      await inngest.send({ name: REPORT_PDF_EVENT, data: { case_id: id, attempt } satisfies ReportPdfEvent });
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
