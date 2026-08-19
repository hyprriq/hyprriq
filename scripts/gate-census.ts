// ── GATE CENSUS (2026-08-16, founder-ordered measurement) — READ-ONLY. Runs the REAL scanHard
// over every case's publish scan surface (latest attempt: track findings + questions + snapshot
// + M8) and prints: how many cases would block at publish today, on which patterns, with sample
// sentences. THE NUMBER IT PRINTS IS THE LAUNCH RISK. Re-run after any gate or engine-prose
// change — it is the acceptance test for both (baseline 2026-08-16: 12/39 → 9/39 after the
// ruled amendments; residual = the confirms-authorization vocabulary class).
//
// 2026-08-17 (engine-prose pass acceptance): BOTH GATE SCANS now print. The HARD section is
// unchanged — same walk, same number, comparable to every prior run. The ASSERTION section is
// ADDITIVE: the founder's acceptance target is "~0% blocks AND the A6 advisory count trending to
// zero", and A6 ("evidence-voice authorization confirmation") is the advisory the two gate rulings
// created to hold this exact class until the prose pass retired it. A HARD 0 with a high A6 is the
// pass half-done — the word moved shell rather than leaving.
// Run: npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local scripts/gate-census.ts
import { supabaseAdmin } from "@/lib/supabase/admin";
import { scanHard, scanAssertion, scanFindingsForBannedLanguage, assertionAdvisories } from "@/lib/utils/banned-language";
import { scanSynthesisAtDelivery, scanTrackProseAtDelivery } from "@/lib/research/synthesisMethodScan";
import { scanCategoryAtDelivery } from "@/lib/research/categoryLanguage";

const SENT = /(?<=[.!?])\s+/;

async function main() {
  const { data: cases } = await supabaseAdmin.from("cases")
    .select("id, case_number, plan_type, status").is("deleted_at", null).order("created_at");
  const agg: Record<string, { cases: Set<string>; samples: string[] }> = {};
  const advAgg: Record<string, { cases: Set<string>; samples: string[] }> = {};
  let blocked = 0;
  let advised = 0;
  const blockedCases: string[] = [];
  const advisedCases: string[] = [];
  for (const c of cases ?? []) {
    const { data: rows } = await supabaseAdmin.from("case_track_results")
      .select("track_key, compiled_findings_json, questions_to_ask, attempt_number")
      .eq("case_id", c.id).is("deleted_at", null);
    if (!rows?.length) continue;
    const att = Math.max(...rows.map((r) => r.attempt_number ?? 1));
    const latest = rows.filter((r) => (r.attempt_number ?? 1) === att);
    const { data: s } = await supabaseAdmin.from("case_synthesis")
      .select("decision_snapshot, vendor_questions, doubt_calibration").eq("case_id", c.id).eq("attempt_number", att).maybeSingle();
    const surface = {
      rows: latest.map((r) => ({ f: r.compiled_findings_json, q: r.questions_to_ask })),
      snapshot: s?.decision_snapshot ?? null,
      vq: s?.vendor_questions ?? null,
    };
    // ── ONE INSTRUMENT, ONE NUMBER (founder-ruled 2026-08-17). The publish path runs TWO scanners;
    // this census ran ONE, so every launch-risk number before today measured half a gate. The
    // blocking set below is now composed EXACTLY as app/api/admin/cases/[id]/review/route.ts
    // composes it — language + derivation-rule — so the census and the publish path can never
    // again disagree about whether a case would block. (Same defect class as the attempt skew.)
    const method = s
      ? scanSynthesisAtDelivery({
          module_9_decision_snapshot: s.decision_snapshot,
          module_8_vendor_questions: s.vendor_questions,
          module_7_doubt_calibration: (s.doubt_calibration ?? undefined) as { doubt_focus?: string; rationale?: string } | undefined,
        })
      : [];
    // CLASS 4 (founder-ruled 2026-08-18) — the derivation scanner now covers TRACK prose as well
    // as synthesis. It lands INSIDE the merged blocking set, not beside it: a third scanner outside
    // this composition would re-create the exact defect the merge fixed.
    // ⚠ THE NUMBER RISES WHEN THIS LANDS AND THAT IS CORRECT. Those occurrences pass the publish
    // gate today and always have; the instrument stopped being blind. It is not a regression.
    const trackMethod = scanTrackProseAtDelivery(
      latest.map((r) => ({
        track_key: r.track_key,
        compiled_findings_json: r.compiled_findings_json,
        questions_to_ask: r.questions_to_ask,
      })),
    );
    const category = scanCategoryAtDelivery(latest.map((r) => ({ track_key: r.track_key, compiled_findings_json: r.compiled_findings_json })));
    const v = [...scanFindingsForBannedLanguage(surface), ...method, ...trackMethod, ...category];   // HARD — blocks delivery
    const a = assertionAdvisories(surface);             // ASSERTION — mandatory-review advisory
    if (v.length === 0 && a.length === 0) continue;
    const texts: string[] = [];
    const walk = (x: unknown) => {
      if (typeof x === "string") texts.push(x);
      else if (Array.isArray(x)) x.forEach(walk);
      else if (x && typeof x === "object") Object.values(x).forEach(walk);
    };
    walk(surface);
    // One aggregator, run per tier — the sample hunt uses that tier's own sentence scanner.
    const collect = (
      labels: string[], into: Record<string, { cases: Set<string>; samples: string[] }>,
      scan: (t: string) => string[],
    ) => {
      for (const label of new Set(labels)) {
        into[label] ??= { cases: new Set(), samples: [] };
        into[label].cases.add(c.case_number);
        for (const t of texts) for (const sent of t.split(SENT)) {
          if (scan(sent).includes(label) && into[label].samples.length < 3 && !into[label].samples.includes(sent)) {
            into[label].samples.push(sent.slice(0, 220));
          }
        }
      }
    };
    if (v.length) {
      blocked++;
      blockedCases.push(`${c.case_number} (${c.plan_type}) [${[...new Set(v)].join(", ")}]`);
      collect(v, agg, scanHard);
    }
    if (a.length) {
      advised++;
      advisedCases.push(`${c.case_number} (${c.plan_type}) [${[...new Set(a)].join(", ")}]`);
      collect(a, advAgg, scanAssertion);
    }
  }
  const total = (cases ?? []).length;
  const pct = (n: number) => `${Math.round((n / Math.max(1, total)) * 100)}%`;
  console.log(`TOTAL CASES SCANNED: ${total}, WOULD BLOCK TODAY: ${blocked} (${pct(blocked)})`);
  console.log("BLOCKED:", blockedCases.join(" | ") || "(none)");
  for (const [label, d] of Object.entries(agg)) {
    console.log(`\n== ${label} — ${d.cases.size} case(s): ${[...d.cases].join(", ")}`);
    d.samples.forEach((smp, i) => console.log(`  [${i + 1}] ${smp}`));
  }
  // ── ASSERTION TIER — never blocks; the A6 line is the prose pass's second acceptance number. ──
  console.log(`\n──────── ASSERTION TIER (advisory — mandatory review, never blocking) ────────`);
  console.log(`CASES CARRYING AN ADVISORY: ${advised} (${pct(advised)})`);
  console.log("ADVISED:", advisedCases.join(" | ") || "(none)");
  for (const [label, d] of Object.entries(advAgg)) {
    console.log(`\n~~ ${label} — ${d.cases.size} case(s): ${[...d.cases].join(", ")}`);
    d.samples.forEach((smp, i) => console.log(`  [${i + 1}] ${smp}`));
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
