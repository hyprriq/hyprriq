// ── PUBLISH PREFLIGHT — READ-ONLY. Runs EXACTLY what the publish route runs, without publishing.
//
// WHY: the four-tier run produced four cases that were never published, so nothing downstream of
// publish could be observed. Pressing publish and reading the toast is a slow way to discover a
// gate block. This composes the route's own checks — deliverability, the merged violation set, and
// the presence checkpoint over the projected payload — and prints the verdict per case.
//
// It is the publish route's composition, not a re-implementation: if the route's set changes and
// this is not updated, the two disagree, which is the defect class this codebase keeps hitting.
//
//   npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local scripts/publish-preflight.ts
//   CASES=AWI-2608-035,AWI-2608-036 npx tsx ... scripts/publish-preflight.ts
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCaseTrackResults } from "@/lib/data/track-results";
import { getCaseIntelligence } from "@/lib/data/synthesis";
import { checkDeliverable } from "@/lib/research/deliverability";
import { scanFindingsForBannedLanguage } from "@/lib/utils/banned-language";
import { scanSynthesisAtDelivery, scanTrackProseAtDelivery } from "@/lib/research/synthesisMethodScan";
import { scanCategoryAtDelivery } from "@/lib/research/categoryLanguage";
import {
  cleanClientFindingJson, cleanClientProse, cleanClientProseDeep,
  projectClientReport, projectFindingJsonForClient,
} from "@/lib/portal/clientReport";
import { findInternalTokens } from "@/lib/portal/clientTokenCheckpoint";
import { reportObjectKey } from "@/lib/pdf/reportStorage";
import { OPERATOR_HOUSE_CLIENT_ID } from "@/lib/data/operatorCase";
import type { PlanType } from "@/lib/constants/plans";

async function main() {
  const wanted = (process.env.CASES ?? "AWI-2608-035,AWI-2608-036,AWI-2608-037,AWI-2608-038").split(",").map((s) => s.trim());
  const { data: cases } = await supabaseAdmin
    .from("cases")
    .select("id, case_number, plan_type, status, verdict, client_id, supplier_identity, delivered_attempt, clients(email, full_name, company_name)")
    .in("case_number", wanted);

  console.log("PUBLISH PREFLIGHT — what the publish route will do, without publishing\n");

  for (const c of (cases ?? []) as unknown as {
    id: string; case_number: string; plan_type: PlanType; status: string; verdict: string | null;
    client_id: string | null; supplier_identity: { identity_discrepancy?: { client_note?: string } | null } | null;
    delivered_attempt: number | null; clients: { email: string | null; full_name: string | null; company_name: string | null } | null;
  }[]) {
    console.log(`══ ${c.case_number} (${c.plan_type}) — status ${c.status}`);

    const rows = await getCaseTrackResults(c.id);
    const attempt = rows.length ? Math.max(...rows.map((r) => r.attempt_number ?? 1)) : 1;
    const intel = await getCaseIntelligence(c.id, attempt);
    const identityNote = c.supplier_identity?.identity_discrepancy?.client_note ?? null;

    // 1 ── DELIVERABILITY
    const notDeliverable = checkDeliverable({
      attempt, rows, synthesis: intel?.synthesis ?? null, synthesisAttempt: intel?.attempt ?? null,
      planType: c.plan_type, verdict: c.verdict ?? null,
      deliveredAttempt: c.delivered_attempt ?? null, verdictIsExplicit: false,
    });
    console.log(notDeliverable.length ? `  ✗ NOT DELIVERABLE: ${notDeliverable.join("; ")}` : `  ✓ deliverable (attempt ${attempt}, ${rows.length} track rows)`);

    // 2 ── THE MERGED VIOLATION SET, composed as the route composes it.
    const violations = [...new Set([
      ...rows.flatMap((r) => scanFindingsForBannedLanguage(r.compiled_findings_json)),
      ...rows.flatMap((r) => scanFindingsForBannedLanguage(r.questions_to_ask)),
      ...scanFindingsForBannedLanguage(identityNote ? { client_note: identityNote } : null),
      ...(intel ? scanFindingsForBannedLanguage({ decision_snapshot: intel.synthesis.module_9_decision_snapshot, vendor_questions: intel.synthesis.module_8_vendor_questions }) : []),
      ...(intel ? scanSynthesisAtDelivery(intel.synthesis) : []),
      ...scanTrackProseAtDelivery(rows),
      ...scanCategoryAtDelivery(rows),
    ])];
    console.log(violations.length ? `  ✗ GATE BLOCKS (${violations.length}): ${violations.slice(0, 6).join(" · ")}` : "  ✓ gate clean");

    // 3 ── THE PRESENCE CHECKPOINT over the projected payload.
    const projected = {
      findings: rows.map((r) => ({
        compiled_findings_json: r.compiled_findings_json
          ? cleanClientFindingJson(projectFindingJsonForClient(r.compiled_findings_json as Record<string, unknown>, r.track_key), r.track_key, { allowInternalTokens: true })
          : null,
        questions_to_ask: cleanClientProseDeep(r.questions_to_ask),
      })),
      client_note: identityNote ? cleanClientProse(identityNote) : null,
      report: intel ? projectClientReport((intel.synthesis.module_9_decision_snapshot ?? null) as unknown as Record<string, unknown> | null, intel.synthesis.module_8_vendor_questions, [], { allowInternalTokens: true }) : null,
    };
    const leaks = findInternalTokens(projected);
    console.log(leaks.length ? `  ✗ TOKEN CHECKPOINT REFUSES (${leaks.length}): ${leaks.slice(0, 3).map((l) => `${l.match}@${l.path}`).join(" · ")}` : "  ✓ checkpoint clean");

    // 4 ── WHAT HAPPENS AFTER A SUCCESSFUL PUBLISH
    const name = c.clients?.full_name?.trim() || c.clients?.company_name?.trim();
    console.log(`  → PDF key: ${c.client_id ? reportObjectKey(c.client_id, c.case_number, attempt) : "(no client)"}`);
    console.log(`  → PDF render: ${name ? `✓ client name "${name}"` : "✗ no_client_name — WILL REFUSE"}`);
    console.log(
      c.client_id === OPERATOR_HOUSE_CLIENT_ID
        ? "  → delivery email: SKIPPED (operator_house) — an operator-run case NEVER emails, by ruling"
        : `  → delivery email: ${c.clients?.email ? `to ${c.clients.email}` : "✗ no recipient"}`,
    );
    console.log();
  }
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
