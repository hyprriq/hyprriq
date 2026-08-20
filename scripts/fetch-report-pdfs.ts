// Prove the signed-URL link of the §4 chain and fetch the delivered bytes for inspection:
// mints a short-lived signed URL per case via the SAME helper the download route uses
// (signedReportUrl), then downloads THROUGH THAT URL — storage-side auth, not service-role read.
//   CASES=... OUT=<dir> npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local scripts/fetch-report-pdfs.ts
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { reportObjectKey, signedReportUrl } from "@/lib/pdf/reportStorage";

async function main() {
  const out = process.env.OUT ?? "qa-layout";
  mkdirSync(out, { recursive: true });
  const wanted = (process.env.CASES ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const { data: cases } = await supabaseAdmin
    .from("cases").select("case_number, client_id, delivered_attempt").in("case_number", wanted);
  for (const c of (cases ?? []) as { case_number: string; client_id: string; delivered_attempt: number }[]) {
    const key = reportObjectKey(c.client_id, c.case_number, c.delivered_attempt);
    const url = await signedReportUrl(key);
    if (!url) { console.log(`✗ ${c.case_number}: signing failed`); continue; }
    const res = await fetch(url);
    if (!res.ok) { console.log(`✗ ${c.case_number}: signed fetch ${res.status}`); continue; }
    const bytes = Buffer.from(await res.arrayBuffer());
    const p = join(out, `${c.case_number}-report.pdf`);
    writeFileSync(p, bytes);
    console.log(`✔ ${c.case_number}: signed URL minted + fetched ${bytes.length} bytes → ${p}`);
  }
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
