// ── GATE CENSUS (2026-08-16, founder-ordered measurement) — READ-ONLY. Runs the REAL scanHard
// over every case's publish scan surface (latest attempt: track findings + questions + snapshot
// + M8) and prints: how many cases would block at publish today, on which patterns, with sample
// sentences. THE NUMBER IT PRINTS IS THE LAUNCH RISK. Re-run after any gate or engine-prose
// change — it is the acceptance test for both (baseline 2026-08-16: 12/39 → 9/39 after the
// ruled amendments; residual = the confirms-authorization vocabulary class).
// Run: npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local scripts/gate-census.ts
import { supabaseAdmin } from "@/lib/supabase/admin";
import { scanHard, scanFindingsForBannedLanguage } from "@/lib/utils/banned-language";

const SENT = /(?<=[.!?])\s+/;

async function main() {
  const { data: cases } = await supabaseAdmin.from("cases")
    .select("id, case_number, plan_type, status").is("deleted_at", null).order("created_at");
  const agg: Record<string, { cases: Set<string>; samples: string[] }> = {};
  let blocked = 0;
  const blockedCases: string[] = [];
  for (const c of cases ?? []) {
    const { data: rows } = await supabaseAdmin.from("case_track_results")
      .select("track_key, compiled_findings_json, questions_to_ask, attempt_number")
      .eq("case_id", c.id).is("deleted_at", null);
    if (!rows?.length) continue;
    const att = Math.max(...rows.map((r) => r.attempt_number ?? 1));
    const latest = rows.filter((r) => (r.attempt_number ?? 1) === att);
    const { data: s } = await supabaseAdmin.from("case_synthesis")
      .select("decision_snapshot, vendor_questions").eq("case_id", c.id).eq("attempt_number", att).maybeSingle();
    const surface = {
      rows: latest.map((r) => ({ f: r.compiled_findings_json, q: r.questions_to_ask })),
      snapshot: s?.decision_snapshot ?? null,
      vq: s?.vendor_questions ?? null,
    };
    const v = scanFindingsForBannedLanguage(surface);
    if (v.length === 0) continue;
    blocked++;
    blockedCases.push(`${c.case_number} (${c.plan_type}) [${[...new Set(v)].join(", ")}]`);
    const texts: string[] = [];
    const walk = (x: unknown) => {
      if (typeof x === "string") texts.push(x);
      else if (Array.isArray(x)) x.forEach(walk);
      else if (x && typeof x === "object") Object.values(x).forEach(walk);
    };
    walk(surface);
    for (const label of new Set(v)) {
      agg[label] ??= { cases: new Set(), samples: [] };
      agg[label].cases.add(c.case_number);
      for (const t of texts) for (const sent of t.split(SENT)) {
        if (scanHard(sent).includes(label) && agg[label].samples.length < 3 && !agg[label].samples.includes(sent)) {
          agg[label].samples.push(sent.slice(0, 220));
        }
      }
    }
  }
  console.log(`TOTAL CASES SCANNED: ${(cases ?? []).length}, WOULD BLOCK TODAY: ${blocked}`);
  console.log("BLOCKED:", blockedCases.join(" | "));
  for (const [label, d] of Object.entries(agg)) {
    console.log(`\n== ${label} — ${d.cases.size} case(s): ${[...d.cases].join(", ")}`);
    d.samples.forEach((smp, i) => console.log(`  [${i + 1}] ${smp}`));
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
