// ── PDF PREFLIGHT (§4) — READ-ONLY. Checks everything the render path needs, WITHOUT running a
// case, so the four-tier run discovers real defects instead of missing prerequisites.
//
// The PDF path has never executed end to end. These are the things that will stop it before any
// interesting failure gets a chance to happen.
//
//   npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local scripts/pdf-preflight.ts
import fs from "node:fs";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { REPORTS_BUCKET } from "@/lib/pdf/reportStorage";

const ok = (s: string) => console.log(`  ✓ ${s}`);
const bad = (s: string) => console.log(`  ✗ ${s}`);
const warn = (s: string) => console.log(`  ⚠ ${s}`);

async function main() {
  console.log("PDF PREFLIGHT — everything the render path needs, before a case is run\n");

  // 1 ── CHROMIUM. puppeteer-core needs a real browser; launchBrowser() probes these paths.
  console.log("1. Chromium (renderCaseReportPdf → launchBrowser)");
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/google-chrome", "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean) as string[];
  const found = candidates.find((p) => { try { return fs.existsSync(p); } catch { return false; } });
  if (found) ok(`browser found: ${found}`);
  else bad("NO Chrome/Chromium found. Set CHROME_PATH, or the render job fails on every case. ⚠ This is checked on THIS machine — the machine that runs Inngest is the one that matters.");

  // 2 ── CLIENT NAMES. renderCaseReportPdf THROWS no_client_name by design; the PDF simply will
  // not exist for a client with no name on file. This is the single most likely stopper.
  console.log("\n2. Client names (renderCaseReportPdf throws no_client_name)");
  const { data: clients } = await supabaseAdmin
    .from("clients").select("id, email, full_name, company_name").is("deleted_at", null);
  const nameless = (clients ?? []).filter((c) => !(c.full_name as string | null)?.trim() && !(c.company_name as string | null)?.trim());
  if (nameless.length === 0) ok(`all ${clients?.length ?? 0} client(s) have a name`);
  else {
    bad(`${nameless.length}/${clients?.length ?? 0} client(s) have NO full_name AND no company_name — every case they own will fail to render:`);
    for (const c of nameless.slice(0, 10)) console.log(`      · ${c.email ?? c.id}`);
  }

  // 3 ── BUCKET. Private, and writable by the service role.
  console.log(`\n3. Storage bucket "${REPORTS_BUCKET}"`);
  const { data: buckets, error: bErr } = await supabaseAdmin.storage.listBuckets();
  if (bErr) bad(`cannot list buckets: ${bErr.message}`);
  else {
    const b = (buckets ?? []).find((x) => x.name === REPORTS_BUCKET);
    if (!b) bad(`bucket "${REPORTS_BUCKET}" does not exist`);
    else {
      if (b.public) bad("BUCKET IS PUBLIC — P0, stop and tell the founder"); else ok("bucket is private");
      const probe = `__preflight/${"probe"}.txt`;
      const up = await supabaseAdmin.storage.from(REPORTS_BUCKET).upload(probe, Buffer.from("preflight"), { upsert: true, contentType: "text/plain" });
      if (up.error) {
        // A MIME restriction rejecting text/plain is CORRECT — it proves the allowlist is live.
        if (/mime/i.test(up.error.message)) ok(`writable; MIME allowlist is enforced (rejected text/plain: ${up.error.message})`);
        else bad(`cannot write: ${up.error.message}`);
      } else {
        warn("writable, and text/plain was ACCEPTED — the MIME allowlist may not be applied");
        await supabaseAdmin.storage.from(REPORTS_BUCKET).remove([probe]);
      }
    }
  }

  // 4 ── TIER COVERAGE. Which plans have ever produced a case at all.
  console.log("\n4. Tier coverage (the four-tier run's whole point)");
  const { data: cases } = await supabaseAdmin.from("cases").select("plan_type, status").is("deleted_at", null);
  const byTier: Record<string, number> = {};
  for (const c of cases ?? []) byTier[(c.plan_type as string) ?? "(none)"] = (byTier[(c.plan_type as string) ?? "(none)"] ?? 0) + 1;
  for (const tier of ["single_99", "single_149", "growth_279", "scale_499"]) {
    const n = byTier[tier] ?? 0;
    if (n === 0) warn(`${tier}: NO case has ever been run`); else ok(`${tier}: ${n} case(s)`);
  }

  // 5 ── EMAIL. The job sends the delivery mail; without a key it silently skips.
  console.log("\n5. Delivery email");
  if (process.env.RESEND_API_KEY) ok("RESEND_API_KEY present"); else warn("RESEND_API_KEY not set — the job will report skipped:no_api_key and send nothing");

  console.log("\n⚠ Every check above reads THIS environment. It says nothing about production.");
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
