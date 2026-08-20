// ── RE-SEND THE REPORT-PDF EVENT for delivered cases whose PDF object is not in storage yet.
// Safe by construction: the render job is idempotent on the immutable object key — an object
// already stored is a SUCCESS, and Chromium never runs twice for the same delivered attempt.
//
//   CASES=AWI-...[,AWI-...] npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local scripts/resend-report-pdf.ts
import { supabaseAdmin } from "@/lib/supabase/admin";
import { inngest } from "@/lib/inngest/client";
import { reportObjectKey, reportExists } from "@/lib/pdf/reportStorage";
import { REPORT_PDF_EVENT, type ReportPdfEvent } from "@/lib/inngest/events";

const ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? "https://hyprriq-git-staging-hyprrx-hyprriq.vercel.app";

async function main() {
  const wanted = (process.env.CASES ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const { data: cases } = await supabaseAdmin
    .from("cases").select("id, case_number, status, client_id, delivered_attempt")
    .in("case_number", wanted);
  for (const c of (cases ?? []) as { id: string; case_number: string; status: string; client_id: string | null; delivered_attempt: number | null }[]) {
    if (c.status !== "delivered" && c.status !== "complete") { console.log(`· ${c.case_number}: not delivered — skipped`); continue; }
    if (!c.client_id || !c.delivered_attempt) { console.log(`· ${c.case_number}: missing client/attempt — skipped`); continue; }
    const key = reportObjectKey(c.client_id, c.case_number, c.delivered_attempt);
    if (await reportExists(key)) { console.log(`✓ ${c.case_number}: ${key} already stored`); continue; }
    await inngest.send({ name: REPORT_PDF_EVENT, data: { case_id: c.id, attempt: c.delivered_attempt, origin: ORIGIN } satisfies ReportPdfEvent });
    console.log(`→ ${c.case_number}: event re-sent for ${key}`);
  }
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
