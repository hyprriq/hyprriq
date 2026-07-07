/**
 * H6 — corpus cleanup + ledger backfill (FOUNDER-RUN; Claude does NOT run it). Backup-first.
 *
 *   npx tsx --env-file=.env.local scripts/cleanup-corpus.ts          ← DRY-RUN (prints the full plan, writes NOTHING except backups)
 *   npx tsx --env-file=.env.local scripts/cleanup-corpus.ts --apply  ← executes
 *
 * Phases (in order):
 *   1 BACKUP  — vendor_intelligence, brand_intelligence, intelligence_events, case_outcomes
 *               → backups/corpus-<ts>/*.json. Runs in DRY-RUN too (a backup can never hurt).
 *   2 BACKFILL — intelligence_events reconstructed from H1's attempt history (case_track_results
 *               per attempt + cases identity/verdict). Idempotent: 23505 duplicates are skipped.
 *   3 CLEANUP — founder-ruled junk profile rows deleted (OQ-1 table, ruled 2026-07-07).
 *   4 REBUILD — every vendor/brand key with confirmed events recomputed via the SHARED rollup
 *               fns (lib/data/intelligence — one compute path, all sites).
 *   5 ORPHANS — profile rows whose key has ZERO confirmed events die (how stale junk not on the
 *               explicit list goes).
 *   6 VERIFY  — per-vendor case_count vs count(DISTINCT case_id) from confirmed events.
 *
 * Honest limitations (printed at runtime): per-attempt identity is approximated by the case's
 * CURRENT supplier_identity for pre-H4 attempts (H4+ attempts carry research_name in the frozen
 * row); pre-attempt verdicts were never stored, so only the LATEST attempt carries the verdict.
 * Legacy cases with NO supplier_identity (pre-Spec-B) are treated as confirmed entered-name
 * identities — that WAS the research subject then (excluding them would starve kept vendors like
 * ingram micro and contradict the OQ-1 rulings).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { computeVendorRollup, computeBrandRollup, rollupVendor, rollupBrand, type LedgerEvent } from "@/lib/data/intelligence";
import { normalizeName } from "@/lib/utils/normalize-name";

// OQ-1 rulings — FINAL (founder ruled the full table 2026-07-07; V6 mototec usa = KEEP,
// so AWI-2607-024 is INCLUDED and brand mototec stays). Every constant maps to a table row.
// M1 — cases whose history never enters the ledger:
const EXCLUDED_CASE_NUMBERS_PREFIX = ["SEED-VALIDATE"];               // C1
const EXCLUDED_CASE_NUMBERS = ["AWI-2607-016", "AWI-2607-018", "AWI-2606-001"]; // C2 Zzqxwv, C3 Bosch mislabel, C4 Morendelli
// M2 — junk brand keys stripped from event brands/brands_normalized at backfill (else the
// rebuild resurrects the brand row from the ledger — the coupling the ruling table documents):
const BACKFILL_STRIP_BRANDS = ["colox", "xyz", "nike"];               // B2, B10, B7
// M3 — explicit profile-row deletes (belt; the orphan sweep is the suspenders):
const JUNK_VENDOR_KEYS = ["td synexx", "bosch", "zzqxwv nonexistent trading"]; // V2, V3, V4
const JUNK_BRAND_KEYS = ["colox", "xyz", "nike"];                     // B2, B10, B7

const APPLY = process.argv.includes("--apply");
type Row = Record<string, unknown>;

const BACKUP_TABLES = ["vendor_intelligence", "brand_intelligence", "intelligence_events", "case_outcomes"] as const;

function excluded(caseNumber: string | null): boolean {
  if (!caseNumber) return false;
  if (EXCLUDED_CASE_NUMBERS_PREFIX.some((p) => caseNumber.startsWith(p))) return true;
  return EXCLUDED_CASE_NUMBERS.includes(caseNumber);
}

async function phase1Backup(dir: string): Promise<void> {
  console.log("── Phase 1 — BACKUP (always, before anything)");
  for (const table of BACKUP_TABLES) {
    const { data, error } = await supabaseAdmin.from(table).select("*");
    if (error) {
      console.error(`STOP: could not back up ${table}: ${error.message}`);
      if (table === "intelligence_events") console.error("Has migration 20260708000000 been run? It creates intelligence_events.");
      process.exit(1);
    }
    const p = join(dir, `${table}.json`);
    writeFileSync(p, JSON.stringify(data ?? [], null, 2), "utf8");
    console.log(`   ✔ ${table}: ${(data ?? []).length} rows → ${p}`);
  }
}

interface BackfillEvent extends Omit<LedgerEvent, "created_at"> {
  event_type: "investigation_completed";
  created_at: string;
}

async function computeBackfill(): Promise<{ events: BackfillEvent[]; skipped: string[] }> {
  const { data: cases, error } = await supabaseAdmin
    .from("cases")
    .select("id, case_number, vendor_name, verdict, status, supplier_identity, brands_submitted")
    .is("deleted_at", null);
  if (error) { console.error(`STOP: could not read cases: ${error.message}`); process.exit(1); }

  const events: BackfillEvent[] = [];
  const skipped: string[] = [];
  for (const c of (cases ?? []) as Row[]) {
    const caseNumber = c.case_number as string | null;
    if (excluded(caseNumber)) { skipped.push(`${caseNumber} (OQ-1 excluded)`); continue; }

    const { data: trackRows } = await supabaseAdmin
      .from("case_track_results")
      .select("attempt_number, track_key, track_verdict_signal, compiled_findings_json, created_at")
      .eq("case_id", c.id).is("deleted_at", null);
    const rows = (trackRows ?? []) as Row[];
    if (rows.length === 0) { skipped.push(`${caseNumber} (no track rows — never completed)`); continue; }

    const si = (c.supplier_identity ?? null) as { resolved_name?: string; resolved_domain?: string | null; identity_unconfirmed?: boolean } | null;
    const enteredName = (c.vendor_name as string | null) ?? null;
    // Legacy pre-Spec-B cases (no supplier_identity): the entered name WAS the research subject —
    // treated as confirmed, else kept vendors (ingram micro etc.) would starve at rebuild.
    const identityUnconfirmed = si ? !!si.identity_unconfirmed : false;

    const byAttempt = new Map<number, Row[]>();
    for (const r of rows) {
      const a = (r.attempt_number as number | null) ?? 1;
      byAttempt.set(a, [...(byAttempt.get(a) ?? []), r]);
    }
    const latestAttempt = Math.max(...byAttempt.keys());

    const rawBrands = ((c.brands_submitted as string[] | null) ?? []);
    const keptBrands = rawBrands.filter((b) => !BACKFILL_STRIP_BRANDS.includes(normalizeName(b)));

    for (const [attempt, aRows] of [...byAttempt.entries()].sort((x, y) => x[0] - y[0])) {
      // H4+ attempts carry research_name in the frozen row; older attempts approximate via the
      // case's current identity, else the entered name.
      const researchName = aRows
        .map((r) => ((r.compiled_findings_json as Row | null)?.research_name as string | undefined))
        .find((n) => !!n);
      const resolvedName = researchName
        ?? (si && !identityUnconfirmed && si.resolved_name ? si.resolved_name : enteredName)
        ?? "";
      if (!resolvedName) { skipped.push(`${caseNumber} attempt ${attempt} (no resolvable name)`); continue; }

      const signals: Record<string, unknown> = {};
      for (const r of aRows) if (r.track_key && r.track_verdict_signal) signals[r.track_key as string] = r.track_verdict_signal;

      events.push({
        case_id: c.id as string,
        attempt_number: attempt,
        event_type: "investigation_completed",
        entered_name: enteredName,
        resolved_name: resolvedName,
        vendor_name_normalized: normalizeName(resolvedName),
        resolved_domain: si?.resolved_domain ?? null,
        identity_unconfirmed: identityUnconfirmed,
        identity_failed: false, // not reconstructable historically; H2-era failures already read n_a in signals
        brands: keptBrands,
        brands_normalized: keptBrands.map(normalizeName).filter(Boolean),
        signals: signals as LedgerEvent["signals"],
        // Only the LATEST attempt's verdict is known (prior verdicts were overwritten pre-H1).
        verdict: attempt === latestAttempt ? ((c.verdict as string | null) ?? null) : null,
        created_at: (aRows.map((r) => r.created_at as string).sort().pop()) ?? new Date().toISOString(),
      });
    }
  }
  return { events, skipped };
}

async function phase2Backfill(events: BackfillEvent[]): Promise<number> {
  let inserted = 0;
  for (const ev of events) {
    const { error } = await supabaseAdmin.from("intelligence_events").insert(ev);
    if (!error) { inserted++; continue; }
    if (error.code === "23505") continue; // already in the ledger — idempotent re-run
    console.error(`   ! event insert failed (${ev.case_id} attempt ${ev.attempt_number}): ${error.message}`);
  }
  return inserted;
}

async function confirmedEvents(): Promise<LedgerEvent[]> {
  const { data, error } = await supabaseAdmin
    .from("intelligence_events")
    .select("case_id, attempt_number, entered_name, resolved_name, vendor_name_normalized, resolved_domain, identity_unconfirmed, identity_failed, brands, brands_normalized, signals, verdict, created_at")
    .eq("identity_unconfirmed", false).eq("identity_failed", false);
  if (error) { console.error(`STOP: could not read intelligence_events: ${error.message}`); process.exit(1); }
  return (data ?? []) as unknown as LedgerEvent[];
}

async function main() {
  console.log(`H6 corpus cleanup — mode = ${APPLY ? "APPLY (writes)" : "DRY-RUN (backup only; prints the plan)"}\n`);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = join(process.cwd(), "backups", `corpus-${stamp}`);
  mkdirSync(dir, { recursive: true });

  await phase1Backup(dir);

  console.log("\n── Phase 2 — BACKFILL intelligence_events from H1 attempt history");
  const { events, skipped } = await computeBackfill();
  console.log(`   plan: ${events.length} event(s) from ${new Set(events.map((e) => e.case_id)).size} case(s); skipped: ${skipped.length}`);
  for (const s of skipped) console.log(`     · skip ${s}`);
  if (APPLY) {
    const inserted = await phase2Backfill(events);
    console.log(`   ✔ inserted ${inserted} (rest were already in the ledger)`);
  }

  console.log("\n── Phase 3 — CLEANUP (OQ-1 ruled junk profile rows)");
  console.log(`   vendors: ${JUNK_VENDOR_KEYS.join(", ")}`);
  console.log(`   brands:  ${JUNK_BRAND_KEYS.join(", ")}`);
  if (APPLY) {
    const { error: vDel } = await supabaseAdmin.from("vendor_intelligence").delete().in("vendor_name_normalized", JUNK_VENDOR_KEYS);
    const { error: bDel } = await supabaseAdmin.from("brand_intelligence").delete().in("brand_name_normalized", JUNK_BRAND_KEYS);
    if (vDel) console.error(`   ! vendor delete failed: ${vDel.message}`);
    if (bDel) console.error(`   ! brand delete failed: ${bDel.message}`);
    if (!vDel && !bDel) console.log("   ✔ junk rows deleted");
  }

  console.log("\n── Phase 4 — REBUILD rollups from the ledger (shared compute fns)");
  // DRY-RUN previews from the in-memory union (nothing inserted yet); APPLY uses the DB-backed
  // shared path (rollupVendor/rollupBrand — the same fns the pipeline write uses).
  const ledger = APPLY ? await confirmedEvents() : [
    ...(await confirmedEvents()),
    ...events.filter((e) => !e.identity_unconfirmed && !e.identity_failed).map((e) => e as unknown as LedgerEvent),
  ];
  const dedup = new Map<string, LedgerEvent>();
  for (const e of ledger) dedup.set(`${e.case_id}:${e.attempt_number}`, e);
  const confirmed = [...dedup.values()];
  const vendorKeys = [...new Set(confirmed.map((e) => e.vendor_name_normalized))];
  const brandKeys = [...new Set(confirmed.flatMap((e) => e.brands_normalized))].filter((k) => !JUNK_BRAND_KEYS.includes(k));
  for (const key of vendorKeys) {
    const r = computeVendorRollup(key, confirmed.filter((e) => e.vendor_name_normalized === key));
    console.log(`   vendor ${key}: case_count=${r.case_count}, domain=${r.resolved_domain ?? "—"}, brands=[${r.known_brand_relationships.join(", ")}], aliases=[${r.entered_names.join(", ")}]`);
    if (APPLY) {
      const { error } = await rollupVendor(key);
      if (error) console.error(`   ! rollup failed for vendor ${key}: ${error}`);
    }
  }
  for (const key of brandKeys) {
    const r = computeBrandRollup(key, confirmed);
    console.log(`   brand ${key}: case_count=${r.case_count}`);
    if (APPLY) {
      const { error } = await rollupBrand(key);
      if (error) console.error(`   ! rollup failed for brand ${key}: ${error}`);
    }
  }

  console.log("\n── Phase 5 — ORPHAN SWEEP (profile rows with zero confirmed events)");
  const { data: vRows } = await supabaseAdmin.from("vendor_intelligence").select("vendor_name_normalized");
  const { data: bRows } = await supabaseAdmin.from("brand_intelligence").select("brand_name_normalized");
  const vOrphans = ((vRows ?? []) as Row[]).map((r) => r.vendor_name_normalized as string)
    .filter((k) => !vendorKeys.includes(k) && !JUNK_VENDOR_KEYS.includes(k));
  const bOrphans = ((bRows ?? []) as Row[]).map((r) => r.brand_name_normalized as string)
    .filter((k) => !brandKeys.includes(k) && !JUNK_BRAND_KEYS.includes(k));
  console.log(`   vendor orphans: ${vOrphans.length ? vOrphans.join(", ") : "none"}`);
  console.log(`   brand orphans:  ${bOrphans.length ? bOrphans.join(", ") : "none"}`);
  if (APPLY) {
    if (vOrphans.length) await supabaseAdmin.from("vendor_intelligence").delete().in("vendor_name_normalized", vOrphans);
    if (bOrphans.length) await supabaseAdmin.from("brand_intelligence").delete().in("brand_name_normalized", bOrphans);
    if (vOrphans.length || bOrphans.length) console.log("   ✔ orphans deleted");
  }

  console.log("\n── Phase 6 — VERIFY (case_count must equal DISTINCT confirmed cases per key)");
  const { data: vFinal } = await supabaseAdmin.from("vendor_intelligence").select("vendor_name_normalized, case_count, resolved_domain");
  for (const v of (vFinal ?? []) as Row[]) {
    const key = v.vendor_name_normalized as string;
    const expected = new Set(confirmed.filter((e) => e.vendor_name_normalized === key).map((e) => e.case_id)).size;
    const ok = APPLY ? v.case_count === expected : true;
    console.log(`   ${ok ? "✔" : "✗ MISMATCH"} ${key}: case_count=${v.case_count}${APPLY ? ` (expected ${expected})` : ` (will become ${expected})`}`);
  }

  console.log(`\nDONE (${APPLY ? "APPLY" : "DRY-RUN — nothing changed except backups"}). Backups → ${dir}`);
  if (!APPLY) console.log("Review the plan above, then re-run with --apply. Re-running --apply is idempotent.");
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
