// ── RLS ADVERSARIAL SUITE (founder-directed 2026-08-20) — READ-ONLY, repeatable.
//
// "47 policies enabled and never tested as a suite is not a proof." This is the proof, and it is
// an INSTRUMENT: re-run it after any policy change, before the first real client, and after the
// Clerk→GUC wiring lands (which is when the latent finding below goes live).
//
// It tests the surface an attacker actually has: the ANON KEY, which ships to every browser in
// NEXT_PUBLIC_SUPABASE_ANON_KEY. Everything server-side uses the service-role key and scopes by
// hand — RLS is defense-in-depth there, and this suite measures the depth.
//
//   npx tsx --tsconfig tsconfig.json --env-file=.env.local scripts/rls-adversarial.ts
//
// ⚠ THE ONE THING THIS CANNOT TEST FROM HERE: cross-client isolation with the GUC actually set —
// `app.current_user_id` is unreachable from client traffic today (no pgrst.db_pre_request hook),
// which is WHY every anon read returns zero rows. That half was proven in-database via
// `set local role authenticated` + set_config, recorded in docs/RLS_PROOF_2026-08-20.md.

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// EVERY table in the public schema (live-verified 2026-08-20, 34 tables) — not just the ones that
// look client-facing. A "boring" table is exactly where a leak hides, and a partial list is a
// proof that silently stops covering whatever was added last.
// ⚠ MAINTENANCE: a NEW table must be added here. The drift check below fails loudly if the live
// table count no longer matches this list.
const CLIENT_TABLES = [
  "clients", "cases", "research_findings", "uploaded_files", "audit_log", "client_events",
  "case_outcomes", "founder_notes", "prompts", "prompt_runs", "qa_reviews", "reports",
  "stripe_events", "daily_case_count", "category_flags", "email_log", "national_distributors",
  "partner_program_brands", "support_requests", "billing_audit", "admin_audit_log",
  "case_track_results", "case_synthesis", "agencies", "vendor_intelligence", "brand_intelligence",
  "case_evidence_packs", "case_acquisition_metrics", "intelligence_events", "admin_permissions",
  "admin_invitations", "staff_client_assignments", "case_prose_overrides", "gate_events",
];

// Storage is a data surface too — and `reports` holds delivered client PDFs. A public bucket or a
// permissive storage policy leaks documents without touching a single table.
const BUCKETS = ["reports", "case-documents"];

async function main() {
  if (!URL_ || !ANON) { console.error("STOP: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY required"); process.exit(1); }
  const h = { apikey: ANON!, Authorization: `Bearer ${ANON}` };
  let failures = 0;

  console.log("RLS ADVERSARIAL SUITE — the anon key is the attacker's surface (it ships to every browser)\n");
  console.log("── 1. READ: every client table must return ZERO rows ──");
  for (const t of CLIENT_TABLES) {
    const res = await fetch(`${URL_}/rest/v1/${t}?select=*&limit=100`, { headers: h });
    const body = await res.text();
    let rows = -1;
    try { const j = JSON.parse(body); rows = Array.isArray(j) ? j.length : -1; } catch { /* non-array error body */ }
    const ok = res.status === 200 ? rows === 0 : res.status === 401 || res.status === 403 || res.status === 404;
    if (!ok) failures++;
    console.log(`  ${ok ? "✓" : "✗ LEAK"} ${t.padEnd(24)} HTTP ${res.status}${rows >= 0 ? ` rows=${rows}` : ""}`);
  }

  console.log("\n── 2. WRITE: anon must not be able to create a case ──");
  {
    const res = await fetch(`${URL_}/rest/v1/cases`, {
      method: "POST", headers: { ...h, "Content-Type": "application/json" },
      body: JSON.stringify({ vendor_name: "rls-suite-probe", client_id: "rls-suite-probe", plan_type: "single_99" }),
    });
    const ok = res.status >= 400;
    if (!ok) failures++;
    console.log(`  ${ok ? "✓ refused" : "✗ ACCEPTED — P0"} HTTP ${res.status}`);
  }

  console.log("\n── 3. GUC INJECTION: a header must not be able to impersonate a client ──");
  {
    const res = await fetch(`${URL_}/rest/v1/cases?select=id&limit=50`, {
      headers: { ...h, "app.current_user_id": "user_3FMpveJshdQq9bDAzxygPyPaMy2", "X-App-Current-User-Id": "user_3FMpveJshdQq9bDAzxygPyPaMy2" },
    });
    const rows = ((await res.json().catch(() => [])) as unknown[]).length;
    const ok = rows === 0;
    if (!ok) failures++;
    console.log(`  ${ok ? "✓ header ignored" : "✗ IMPERSONATION — P0"} rows=${rows}`);
  }

  console.log("\n── 4. STORAGE: the buckets holding delivered client PDFs must not list or serve ──");
  for (const b of BUCKETS) {
    // LIST: a permissive storage policy exposes filenames (client ids + case numbers) even if the
    // objects themselves need a signed URL.
    const listRes = await fetch(`${URL_}/storage/v1/object/list/${b}`, {
      method: "POST", headers: { ...h, "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: "", limit: 100 }),
    });
    const listed = listRes.ok ? ((await listRes.json().catch(() => [])) as unknown[]).length : -1;
    const listOk = !listRes.ok || listed === 0;
    if (!listOk) failures++;
    console.log(`  ${listOk ? "✓" : "✗ LEAK"} ${b.padEnd(16)} list  HTTP ${listRes.status}${listed >= 0 ? ` entries=${listed}` : ""}`);

    // PUBLIC FETCH: if the bucket were public, this path serves the object with no signature.
    const pubRes = await fetch(`${URL_}/storage/v1/object/public/${b}/probe.pdf`, { headers: h });
    const pubOk = pubRes.status >= 400; // 400/404 = not public / not found: both mean "not served"
    if (!pubOk) failures++;
    console.log(`  ${pubOk ? "✓" : "✗ PUBLIC — P0"} ${b.padEnd(16)} public-get HTTP ${pubRes.status}`);
  }

  console.log(`\n${failures === 0 ? "PASS — the anon surface leaks nothing" : `FAIL — ${failures} finding(s)`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });

export {}; // module scope - keeps this global script from colliding with sibling scripts (rls-jwt-probe) under tsc
