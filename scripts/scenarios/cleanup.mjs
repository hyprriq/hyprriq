// Deletes every throwaway scenario case (case_number LIKE 'SEED-REVIEW-%') and its child rows.
// Safe to run repeatedly. Touches the SAME Supabase project staging reads — run deliberately.
//
// RUN (from D:\Projects\Hyprriq\portal):
//   node scripts/scenarios/cleanup.mjs
//
// Reads .env.local for NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const path = resolve(__dirname, "..", "..", ".env.local"); // scripts/scenarios -> project root
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[t.slice(0, i).trim()] = v;
  }
  return out;
}

const env = loadEnv();
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function main() {
  const { data: cases, error } = await db
    .from("cases")
    .select("id, case_number")
    .like("case_number", "SEED-%"); // SEED-REVIEW-% (review screens) + SEED-VALIDATE-% (acquisition validation)
  if (error) throw new Error(`query: ${error.message}`);
  if (!cases || cases.length === 0) {
    console.log("No SEED-% cases found. Nothing to clean up.");
    return;
  }

  console.log(`Found ${cases.length} throwaway case(s):`);
  for (const c of cases) {
    // child rows (case_evidence_packs / case_acquisition_metrics also cascade on the cases delete)
    for (const t of ["case_synthesis", "case_track_results", "case_evidence_packs", "case_acquisition_metrics"]) {
      const { error: e } = await db.from(t).delete().eq("case_id", c.id);
      if (e) throw new Error(`${t} ${c.case_number}: ${e.message}`);
    }
    const { error: cErr } = await db.from("cases").delete().eq("id", c.id);
    if (cErr) throw new Error(`cases ${c.case_number}: ${cErr.message}`);
    console.log(`  ✓ deleted ${c.case_number} (${c.id})`);
  }
  console.log(`\n✅ Cleaned up ${cases.length} throwaway case(s).`);
  console.log("Note: vendor_intelligence / brand_intelligence rows are keyed by normalized name (no");
  console.log("case link) and are NOT removed here. If the validation vendor should not seed the");
  console.log("corpus, delete it manually by vendor_name_normalized.");
}

main().catch((e) => { console.error("\n❌ Cleanup failed:", e.message); process.exit(1); });
