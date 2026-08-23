import { supabaseAdmin } from "@/lib/supabase/admin";
import { getClientDecisionSnapshot } from "@/lib/data/synthesis";
import { projectClientReport } from "@/lib/portal/clientReport";
import { getCaseTrackResults } from "@/lib/data/track-results";
import { buildClientFindings } from "@/lib/admin/reviewView";
import { deepStrings } from "@/lib/portal/deepStrings";
import { findInternalTokens } from "@/lib/portal/clientTokenCheckpoint";

// ── MEASUREMENT ONLY (item 3b: measure before you assert). Runs every CANDIDATE detector across
// the whole corpus and prints counts + examples so a rule is written from evidence. Ships nothing.

const CANDIDATES: { id: string; re: RegExp; note: string }[] = [
  { id: "hypothesis-tag", re: /\[(?:leading|alternative)\s+hypothesis[^\]]*\]/gi, note: "engine reasoning scaffold" },
  { id: "snake_case-key", re: /(?<![A-Za-z0-9_])(?:supplier_identity|supply_chain_relationship|brand_risk_assessment|documentation_review|sourcing_logic|category_compliance|brand_risk)(?![A-Za-z0-9_])/g, note: "internal track key" },
  { id: "signal-word", re: /(?<![A-Za-z0-9_])(?:soft_fail|hard_fail|n_a|manual_review_required|founder_review_status)(?![A-Za-z0-9_])/g, note: "internal signal enum" },
  { id: "module-ref", re: /(?<![A-Za-z0-9])(?:Module\s*\d|M\d\s+(?:says|found|output))/gi, note: "synthesis module reference" },
  { id: "track-number", re: /(?<![A-Za-z0-9])Track\s*\d(?![0-9])/gi, note: "internal track numbering" },
  { id: "rg-gap-word", re: /(?<![A-Za-z0-9-])(?:RG-?\d{1,3})(?![A-Za-z0-9])/gi, note: "research-gap marker" },
  { id: "a-marker", re: /(?<![A-Za-z0-9_-])A-?\d{1,3}(?![A-Za-z0-9])/g, note: "assertion marker" },
  { id: "src-token", re: /src_\d+/g, note: "source token" },
  { id: "ev-token", re: /(?<![A-Za-z0-9-])EV-\d{3}(?![0-9])/g, note: "evidence id" },
];

async function main() {
  const { data: cases } = await supabaseAdmin
    .from("cases").select("id, case_number, status, verdict, delivered_attempt")
    .is("deleted_at", null).order("case_number");

  const tally = new Map<string, { hits: number; cases: Set<string>; samples: string[] }>();
  const checkpointHits: string[] = [];
  let scanned = 0, noSnapshot = 0;

  for (const c of cases ?? []) {
    scanned++;
    const snap = await getClientDecisionSnapshot(c.id);
    if (!snap) noSnapshot++;
    const report = projectClientReport(
      (snap?.decision_snapshot ?? null) as Record<string, unknown> | null,
      snap?.vendor_questions as never, [],
    );
    let findings: unknown = [];
    try {
      findings = buildClientFindings(await getCaseTrackResults(c.id, c.delivered_attempt ?? undefined), { allowInternalTokens: true });
    } catch { /* no rows */ }

    // ONLY the fields a client actually reads. buildClientFindings output includes operator
    // fields, so restrict to the client-visible ones the report surface renders.
    const clientPayload = {
      report,
      findings: (findings as { client_summary?: unknown; questions_to_ask?: unknown }[] | undefined)?.map((f) => ({
        client_summary: f?.client_summary, questions_to_ask: f?.questions_to_ask,
      })) ?? [],
    };

    for (const { path, value } of deepStrings(clientPayload)) {
      for (const cand of CANDIDATES) {
        const re = new RegExp(cand.re.source, cand.re.flags);
        for (const m of value.matchAll(re)) {
          const e = tally.get(cand.id) ?? { hits: 0, cases: new Set<string>(), samples: [] };
          e.hits++; e.cases.add(c.case_number);
          if (e.samples.length < 3) {
            e.samples.push(`${c.case_number} [${c.status}] ${path} — …${value.slice(Math.max(0, (m.index ?? 0) - 50), (m.index ?? 0) + 60).replace(/\s+/g, " ").trim()}…`);
          }
          tally.set(cand.id, e);
        }
      }
    }
    const leaks = findInternalTokens(clientPayload);
    if (leaks.length) checkpointHits.push(`${c.case_number} [${c.status}]: ${leaks.length} — ${leaks.slice(0, 3).map((l) => l.match).join(", ")}`);
  }

  console.log(`\n=== CANDIDATE DETECTOR MEASUREMENT — ${scanned} cases (${noSnapshot} without a snapshot) ===\n`);
  for (const cand of CANDIDATES) {
    const e = tally.get(cand.id);
    console.log(`${cand.id.padEnd(18)} hits=${String(e?.hits ?? 0).padStart(4)}  cases=${String(e?.cases.size ?? 0).padStart(3)}   (${cand.note})`);
    for (const s of e?.samples ?? []) console.log(`      ${s}`);
  }
  console.log(`\n=== LIVE CHECKPOINT (what BLOCKS a publish today) ===`);
  console.log(checkpointHits.length === 0 ? "  clean across the corpus" : checkpointHits.join("\n"));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
