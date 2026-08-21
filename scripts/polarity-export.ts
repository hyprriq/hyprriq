// ── POLARITY CENSUS EXPORT (2026-08-21, founder-ordered measurement) — READ-ONLY.
// Dumps every stored evidence item (statement + validated weight_key + sign + delivered-attempt
// flag) across the corpus to JSON, so statement-vs-key polarity can be judged item by item.
// This is the instrument behind docs/POLARITY_CENSUS_2026-08-21.md. No writes, no fixes.
// One instrument, one number: this prints the item counts by sign; the judgment layer is human.
// Run: npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local scripts/polarity-export.ts [out.json]
import { supabaseAdmin } from "@/lib/supabase/admin";
import { weightFor } from "@/lib/research/weights";
import fs from "node:fs";

type TrackKey = Parameters<typeof weightFor>[0];

async function main() {
  const { data: cases, error: ce } = await supabaseAdmin
    .from("cases")
    .select("id, case_number, status, verdict, delivered_attempt, plan_type")
    .is("deleted_at", null);
  if (ce) throw ce;
  const byId = new Map((cases ?? []).map((c) => [c.id as string, c]));

  const { data: rows, error: re } = await supabaseAdmin
    .from("case_track_results")
    .select("case_id, track_key, track_number, attempt_number, track_verdict_signal, evidence_items")
    .is("deleted_at", null);
  if (re) throw re;

  const out: unknown[] = [];
  for (const r of rows ?? []) {
    const items = Array.isArray(r.evidence_items) ? r.evidence_items : [];
    const c = byId.get(r.case_id as string);
    for (const it of items as { evidence_id?: string; statement?: string; weight_key?: string; certainty?: string; source_url?: string | null; brand?: string }[]) {
      const key = it.weight_key ?? null;
      const w = key ? weightFor(r.track_key as TrackKey, key) : null;
      out.push({
        case_number: c?.case_number ?? r.case_id,
        case_status: c?.status ?? null,
        case_verdict: c?.verdict ?? null,
        delivered_attempt: c?.delivered_attempt ?? null,
        track_key: r.track_key,
        track_number: r.track_number,
        attempt_number: r.attempt_number,
        is_delivered_attempt: c?.delivered_attempt != null && r.attempt_number === c.delivered_attempt,
        track_verdict_signal: r.track_verdict_signal,
        evidence_id: it.evidence_id ?? null,
        weight_key: key,
        points: w?.points ?? null,
        hard_fail: w?.hard_fail ?? false,
        certainty: it.certainty ?? null,
        brand: it.brand ?? null,
        source_url: it.source_url ?? null,
        statement: it.statement ?? "",
      });
    }
  }
  const dest = process.argv[2] ?? "polarity-corpus.json";
  fs.writeFileSync(dest, JSON.stringify(out, null, 1));
  const signed = out as { points: number | null; hard_fail: boolean }[];
  console.log(`items=${out.length} negative=${signed.filter((x) => (x.points ?? 0) < 0).length} positive=${signed.filter((x) => (x.points ?? 0) > 0).length} zero=${signed.filter((x) => x.points === 0 && !x.hard_fail).length} veto=${signed.filter((x) => x.hard_fail).length} -> ${dest}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
