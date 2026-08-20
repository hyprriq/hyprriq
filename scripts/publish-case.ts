// ── OPERATOR PUBLISH HARNESS (2026-08-20, full-authority session) ────────────────────────────
//
// Publishes operator-house cases through EXACTLY the route's delivery path: the shared
// composePublishGate (one gate, one definition — the route and the preflight consume the same
// function), the deliverability precondition, then the route's own writes — status/delivered_at/
// delivered_attempt, seedCaseOutcome, and the REPORT_PDF_EVENT enqueue that drives the render →
// store → email chain on the deployed Inngest worker.
//
// ⚠ OPERATOR-HOUSE CASES ONLY, enforced below — a real client's delivery goes through the admin
// UI, where a human presses the button. This harness exists because operator-house proofs have no
// UI operator behind them in an autonomous session. Every write is audited under an honest actor.
//
//   CASES=AWI-2608-039 npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local scripts/publish-case.ts          # gate + plan only
//   CASES=AWI-2608-039 ... scripts/publish-case.ts --publish                                                                              # deliver
import { supabaseAdmin } from "@/lib/supabase/admin";
import { inngest } from "@/lib/inngest/client";
import { getCaseTrackResults } from "@/lib/data/track-results";
import { getCaseIntelligence } from "@/lib/data/synthesis";
import { getProseOverrides } from "@/lib/data/proseOverrides";
import { composePublishGate } from "@/lib/portal/publishGate";
import { checkDeliverable } from "@/lib/research/deliverability";
import { seedCaseOutcome } from "@/lib/data/outcomes";
import { OPERATOR_HOUSE_CLIENT_ID } from "@/lib/data/operatorCase";
import { REPORT_PDF_EVENT, type ReportPdfEvent } from "@/lib/inngest/events";
import type { PlanType } from "@/lib/constants/plans";

const ACTOR = "claude-fable-5-session-2026-08-20";
const LIVE = process.argv.includes("--publish");
const ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? "https://hyprriq-git-staging-hyprrx-hyprriq.vercel.app";

async function main() {
  const wanted = (process.env.CASES ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!wanted.length) { console.error("usage: CASES=AWI-...[,AWI-...] scripts/publish-case.ts [--publish]"); process.exit(1); }

  const { data: cases } = await supabaseAdmin
    .from("cases")
    .select("id, case_number, status, verdict, plan_type, client_id, supplier_identity, delivered_attempt, additional_questions")
    .in("case_number", wanted);

  let failures = 0;
  for (const c of (cases ?? []) as unknown as {
    id: string; case_number: string; status: string; verdict: string | null; plan_type: PlanType;
    client_id: string | null; supplier_identity: { identity_discrepancy?: { client_note?: string } | null } | null;
    delivered_attempt: number | null; additional_questions: { question?: unknown; source?: string }[] | null;
  }[]) {
    console.log(`\n══ ${c.case_number} (${c.plan_type}) — ${c.status}`);
    if (c.client_id !== OPERATOR_HOUSE_CLIENT_ID) {
      console.log("  ⛔ NOT operator-house — this harness never publishes a real client's case. Skipped.");
      failures++;
      continue;
    }
    if (c.status === "delivered" || c.status === "complete") {
      console.log("  · already delivered — skipped.");
      continue;
    }

    const rows = await getCaseTrackResults(c.id);
    const deliverAttempt = rows.length ? Math.max(...rows.map((r) => r.attempt_number ?? 1)) : 1;
    const intel = await getCaseIntelligence(c.id, deliverAttempt);
    const identityNote = c.supplier_identity?.identity_discrepancy?.client_note ?? null;
    const overrides = await getProseOverrides(c.id, deliverAttempt);

    const notDeliverable = checkDeliverable({
      attempt: deliverAttempt, rows, synthesis: intel?.synthesis ?? null, synthesisAttempt: intel?.attempt ?? null,
      planType: c.plan_type, verdict: c.verdict ?? null,
      deliveredAttempt: c.delivered_attempt ?? null, verdictIsExplicit: false,
    });
    if (notDeliverable.length) { console.log(`  ✗ not deliverable: ${notDeliverable.join("; ")}`); failures++; continue; }

    const gate = composePublishGate({
      rows, synthesis: intel?.synthesis ?? null, identityNote, overrides,
      additionalQuestions: c.additional_questions ?? [],
    });
    if (gate.overlayFailures.length) { console.log(`  ✗ override(s) not applied: ${gate.overlayFailures.join(" · ")}`); failures++; continue; }
    if (gate.violations.length) { console.log(`  ✗ gate blocks (${gate.violations.length}): ${gate.violations.join(" · ")}`); failures++; continue; }
    if (gate.tokenLeaks.length) { console.log(`  ✗ token checkpoint refuses (${gate.tokenLeaks.length})`); failures++; continue; }
    console.log(`  ✓ gate clean (attempt ${deliverAttempt}${overrides.length ? `, ${overrides.length} override(s) applied` : ""})`);

    if (!LIVE) { console.log("  · DRY — would deliver + enqueue the PDF render. Pass --publish."); continue; }

    const now = new Date().toISOString();
    const decision = { action: "publish", reason: null, notes: "operator-house proof publish", reviewed_by: ACTOR, at: now };
    const { error } = await supabaseAdmin.from("cases").update({
      status: "delivered", delivered_at: now, delivered_attempt: deliverAttempt,
      reinvestigation_pending: false, internal_notes: JSON.stringify(decision),
    }).eq("id", c.id);
    if (error) { console.log(`  ✗ delivery write failed: ${error.message}`); failures++; continue; }
    await supabaseAdmin.from("audit_log").insert({
      table_name: "cases", record_id: c.id, action: "UPDATE",
      actor_id: ACTOR, actor_type: "admin", new_value: { decision, delivered_attempt: deliverAttempt },
    });

    const seeded = await seedCaseOutcome(c.id, c.verdict ?? "pending");
    if (seeded.error) console.log(`  ⚠ outcome seed failed (non-fatal, as in the route): ${seeded.error}`);

    try {
      await inngest.send({ name: REPORT_PDF_EVENT, data: { case_id: c.id, attempt: deliverAttempt, origin: ORIGIN } satisfies ReportPdfEvent });
      console.log(`  ✔ DELIVERED (attempt ${deliverAttempt}) — PDF render enqueued to the deployed worker`);
    } catch (e) {
      await supabaseAdmin.from("audit_log").insert({
        table_name: "cases", record_id: c.id, action: "UPDATE",
        actor_id: ACTOR, actor_type: "admin",
        new_value: { report_pdf_enqueue_failed: e instanceof Error ? e.message : "enqueue failed" },
      });
      console.log(`  ⚠ DELIVERED, but the PDF enqueue failed (audited): ${e instanceof Error ? e.message : e}`);
    }
  }
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
