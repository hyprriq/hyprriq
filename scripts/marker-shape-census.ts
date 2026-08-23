import { supabaseAdmin } from "@/lib/supabase/admin";
import { getClientDecisionSnapshot } from "@/lib/data/synthesis";
import { projectClientReport } from "@/lib/portal/clientReport";
import { getCaseTrackResults } from "@/lib/data/track-results";
import { buildClientFindings } from "@/lib/admin/reviewView";
import { deepStrings } from "@/lib/portal/deepStrings";

// ── SHAPE CENSUS (item 1a/1c, 2026-08-22): the GENERAL citation shape across every client-bound
// string, classified by context, so the rule is written from the corpus and not from imagination.
// A "citation shape" = 1-3 uppercase letters + optional -/_ + 1-4 digits.
const SHAPE = /(?<![A-Za-z0-9-])[A-Z]{1,3}[-_]?\d{1,4}(?![0-9])/g;

// Shapes that are legitimate client-facing content, not citations. Grown from what the corpus
// actually shows, listed explicitly so the classification is auditable.
const KNOWN_SAFE = /^(?:US|UK|EU|ISO|SKU|UPC|EAN|FDA|SEC|IRS|Q[1-4]|H[12]|COVID)/i;

async function main() {
  const { data: cases } = await supabaseAdmin
    .from("cases").select("id, case_number, status, delivered_attempt")
    .is("deleted_at", null).order("case_number");

  const byShape = new Map<string, { count: number; where: string[] }>();
  let scanned = 0;

  for (const c of cases ?? []) {
    scanned++;
    const snap = await getClientDecisionSnapshot(c.id);
    const report = projectClientReport(
      (snap?.decision_snapshot ?? null) as Record<string, unknown> | null,
      snap?.vendor_questions as never, [],
    );
    let findings: unknown = [];
    try {
      findings = buildClientFindings(await getCaseTrackResults(c.id, c.delivered_attempt ?? undefined), { allowInternalTokens: true });
    } catch { /* no rows */ }

    for (const payload of [{ n: "report", v: report as unknown }, { n: "findings", v: findings }]) {
      for (const { path, value } of deepStrings(payload.v)) {
        for (const m of value.matchAll(SHAPE)) {
          const tok = m[0];
          if (KNOWN_SAFE.test(tok)) continue;
          const ctx = value.slice(Math.max(0, (m.index ?? 0) - 45), (m.index ?? 0) + 45).replace(/\s+/g, " ").trim();
          const e = byShape.get(tok) ?? { count: 0, where: [] };
          e.count++;
          if (e.where.length < 3) e.where.push(`${c.case_number} [${c.status}] ${payload.n}.${path} — …${ctx}…`);
          byShape.set(tok, e);
        }
      }
    }
  }

  console.log(`\n=== CITATION-SHAPE CENSUS — post-projection, ${scanned} cases ===`);
  console.log(`distinct shapes surviving to a client surface: ${byShape.size}\n`);
  for (const [tok, e] of [...byShape.entries()].sort((a, b) => b[1].count - a[1].count)) {
    console.log(`${tok}  ×${e.count}`);
    for (const w of e.where) console.log(`    ${w}`);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
