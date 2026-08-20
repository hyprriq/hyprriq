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
import { getProseOverrides } from "@/lib/data/proseOverrides";
import { composePublishGate } from "@/lib/portal/publishGate";
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

    const rawRows = await getCaseTrackResults(c.id);
    const attempt = rawRows.length ? Math.max(...rawRows.map((r) => r.attempt_number ?? 1)) : 1;
    const intel = await getCaseIntelligence(c.id, attempt);
    const rawIdentityNote = c.supplier_identity?.identity_discrepancy?.client_note ?? null;

    // THE GATE — the route's own composition, imported, never re-implemented (composePublishGate).
    const overrides = await getProseOverrides(c.id, attempt);
    const gate = composePublishGate({
      rows: rawRows,
      synthesis: intel?.synthesis ?? null,
      identityNote: rawIdentityNote,
      overrides,
      reportOnly: true, // an instrument reports leaks; only the route asserts
    });
    const rows = gate.gateRows;
    if (overrides.length) {
      console.log(
        gate.overlayFailures.length
          ? `  ✗ OVERRIDES NOT APPLIED (${gate.overlayFailures.length}) — publish will refuse: ${gate.overlayFailures.join(" · ")}`
          : `  ✓ ${overrides.length} prose override(s) applied`,
      );
    }

    // 1 ── DELIVERABILITY
    const notDeliverable = checkDeliverable({
      attempt, rows, synthesis: intel?.synthesis ?? null, synthesisAttempt: intel?.attempt ?? null,
      planType: c.plan_type, verdict: c.verdict ?? null,
      deliveredAttempt: c.delivered_attempt ?? null, verdictIsExplicit: false,
    });
    console.log(notDeliverable.length ? `  ✗ NOT DELIVERABLE: ${notDeliverable.join("; ")}` : `  ✓ deliverable (attempt ${attempt}, ${rows.length} track rows)`);

    // 2 ── THE MERGED VIOLATION SET — the gate's own number, printed with the located sentences.
    console.log(
      gate.violations.length
        ? `  ✗ GATE BLOCKS (${gate.violations.length}): ${[...new Set(gate.findings.map((f) => `${f.label} @ ${f.target} › ${f.path}`))].slice(0, 8).join(" · ") || gate.violations.slice(0, 6).join(" · ")}`
        : "  ✓ gate clean",
    );

    // 3 ── THE PRESENCE CHECKPOINT over the projected payload — the gate's own leak list.
    const leaks = gate.tokenLeaks;
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
