import { supabaseAdmin } from "@/lib/supabase/admin";
import { getClientDecisionSnapshot } from "@/lib/data/synthesis";
import { projectClientReport } from "@/lib/portal/clientReport";
import { getCaseTrackResults } from "@/lib/data/track-results";
import { buildClientFindings } from "@/lib/admin/reviewView";
import { deepStrings } from "@/lib/portal/deepStrings";

// ── A-TOKEN CENSUS (founder-locked 2026-08-22, item 1a: MEASURE BEFORE RULING).
// Runs the REAL client projection for every case and reports which A-NN markers SURVIVE it —
// i.e. what would actually reach a client surface — separated from what the cleaner already
// removes. Read-only: no writes, no engine calls, no cost.

// ITEM 1c — the CLASS, not just A-NN. Every internal marker vocabulary observed in engine prose.
// RG-NN was found by reading the corpus, not by imagining shapes: it appears alongside A/E ids
// ("A10, RG-02" / "E8, A5, RG-002") and is in NEITHER the grouped nor the bare stripper
// vocabulary — so it defeats a citation group exactly as the A tokens once did.
const MARKERS: { name: string; re: RegExp }[] = [
  { name: "A-NN", re: /(?<![A-Za-z0-9-])A\d{2}(?![0-9])/g },
  { name: "RG-N", re: /(?<![A-Za-z0-9-])RG-?\d{1,3}(?![0-9])/gi },
  { name: "M-module", re: /(?<![A-Za-z0-9-])M\d(?![0-9])/g },
  { name: "hypothesis-tag", re: /\[(?:leading|alternative) hypothesis[^\]]*\]/gi },
];

async function main() {
  const { data: cases } = await supabaseAdmin
    .from("cases")
    .select("id, case_number, status, delivered_attempt")
    .is("deleted_at", null)
    .order("case_number");

  let scanned = 0, casesWithSurviving = 0, totalSurviving = 0, noSnapshot = 0;
  const rows: string[] = [];

  for (const c of cases ?? []) {
    scanned++;
    // ⚠ INSTRUMENT CORRECTION (2026-08-22): the first draft read case_synthesis with
    // .maybeSingle(), which ERRORS on the 20 cases holding multiple attempts — producing a
    // FALSE ZERO. This uses the PRODUCTION reader, which pins the delivered attempt and applies
    // prose overrides, so the census measures exactly what the client path renders.
    const snap = await getClientDecisionSnapshot(c.id);
    if (!snap) noSnapshot++;

    const report = projectClientReport(
      (snap?.decision_snapshot ?? null) as Record<string, unknown> | null,
      snap?.vendor_questions as never, [],
    );

    let findings: unknown = [];
    try {
      const raw = await getCaseTrackResults(c.id, c.delivered_attempt ?? undefined);
      findings = buildClientFindings(raw, { allowInternalTokens: true });
    } catch { /* not all cases have rows */ }

    const hits: { path: string; match: string; excerpt: string }[] = [];
    for (const payload of [{ n: "report", v: report as unknown }, { n: "findings", v: findings }]) {
      for (const { path, value } of deepStrings(payload.v)) {
        for (const { name, re } of MARKERS)
        for (const m of value.matchAll(re)) {
          hits.push({
            path: `${payload.n}.${path}`, match: `${name}:${m[0]}`,
            excerpt: value.slice(Math.max(0, (m.index ?? 0) - 55), (m.index ?? 0) + 55).replace(/\s+/g, " ").trim(),
          });
        }
      }
    }
    if (hits.length) {
      casesWithSurviving++; totalSurviving += hits.length;
      rows.push(`\n${c.case_number} [${c.status}] — ${hits.length} surviving`);
      for (const h of hits.slice(0, 6)) rows.push(`   ${h.match}  @ ${h.path}\n      …${h.excerpt}…`);
      if (hits.length > 6) rows.push(`   …and ${hits.length - 6} more`);
    }
  }

  console.log(`\n=== A-NN CENSUS — POST-PROJECTION (what would reach a client) ===`);
  console.log(`cases scanned:                 ${scanned}`);
  console.log(`cases with NO snapshot:        ${noSnapshot}  (nothing to project — not a clean result)`);
  console.log(`cases with surviving A-NN:     ${casesWithSurviving}`);
  console.log(`total surviving occurrences:   ${totalSurviving}`);
  console.log(rows.join("\n"));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
