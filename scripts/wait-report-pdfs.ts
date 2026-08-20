// Poll the reports bucket until every named case's delivered-attempt PDF exists (or 8 min pass).
//   CASES=... npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local scripts/wait-report-pdfs.ts
import { supabaseAdmin } from "@/lib/supabase/admin";
import { reportObjectKey, reportExists } from "@/lib/pdf/reportStorage";

async function main() {
  const wanted = (process.env.CASES ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const { data: cases } = await supabaseAdmin
    .from("cases").select("id, case_number, client_id, delivered_attempt").in("case_number", wanted);
  const keys = ((cases ?? []) as { case_number: string; client_id: string; delivered_attempt: number }[])
    .map((c) => ({ n: c.case_number, key: reportObjectKey(c.client_id, c.case_number, c.delivered_attempt) }));
  const deadline = Date.now() + 8 * 60 * 1000;
  const done = new Set<string>();
  while (Date.now() < deadline && done.size < keys.length) {
    for (const k of keys) {
      if (done.has(k.n)) continue;
      if (await reportExists(k.key)) { done.add(k.n); console.log(`✔ stored: ${k.key}`); }
    }
    if (done.size < keys.length) await new Promise((r) => setTimeout(r, 15000));
  }
  const missing = keys.filter((k) => !done.has(k.n));
  if (missing.length) { console.log(`✗ TIMED OUT waiting for: ${missing.map((m) => m.key).join(", ")}`); process.exit(2); }
  console.log("ALL FIVE STORED");
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
