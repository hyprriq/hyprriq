// ── DELIVERED-CASE SWEEP (founder-ruled 2026-08-18, audit option (b)) — READ-ONLY, zero API cost.
//
// WHY THIS EXISTS: `checkDeliverable` is a PUBLISH-TIME precondition. It was built on 2026-08-17,
// which means every case delivered BEFORE that date was published without it — and one of them,
// AWI-2606-001, is delivered with `delivered_attempt = 1` while its only synthesis row sits at
// attempt 2. Its client surface therefore renders the fallback headline, no risk statement, no
// checklist and no honesty section: a report that stopped being renderable and told nobody.
//
// A precondition that only runs at publish cannot see that. This sweep applies TODAY's rules to
// reports ALREADY in clients' portals and names the ones that would fail now. It writes nothing —
// remediation is a founder decision per case, not a script's.
//
//   npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local scripts/delivered-sweep.ts
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCaseTrackResults } from "@/lib/data/track-results";
import { getCaseIntelligence, getClientDecisionSnapshot } from "@/lib/data/synthesis";
import { checkDeliverable } from "@/lib/research/deliverability";
import { projectClientReport } from "@/lib/portal/clientReport";
import type { PlanType } from "@/lib/constants/plans";

type Row = {
  id: string; case_number: string; status: string; plan_type: PlanType | null;
  verdict: string | null; delivered_attempt: number | null; delivered_at: string | null;
};

async function main() {
  const { data } = await supabaseAdmin
    .from("cases")
    .select("id, case_number, status, plan_type, verdict, delivered_attempt, delivered_at")
    .in("status", ["delivered", "complete"])
    .is("deleted_at", null)
    .order("delivered_at", { ascending: true });

  const cases = (data as Row[]) ?? [];
  console.log(`DELIVERED-CASE SWEEP — ${cases.length} delivered case(s), against today's preconditions\n`);

  let failing = 0;
  let blankReport = 0;

  for (const c of cases) {
    if (!c.plan_type) { console.log(`· ${c.case_number}: no plan_type — cannot evaluate`); continue; }

    // Read exactly what the CLIENT is pinned to — `delivered_attempt`, not "latest".
    const attempt = c.delivered_attempt ?? 1;
    const rows = await getCaseTrackResults(c.id, attempt);
    const intel = await getCaseIntelligence(c.id, attempt);

    const missing = checkDeliverable({
      attempt,
      rows,
      synthesis: intel?.synthesis ?? null,
      synthesisAttempt: intel?.attempt ?? null,
      planType: c.plan_type,
      verdict: c.verdict,
      // A delivered case is being measured AT its own pin, so provenance is satisfied by
      // construction — this sweep asks "is it still readable", not "was it adopted".
      deliveredAttempt: attempt,
      verdictIsExplicit: false,
    });

    // What the client's page ACTUALLY resolves. getClientReport returns null when the snapshot
    // read finds nothing at the pinned attempt — the page then renders its fallback headline and
    // silently drops the risk statement, the checklist and the honesty section.
    const snap = await getClientDecisionSnapshot(c.id);
    const report = projectClientReport(
      (snap?.decision_snapshot ?? null) as Record<string, unknown> | null,
      snap?.vendor_questions ?? [],
      [],
    );

    const surface: string[] = [];
    if (!report) surface.push("NO DECISION SNAPSHOT — client sees the fallback headline only");
    else {
      if (!report.headline) surface.push("no headline (stub or too short) — fallback rendered");
      if (!report.the_real_risk) surface.push("no risk statement — that section does not render");
      if (report.questions.length === 0) surface.push("no checklist tab");
      if (!report.leading_interpretation && report.what_to_monitor.length === 0) surface.push("no honesty section");
    }

    if (missing.length === 0 && surface.length === 0) {
      console.log(`✔ ${c.case_number} (attempt ${attempt}) — passes today's gate, full client surface`);
      continue;
    }
    failing++;
    if (!report) blankReport++;
    console.log(`\n✘ ${c.case_number} — delivered ${c.delivered_at?.slice(0, 10)} at attempt ${attempt}`);
    for (const m of missing) console.log(`    GATE:    ${m}`);
    for (const s of surface) console.log(`    CLIENT:  ${s}`);
  }

  console.log(`\n── ${failing} of ${cases.length} delivered case(s) would not pass today; ${blankReport} render no Decision Snapshot at all.`);
  console.log("Nothing was written. Remediation is per-case and founder-ruled.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
