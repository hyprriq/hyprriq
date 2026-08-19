// ── JURISDICTION PROBE — READ-ONLY. Is a non-US supplier structurally penalised?
//
// THE HYPOTHESIS, from the query templates (lib/research/tracks/track1.queries.ts):
//   business_registry → `${vendor} business registration secretary of state`   ← US-ONLY TERM
//   bbb_listing       → `${vendor} BBB better business bureau`                 ← US/CANADA ONLY
// government_registration is +4, the LARGEST positive in the identity table; bbb_or_trade_association
// is +1. A UK supplier registers at Companies House and has no BBB listing, so both queries return
// nothing — and the report then says "No government registration record was found", which reads as a
// finding ABOUT THE SUPPLIER when it is an artifact of asking a US question.
//
// This measures whether that is real or theoretical, across every case with an identity track.
//
//   npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local scripts/jurisdiction-probe.ts
import { supabaseAdmin } from "@/lib/supabase/admin";

// Country signal from the resolved domain. Crude on purpose — it is the same signal the engine
// itself would have available, and the point is that the engine uses NONE of it.
function tldCountry(domain: string | null): string {
  if (!domain) return "(no domain)";
  const m = /\.([a-z]{2,})(?:\.([a-z]{2}))?$/i.exec(domain.trim().toLowerCase());
  if (!m) return "(unparsed)";
  const last = m[2] ?? m[1];
  if (["com", "net", "org", "info", "biz", "io", "co"].includes(last)) return "generic (unknown)";
  return `.${last}`;
}

async function main() {
  const { data: cases } = await supabaseAdmin
    .from("cases")
    .select("id, case_number, plan_type, vendor_name, vendor_website, supplier_identity, delivered_attempt")
    .is("deleted_at", null)
    .order("created_at");

  const byCountry: Record<string, { n: number; withReg: number; withBbb: number; cases: string[] }> = {};
  let scanned = 0;

  for (const c of (cases ?? []) as { id: string; case_number: string; vendor_website: string | null; supplier_identity: { resolved_domain?: string } | null; delivered_attempt: number | null }[]) {
    const { data: rows } = await supabaseAdmin
      .from("case_track_results")
      .select("track_key, evidence_items, attempt_number, compiled_findings_json")
      .eq("case_id", c.id).eq("track_key", "supplier_identity").is("deleted_at", null);
    if (!rows?.length) continue;
    const att = c.delivered_attempt ?? Math.max(...rows.map((r) => r.attempt_number ?? 1));
    const row = rows.find((r) => (r.attempt_number ?? 1) === att);
    if (!row) continue;
    scanned++;

    const domain = c.supplier_identity?.resolved_domain ?? c.vendor_website ?? null;
    const country = tldCountry(domain);
    const keys = ((row.evidence_items ?? []) as { weight_key?: string | null }[])
      .map((e) => e.weight_key).filter(Boolean) as string[];

    byCountry[country] ??= { n: 0, withReg: 0, withBbb: 0, cases: [] };
    const b = byCountry[country];
    b.n++;
    if (keys.includes("government_registration")) b.withReg++;
    if (keys.includes("bbb_or_trade_association")) b.withBbb++;
    if (b.cases.length < 6) b.cases.push(c.case_number);
  }

  console.log(`JURISDICTION PROBE — ${scanned} case(s) with a supplier_identity row\n`);
  console.log("Domain signal        cases   government_registration   bbb_or_trade_association");
  for (const [country, b] of Object.entries(byCountry).sort((a, z) => z[1].n - a[1].n)) {
    const reg = `${b.withReg}/${b.n}`.padEnd(23);
    const bbb = `${b.withBbb}/${b.n}`;
    console.log(`  ${country.padEnd(18)} ${String(b.n).padStart(4)}   ${reg}   ${bbb}`);
    console.log(`      ${b.cases.join(", ")}`);
  }

  console.log(`\n── THE QUERIES THE ENGINE ACTUALLY SENDS (lib/research/tracks/track1.queries.ts) ──`);
  console.log(`  business_registry : "<vendor> business registration secretary of state"   ← US-ONLY`);
  console.log(`  bbb_listing       : "<vendor> BBB better business bureau"                 ← US/CANADA ONLY`);
  console.log(`\nNothing in lib/research reads a country, a jurisdiction or the case's marketplace when`);
  console.log(`building these. A non-US supplier is asked a question about the wrong registry, and the`);
  console.log(`absence of an answer then reads to the client as a finding about the supplier.`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
